'use strict';

/**
 * test/reconciliationJob.test.js
 *
 * Integration tests for the reconciliation job logic and real tank telemetry behavior.
 */

process.env.NODE_ENV = 'test';
process.env.RECONCILIATION_TOLERANCE_LITERS = '20';

process.env.ENABLE_DEMO_TOOLS = 'true';

const testPool = require('./helpers/testPool');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedStation(pool) {
  const sid = `SID-RECON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { rows } = await pool.query(
    `INSERT INTO stations (sid, name, location)
     VALUES ($1, 'Recon Station', 'Test City')
     RETURNING id`,
    [sid]
  );
  return rows[0].id;
}

async function seedTank(pool, stationId, capacity = 10000, productType = 'PETROL') {
  const { rows } = await pool.query(`
    INSERT INTO tanks (station_id, capacity_liters, product_type)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [stationId, capacity, productType]);
  return rows[0].id;
}

async function seedAtgReading(pool, tankId, volumeLiters, recordedAt, source = 'MANUAL') {
  await pool.query(`
    INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source, recorded_at)
    VALUES ($1, $2, 25.0, $4, $3)
  `, [tankId, volumeLiters, recordedAt, source]);
}

async function seedUser(pool) {
  const phone = `+1000${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role)
     VALUES ('Recon Test', $1, 'hash', 'ADMIN')
     RETURNING id`,
    [phone]
  );
  return rows[0].id;
}

async function seedVehicle(pool, ownerId, fuelType = 'PETROL') {
  const plate = `PLT-RECON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const vid = `VID-RECON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { rows } = await pool.query(`
    INSERT INTO vehicles (vid, plate_number, owner_id, vehicle_type, fuel_type)
    VALUES ($1, $2, $3, 'PRIVATE', $4)
    RETURNING id
  `, [vid, plate, ownerId, fuelType]);
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

describe('Reconciliation & Simulator Logic', () => {
  let adminId;

  beforeAll(async () => {
    adminId = await seedUser(testPool);
  });

  afterAll(async () => {
    await testPool.query("DELETE FROM users WHERE full_name = 'Recon Test'");
    await testPool.end();
  });

  // ── Test 1: Idle station over 2 windows -> status OK ────────────────────────
  test('Idle station over 2 windows -> status OK', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);

    const now = Date.now();
    const w1Start = new Date(now - 60 * 60000);
    const w1End = new Date(now - 30 * 60000);
    const w2Start = new Date(now - 30 * 60000);
    const w2End = new Date(now);

    // Window 1 readings: 6000L throughout (idle)
    await seedAtgReading(testPool, tankId, 6000, new Date(w1Start.getTime() + 1000));
    await seedAtgReading(testPool, tankId, 6000, new Date(w1End.getTime() - 1000));

    const tolerance = parseFloat(process.env.RECONCILIATION_TOLERANCE_LITERS || '20');
    const rec1 = await runForStation(stationId, w1Start, w1End);
    expect(rec1.status).toBe('OK');
    expect(parseFloat(rec1.variance_liters)).toBeLessThan(tolerance);

    // Window 2 readings: small sensor fluctuation (still idle, well within tolerance)
    await seedAtgReading(testPool, tankId, 6000, new Date(w2Start.getTime() + 1000));
    await seedAtgReading(testPool, tankId, 5998, new Date(w2End.getTime() - 1000)); // 2L sensor drift

    const rec2 = await runForStation(stationId, w2Start, w2End);
    expect(rec2.status).toBe('OK');
    expect(parseFloat(rec2.variance_liters)).toBeLessThan(tolerance);

    await cleanupData(testPool, stationId, null);
  }, 15000);

  // ── Test 2: Verified 12L dispense -> tank drops 12L -> status OK ────────────
  test('Verified 12 L dispense -> tank drops 12 L -> status OK', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);
    const vehicleId = await seedVehicle(testPool, adminId);

    const periodStart = new Date(Date.now() - 30 * 60000);
    const periodEnd = new Date();

    // Early reading: 6000L
    await seedAtgReading(testPool, tankId, 6000, new Date(periodStart.getTime() + 1000));
    // Late reading: 5988L (drop of 12L)
    await seedAtgReading(testPool, tankId, 5988, new Date(periodEnd.getTime() - 1000));

    // Verified dispense of 12L
    await seedDispense(testPool, vehicleId, stationId, adminId, 12, new Date(periodStart.getTime() + 5000));

    const row = await runForStation(stationId, periodStart, periodEnd);

    expect(row.status).toBe('OK');
    expect(parseFloat(row.tank_volume_delta)).toBe(-12);
    expect(parseFloat(row.verified_dispense_volume)).toBe(12);
    expect(parseFloat(row.variance_liters)).toBe(0);

    await cleanupData(testPool, stationId, vehicleId);
  }, 15000);

  // ── Test 3: Refill (tank goes up) -> status OK, never flagged ───────────────
  test('Refill (tank goes up) -> status OK, never flagged', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);

    const periodStart = new Date(Date.now() - 30 * 60000);
    const periodEnd = new Date();

    // Tank was low (1200L), tanker refilled to 9000L
    await seedAtgReading(testPool, tankId, 1200, new Date(periodStart.getTime() + 1000));
    await seedAtgReading(testPool, tankId, 9000, new Date(periodEnd.getTime() - 1000));

    const row = await runForStation(stationId, periodStart, periodEnd);

    expect(row.status).toBe('OK');
    expect(parseFloat(row.tank_volume_delta)).toBe(7800); // signed delta is +7800
    expect(parseFloat(row.variance_liters)).toBe(0);      // increase is NOT treated as loss

    await cleanupData(testPool, stationId, null);
  }, 15000);

  // ── Test 4: inject-loss of 200L with no sale -> FLAGGED, variance ~200L ───────
  test('inject-loss of 200 L with no sale -> FLAGGED, variance about 200 L', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);

    const periodStart = new Date(Date.now() - 30 * 60000);
    const periodEnd = new Date();

    // Baseline reading: 5000L
    await seedAtgReading(testPool, tankId, 5000, new Date(periodStart.getTime() + 1000));
    // Injected loss reading: 4800L (-200L without dispense)
    await seedAtgReading(testPool, tankId, 4800, new Date(periodEnd.getTime() - 1000), 'SIMULATED');

    const row = await runForStation(stationId, periodStart, periodEnd);

    expect(row.status).toBe('FLAGGED');
    expect(parseFloat(row.tank_volume_delta)).toBe(-200);
    expect(parseFloat(row.verified_dispense_volume)).toBe(0);
    expect(parseFloat(row.variance_liters)).toBe(200);

    await cleanupData(testPool, stationId, null);
  }, 15000);

  // ── Test 5: Fewer than 2 readings in the window -> INCOMPLETE ──────────────
  test('Fewer than 2 readings in the window -> INCOMPLETE', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);

    const periodStart = new Date(Date.now() - 30 * 60000);
    const periodEnd = new Date();

    // Case A: 0 readings in the window
    const row0 = await runForStation(stationId, periodStart, periodEnd);
    expect(row0.status).toBe('INCOMPLETE');
    expect(row0.tank_volume_delta).toBeNull();
    expect(row0.variance_liters).toBeNull();

    // Case B: Only 1 reading in the window
    await seedAtgReading(testPool, tankId, 5000, new Date(periodStart.getTime() + 5000));
    const row1 = await runForStation(stationId, periodStart, periodEnd);
    expect(row1.status).toBe('INCOMPLETE');
    expect(row1.tank_volume_delta).toBeNull();
    expect(row1.variance_liters).toBeNull();

    await cleanupData(testPool, stationId, null);
  }, 15000);

  // ── Test 6: Running the same window twice -> still one row ──────────────────
  test('Running the same window twice -> still one row (unique index / UPSERT)', async () => {
    const stationId = await seedStation(testPool);
    const tankId = await seedTank(testPool, stationId);

    const periodStart = new Date(Date.now() - 30 * 60000);
    const periodEnd = new Date();

    await seedAtgReading(testPool, tankId, 7000, new Date(periodStart.getTime() + 1000));
    await seedAtgReading(testPool, tankId, 7000, new Date(periodEnd.getTime() - 1000));

    // Run first time
    const rowA = await runForStation(stationId, periodStart, periodEnd);
    expect(rowA.id).toBeDefined();

    // Run second time with identical window
    const rowB = await runForStation(stationId, periodStart, periodEnd);
    expect(rowB.id).toBe(rowA.id);

    // Verify exactly one row in the table for this station
    const { rows: countRows } = await testPool.query(
      'SELECT COUNT(*) FROM reconciliations WHERE station_id = $1',
      [stationId]
    );
    expect(parseInt(countRows[0].count, 10)).toBe(1);

    await cleanupData(testPool, stationId, null);
  }, 15000);
});
