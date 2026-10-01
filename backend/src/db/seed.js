'use strict';

const bcrypt = require('bcryptjs');

/**
 * npm run seed
 *
 * Inserts baseline data needed for development & testing:
 *   - 1 ADMIN user
 *   - 2 stations
 *   - 1 tank per station
 *
 * Safe to re-run: ON CONFLICT DO NOTHING for stations/tanks;
 * ON CONFLICT DO UPDATE for the admin user so the Day-2 placeholder hash is overwritten.
 */

const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Admin user ────────────────────────────────────────────────────────
    // Test password: Admin@1234  — change in production.
    // ON CONFLICT DO UPDATE ensures the Day-2 placeholder hash is overwritten.
    const adminHash = await bcrypt.hash('Admin@1234', 12);

    const { rows: userRows } = await client.query(`
      INSERT INTO users (full_name, phone, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO UPDATE
        SET password_hash = EXCLUDED.password_hash
      RETURNING id, full_name, phone, role, created_at
    `, [
      'System Administrator',
      '+251900000000',
      adminHash,
      'ADMIN',
    ]);

    console.log('[seed] ✓ Admin user upserted:', userRows[0].phone);

    // ── 1.5. Gov Regulator user ──────────────────────────────────────────────
    const govHash = await bcrypt.hash('Gov@1234', 12);

    const { rows: govRows } = await client.query(`
      INSERT INTO users (full_name, phone, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO UPDATE
        SET password_hash = EXCLUDED.password_hash
      RETURNING id, full_name, phone, role, created_at
    `, [
      'Ministry of Trade Regulator',
      '+251911222333',
      govHash,
      'GOV_REGULATOR',
    ]);

    console.log('[seed] ✓ Gov Regulator user upserted:', govRows[0].phone);

    // ── 2. Stations ──────────────────────────────────────────────────────────
    const stations = [
      { sid: 'STA-001', name: 'Central Depot Station', location: 'Addis Ababa, Bole' },
      { sid: 'STA-002', name: 'Northern Gate Station', location: 'Addis Ababa, Piazza' },
    ];

    const stationIds = [];
    for (const s of stations) {
      const { rows } = await client.query(`
        INSERT INTO stations (sid, name, location, current_status)
        VALUES ($1, $2, $3, 'OPEN')
        ON CONFLICT (sid) DO NOTHING
        RETURNING id, sid, name
      `, [s.sid, s.name, s.location]);

      if (rows.length > 0) {
        console.log(`[seed] ✓ Station created: ${rows[0].sid} — ${rows[0].name}`);
        stationIds.push({ id: rows[0].id, sid: rows[0].sid });
      } else {
        // Already exists — fetch its id so we can still seed its tank.
        const { rows: existing } = await client.query(
          'SELECT id, sid FROM stations WHERE sid = $1',
          [s.sid],
        );
        console.log(`[seed]   Station ${s.sid} already exists — skipped.`);
        stationIds.push({ id: existing[0].id, sid: existing[0].sid });
      }
    }

    // ── 3. Tanks (1 per station) ─────────────────────────────────────────────
    for (const station of stationIds) {
      // We detect duplicates by checking station_id + product_type.
      const { rows: existing } = await client.query(
        `SELECT id FROM tanks WHERE station_id = $1 AND product_type = 'PETROL' LIMIT 1`,
        [station.id],
      );

      if (existing.length > 0) {
        console.log(`[seed]   Tank for ${station.sid} already exists — skipped.`);
        continue;
      }

      const { rows } = await client.query(`
        INSERT INTO tanks (station_id, capacity_liters, product_type)
        VALUES ($1, $2, 'PETROL')
        RETURNING id
      `, [station.id, 30000]);

      console.log(
        `[seed] ✓ Tank created for ${station.sid}: 30,000 L PETROL (id=${rows[0].id})`,
      );
    }

    await client.query('COMMIT');
    console.log('[seed] ✓ Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] ✗ Seed failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
