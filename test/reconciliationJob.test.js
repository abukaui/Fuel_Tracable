'use strict';

/**
 * test/reconciliationJob.test.js
 *
 * Integration tests for the reconciliation job logic (Day 12).
 */

process.env.NODE_ENV = 'test';
process.env.RECONCILIATION_TOLERANCE_LITERS = '20';

const testPool = require('./helpers/testPool');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedStation(pool) {
  const sid = `SID-RECON-${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO stations (sid, name, location)
     VALUES ($1, 'Recon Station', 'Test City')
     RETURNING id`,
    [sid]
  );
  return rows[0].id;
}

async function seedTank(pool, stationId) {
  const { rows } = await pool.query(`
    INSERT INTO tanks (station_id, capacity_liters, product_type)
    VALUES ($1, 10000, 'PETROL')
    RETURNING id
  `, [stationId]);
  return rows[0].id;
}

async function seedAtgReading(pool, tankId, volumeLiters, recordedAt) {
  await pool.query(`
    INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source, recorded_at)
    VALUES ($1, $2, 25.0, 'MANUAL', $3)
  `, [tankId, volumeLiters, recordedAt]);
}

async function seedUser(pool) {
  const phone = `+1000${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role)
     VALUES ('Recon Test', $1, 'hash', 'ADMIN')
     RETURNING id`,
    [phone]
  );
  return rows[0].id;
}

async function seedVehicle(pool, ownerId) {
  const plate = `PLT-RECON-${Date.now()}`;
  const vid = `VID-RECON-${Date.now()}`;
  const { rows } = await pool.query(`
    INSERT INTO vehicles (vid, plate_number, owner_id, vehicle_type)
    VALUES ($1, $2, $3, 'PRIVATE')
    RETURNING id
  `, [vid, plate, ownerId]);
  return rows[0].id;
}

async function seedDispense(pool, vehicleId, stationId, operatorId, liters, occurredAt) {
  const { rows: frRows } = await pool.query(`
    INSERT INTO fuel_requests
      (vehicle_id, station_id, requested_liters, otp_code_hash, status, expires_at)
    VALUES ($1, $2, $3, 'hash', 'USED', now() + interval '30 minutes')
    RETURNING id
  `, [vehicleId, stationId, liters]);
  const fuelRequestId = frRows[0].id;

  await pool.query(`
    INSERT INTO dispense_transactions
      (fuel_request_id, verified_by, liters_dispensed, plate_verified, occurred_at)
    VALUES ($1, $2, $3, true, $4)
  `, [fuelRequestId, operatorId, liters, occurredAt]);
}

// ── Cleanup helper ────────────────────────────────────────────────────────────

async function cleanupData(pool, stationId, vehicleId) {
  if (vehicleId) {
    await pool.query(`
      DELETE FROM dispense_transactions
      WHERE fuel_request_id IN (
        SELECT id FROM fuel_requests WHERE vehicle_id = $1
      )`, [vehicleId]);
    await pool.query('DELETE FROM fuel_requests WHERE vehicle_id = $1', [vehicleId]);
    await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
  }
  if (stationId) {
    await pool.query('DELETE FROM reconciliations WHERE station_id = $1', [stationId]);
    await pool.query('DELETE FROM atg_readings WHERE tank_id IN (SELECT id FROM tanks WHERE station_id = $1)', [stationId]);
    await pool.query('DELETE FROM tanks WHERE station_id = $1', [stationId]);
    await pool.query('DELETE FROM stations WHERE id = $1', [stationId]);
  }
}

// ── Module setup ──────────────────────────────────────────────────────────────

jest.mock('../src/db/pool', () => require('./helpers/testPool'));

const { runForStation } = require('../src/modules/reconciliation/reconciliation.service');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Reconciliation Logic', () => {
  let adminId;

  beforeAll(async () => {
    adminId = await seedUser(testPool);
  });

  afterAll(async () => {
    await testPool.query("DELETE FROM users WHERE full_name = 'Recon Test'");
    await testPool.end();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test(
    'Matched sale: Tank drops by 500L, dispense is 500L → OK',
    async () => {
      const stationId = await seedStation(testPool);
      const tankId    = await seedTank(testPool, stationId);
      const vehicleId = await seedVehicle(testPool, adminId);

      const periodStart = new Date(Date.now() - 30 * 60000);
      const periodEnd = new Date();

      // Early reading: 10000L
      await seedAtgReading(testPool, tankId, 10000, new Date(periodStart.getTime() + 1000));
      // Late reading: 9500L
      await seedAtgReading(testPool, tankId, 9500, new Date(periodEnd.getTime() - 1000));

      // Dispense: 500L
      await seedDispense(testPool, vehicleId, stationId, adminId, 500, new Date(periodStart.getTime() + 5000));

      const row = await runForStation(stationId, periodStart, periodEnd);

      expect(row.status).toBe('OK');
      expect(parseFloat(row.tank_volume_delta)).toBe(-500);
      expect(parseFloat(row.verified_dispense_volume)).toBe(500);
      expect(parseFloat(row.variance_liters)).toBe(0);

      await cleanupData(testPool, stationId, vehicleId);
    },
    15000
  );

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test(
    'Fraud simulation: Tank drops by 500L, NO dispense → FLAGGED',
    async () => {
      const stationId = await seedStation(testPool);
      const tankId    = await seedTank(testPool, stationId);

      const periodStart = new Date(Date.now() - 30 * 60000);
      const periodEnd = new Date();

      // Early reading: 10000L
      await seedAtgReading(testPool, tankId, 10000, new Date(periodStart.getTime() + 1000));
      // Late reading: 9500L
      await seedAtgReading(testPool, tankId, 9500, new Date(periodEnd.getTime() - 1000));

      // No dispense

      const row = await runForStation(stationId, periodStart, periodEnd);

      expect(row.status).toBe('FLAGGED');
      expect(parseFloat(row.tank_volume_delta)).toBe(-500);
      expect(parseFloat(row.verified_dispense_volume)).toBe(0);
      expect(parseFloat(row.variance_liters)).toBe(500);

      await cleanupData(testPool, stationId, null);
    },
    15000
  );

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test(
    'New station: No ATG readings → INCOMPLETE',
    async () => {
      const stationId = await seedStation(testPool);
      const tankId    = await seedTank(testPool, stationId); // no reading seeded

      const periodStart = new Date(Date.now() - 30 * 60000);
      const periodEnd = new Date();

      const row = await runForStation(stationId, periodStart, periodEnd);

      expect(row.status).toBe('INCOMPLETE');
      expect(row.tank_volume_delta).toBeNull();
      expect(row.verified_dispense_volume).toBeNull();
      expect(row.variance_liters).toBeNull();

      await cleanupData(testPool, stationId, null);
    },
    15000
  );
});
