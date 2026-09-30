'use strict';

/**
 * test/stockOutDetection.test.js
 *
 * Integration tests for the false stock-out detection logic (Day 7).
 *
 * Strategy: seed real rows into the `test` schema, call the extracted
 * `evaluateStockOutFlag` service function, assert the result, then clean up.
 *
 * We monkey-patch the DB pool used by all repository modules to the test pool
 * before any module is imported. Jest module isolation resets this per test
 * file thanks to `jest.resetModules()` / `jest.isolateModules()`.
 */

process.env.NODE_ENV = 'test';
process.env.STOCK_OUT_MIN_THRESHOLD_LITERS = '200';

const testPool = require('./helpers/testPool');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedUser(pool) {
  const phone = `+1000${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role)
     VALUES ('Stockout Test', $1, 'hash', 'ADMIN')
     RETURNING id`,
    [phone]
  );
  return rows[0].id;
}

async function seedStation(pool, userId) {
  const sid = `SID-TEST-${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO stations (sid, name, location)
     VALUES ($1, 'Test Station', 'Test City')
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

async function seedAtgReading(pool, tankId, volumeLiters) {
  await pool.query(`
    INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source)
    VALUES ($1, $2, 25.0, 'MANUAL')
  `, [tankId, volumeLiters]);
}

async function getReconciliationCount(pool, stationId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM reconciliations WHERE station_id = $1 AND stock_out_flag = true AND status = $2',
    [stationId, 'FLAGGED']
  );
  return parseInt(rows[0].count, 10);
}

// ── Cleanup helper ────────────────────────────────────────────────────────────

async function cleanupStation(pool, stationId) {
  await pool.query('DELETE FROM reconciliations WHERE station_id = $1', [stationId]);
  await pool.query('DELETE FROM atg_readings WHERE tank_id IN (SELECT id FROM tanks WHERE station_id = $1)', [stationId]);
  await pool.query('DELETE FROM tanks WHERE station_id = $1', [stationId]);
  await pool.query('DELETE FROM stations WHERE id = $1', [stationId]);
}

// ── Module setup ──────────────────────────────────────────────────────────────
// We need to inject the testPool into the service's transitive dependency chain.
// The service → atg.repository → pool.js  and  service → reconciliation.repository → pool.js
// We override pool.js in the module registry before importing anything else.

jest.mock('../src/db/pool', () => require('./helpers/testPool'));

const { evaluateStockOutFlag, updateStatus } = require('../src/modules/stations/stations.service');
const reconRepo = require('../src/modules/reconciliation/reconciliation.repository');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Stock-Out Detection Logic', () => {
  let userId;

  beforeAll(async () => {
    userId = await seedUser(testPool);
  });

  afterAll(async () => {
    await testPool.query("DELETE FROM users WHERE full_name = 'Stockout Test'");
    await testPool.end();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test(
    'Tank above threshold → evaluateStockOutFlag returns shouldFlag=true AND updateStatus creates a FLAGGED reconciliation',
    async () => {
      const stationId = await seedStation(testPool, userId);
      const tankId    = await seedTank(testPool, stationId);

      // Volume of 500L is well above the 200L threshold
      await seedAtgReading(testPool, tankId, 500);

      // Test the pure helper directly
      const tanks = [{ id: tankId }];
      const { shouldFlag } = await evaluateStockOutFlag(stationId, tanks);
      expect(shouldFlag).toBe(true);

      // Test the full updateStatus path creates a reconciliation row
      await updateStatus(stationId, { status: 'OUT_OF_STOCK' });
      const count = await getReconciliationCount(testPool, stationId);
      expect(count).toBe(1);

      await cleanupStation(testPool, stationId);
    },
    15000
  );

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test(
    'Tank below threshold → evaluateStockOutFlag returns shouldFlag=false AND NO reconciliation row is created',
    async () => {
      const stationId = await seedStation(testPool, userId);
      const tankId    = await seedTank(testPool, stationId);

      // Volume of 50L is below the 200L threshold — genuine stock-out
      await seedAtgReading(testPool, tankId, 50);

      const tanks = [{ id: tankId }];
      const { shouldFlag } = await evaluateStockOutFlag(stationId, tanks);
      expect(shouldFlag).toBe(false);

      await updateStatus(stationId, { status: 'OUT_OF_STOCK' });
      const count = await getReconciliationCount(testPool, stationId);
      expect(count).toBe(0);

      await cleanupStation(testPool, stationId);
    },
    15000
  );

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test(
    'Tank with NO ATG readings at all → does not crash and does NOT falsely flag',
    async () => {
      const stationId = await seedStation(testPool, userId);
      await seedTank(testPool, stationId); // no reading seeded

      // Re-fetch tanks list as the service would
      const { rows: tanks } = await testPool.query(
        'SELECT id FROM tanks WHERE station_id = $1',
        [stationId]
      );

      await expect(evaluateStockOutFlag(stationId, tanks)).resolves.toEqual({ shouldFlag: false });

      // updateStatus must not throw either
      await expect(updateStatus(stationId, { status: 'OUT_OF_STOCK' })).resolves.toBeDefined();
      const count = await getReconciliationCount(testPool, stationId);
      expect(count).toBe(0);

      await cleanupStation(testPool, stationId);
    },
    15000
  );

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  test(
    'Station with NO tanks at all → does not crash and does NOT flag',
    async () => {
      const stationId = await seedStation(testPool, userId);
      // no tanks seeded

      const { shouldFlag } = await evaluateStockOutFlag(stationId, []);
      expect(shouldFlag).toBe(false);

      await updateStatus(stationId, { status: 'OUT_OF_STOCK' });
      const count = await getReconciliationCount(testPool, stationId);
      expect(count).toBe(0);

      await cleanupStation(testPool, stationId);
    },
    15000
  );
});
