'use strict';

/**
 * npm run migrate
 *
 * Applies every *.sql file in /src/db/migrations that hasn't been applied yet,
 * tracking applied files in a `schema_migrations` table.
 * Safe to re-run — already-applied files are skipped silently.
 */

const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureMigrationsTable(client);

    const applied = await getApplied(client);

    // Read and sort migration files deterministically by filename.
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip  ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] apply ${file} …`);
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      count++;
    }

    await client.query('COMMIT');
    console.log(
      count > 0
        ? `[migrate] ✓ ${count} migration(s) applied.`
        : '[migrate] ✓ Nothing to apply — schema is up to date.',
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] ✗ Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
