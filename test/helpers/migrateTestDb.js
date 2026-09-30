'use strict';

/**
 * test/helpers/migrateTestDb.js
 *
 * Runs all SQL migrations inside the `test` schema.
 * Called once before the test suite starts (via jest globalSetup or
 * the test:db:setup npm script).
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../../src/db/migrations');

async function migrateTestDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // Ensure schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS test');
    await client.query('SET search_path = test, public');

    // Ensure tracking table exists inside test schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS test.schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM test.schema_migrations');
    const applied = new Set(rows.map(r => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[test-migrate] skip  ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[test-migrate] apply ${file} …`);
      await client.query(sql);
      await client.query(
        'INSERT INTO test.schema_migrations (filename) VALUES ($1)',
        [file],
      );
    }

    console.log('[test-migrate] ✓ Test schema is up to date.');

    // ── Post-migration FK repair ───────────────────────────────────────────────
    // 002_create_reconciliations.sql sorts before 003_create_stations.sql, so
    // its REFERENCES stations(id) resolves to public.stations at CREATE TABLE
    // time. Drop and re-add so it points to test.stations instead.
    console.log('[test-migrate] Repairing cross-schema FK: reconciliations.station_id → test.stations …');
    await client.query(`ALTER TABLE reconciliations DROP CONSTRAINT IF EXISTS reconciliations_station_id_fkey`);
    await client.query(`ALTER TABLE reconciliations ADD CONSTRAINT reconciliations_station_id_fkey FOREIGN KEY (station_id) REFERENCES stations(id)`);
    console.log('[test-migrate] ✓ FK repair done.');
  } finally {
    await client.end();
  }
}


// Allow running directly: node test/helpers/migrateTestDb.js
if (require.main === module) {
  migrateTestDb().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = migrateTestDb;
