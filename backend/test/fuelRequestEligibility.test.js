'use strict';

/**
 * test/fuelRequestEligibility.test.js
 *
 * Integration tests for the fuel-request eligibility logic (Day 9).
 *
 * ⚠️ KNOWN APPROXIMATION (to be fixed in Week 3):
 * The 24-hour quota check reads fuel_requests WHERE status='USED'.
 * Once dispense_transactions exists, fuel-requests.repository.getUsedLitersToday()
 * must be updated to join dispense_transactions instead of reading from
 * fuel_requests. The tests below remain valid — only the underlying
 * query in the repository changes.
 */

process.env.NODE_ENV = 'test';
process.env.STOCK_OUT_MIN_THRESHOLD_LITERS = '200';

// Inject test pool before any module loads
jest.mock('../src/db/pool', () => require('./helpers/testPool'));

const testPool = require('./helpers/testPool');
const { requestFuel } = require('../src/modules/fuel-requests/fuel-requests.service');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedUser(suffix = '') {
  const phone = `+2000${suffix}${Date.now()}`;
  const { rows } = await testPool.query(
    `INSERT INTO users (full_name, phone, password_hash, role)
     VALUES ('FR Test Driver', $1, 'hash', 'DRIVER')
     RETURNING id`,
    [phone]
  );
  return rows[0].id;
}

async function seedStation(managedBy, status = 'OPEN') {
  const sid = `SID-FR-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { rows } = await testPool.query(
    `INSERT INTO stations (sid, name, location, current_status)
     VALUES ($1, 'FR Test Station', 'Test City', $2)
     RETURNING id`,
    [sid, status]
  );
  return rows[0].id;
}

async function seedVehicle(ownerId, vehicleType = 'PRIVATE') {
  const plate = `PLT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const vid   = `VID-TEST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { rows } = await testPool.query(`
    INSERT INTO vehicles (vid, plate_number, owner_id, vehicle_type)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [vid, plate, ownerId, vehicleType]);
  return rows[0].id;
}

async function seedQuotaPolicy(vehicleType, dailyLimitLiters, setBy) {
  await testPool.query(`
    INSERT INTO quota_policies (vehicle_type, daily_limit_liters, set_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (vehicle_type) DO UPDATE
      SET daily_limit_liters = EXCLUDED.daily_limit_liters,
          set_by             = EXCLUDED.set_by,
          updated_at         = now()
  `, [vehicleType, dailyLimitLiters, setBy]);
}

// Simulate already-dispensed liters to exhaust part of the quota.
// Day 11 fix: now inserts a real dispense_transactions row (joined through
// a USED fuel_request) so the quota check exercises the correct code path.
async function seedDispensedLiters(vehicleId, stationId, operatorId, liters) {
  const { rows: frRows } = await testPool.query(`
    INSERT INTO fuel_requests
      (vehicle_id, station_id, requested_liters, otp_code_hash, status, expires_at)
    VALUES ($1, $2, $3, 'test-hash', 'USED', now() + interval '30 minutes')
    RETURNING id
  `, [vehicleId, stationId, liters]);
  const fuelRequestId = frRows[0].id;

  await testPool.query(`
    INSERT INTO dispense_transactions
      (fuel_request_id, verified_by, liters_dispensed, plate_verified)
    VALUES ($1, $2, $3, true)
  `, [fuelRequestId, operatorId, liters]);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup(vehicleId, stationId, userId) {
  if (vehicleId) {
    // dispense_transactions → fuel_requests → vehicles (must delete in order)
    await testPool.query(`
      DELETE FROM dispense_transactions
      WHERE fuel_request_id IN (
        SELECT id FROM fuel_requests WHERE vehicle_id = $1
      )`, [vehicleId]);
    await testPool.query('DELETE FROM fuel_requests WHERE vehicle_id = $1', [vehicleId]);
    await testPool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
  }
  if (stationId) await testPool.query('DELETE FROM stations WHERE id = $1', [stationId]);
  if (userId)    await testPool.query('DELETE FROM users WHERE id = $1', [userId]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Fuel Request Eligibility Logic', () => {
  let adminId;

  beforeAll(async () => {
    // We need an admin user to set policies and manage stations
    const { rows } = await testPool.query(
      `INSERT INTO users (full_name, phone, password_hash, role)
       VALUES ('FR Test Admin', $1, 'hash', 'ADMIN')
       RETURNING id`,
      [`+9999${Date.now()}`]
    );
    adminId = rows[0].id;
  });

  afterAll(async () => {
    // Must delete quota_policies first — set_by FK references users
    await testPool.query("DELETE FROM quota_policies WHERE vehicle_type IN ('PRIVATE', 'COMMERCIAL')");
    await testPool.query("DELETE FROM users WHERE full_name IN ('FR Test Driver', 'FR Test Admin')");
    // Don't end testPool here — stockOutDetection.test.js may still be running
    // testPool.end() is called by the last suite via jest global teardown.
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test(
    'Request within quota at an OPEN station → succeeds, returns requestId + otpCode',
    async () => {
      const userId    = await seedUser('ok');
      const stationId = await seedStation(adminId, 'OPEN');
      const vehicleId = await seedVehicle(userId, 'PRIVATE');
      await seedQuotaPolicy('PRIVATE', 50, adminId);

      const result = await requestFuel(userId, {
        vehicleId,
        stationId,
        requestedLiters: 30,
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('otpCode');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.otpCode).toBe('string');
      expect(result.otpCode).toMatch(/^\d{6}$/);

      await cleanup(vehicleId, stationId, userId);
    },
    20000
  );

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test(
    'Request exceeding daily limit → 400 error with remaining allowance in message',
    async () => {
      const userId    = await seedUser('overlimit');
      const stationId = await seedStation(adminId, 'OPEN');
      const vehicleId = await seedVehicle(userId, 'PRIVATE');
      await seedQuotaPolicy('PRIVATE', 50, adminId);

      // Simulate 30L already dispensed today (real dispense_transactions row)
      await seedDispensedLiters(vehicleId, stationId, adminId, 30);

      // Try to request 30L more (30 + 30 = 60 > 50 limit)
      let caught;
      try {
        await requestFuel(userId, { vehicleId, stationId, requestedLiters: 30 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(400);
      // Remaining should be 50 - 30 = 20
      expect(caught.message).toContain('20');
      expect(caught.message).toContain('Remaining allowance');

      await cleanup(vehicleId, stationId, userId);
    },
    20000
  );

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test(
    'Request at a CLOSED station → 400 error naming the current status',
    async () => {
      const userId    = await seedUser('closed');
      const stationId = await seedStation(adminId, 'CLOSED');
      const vehicleId = await seedVehicle(userId, 'PRIVATE');
      await seedQuotaPolicy('PRIVATE', 50, adminId);

      let caught;
      try {
        await requestFuel(userId, { vehicleId, stationId, requestedLiters: 10 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(400);
      expect(caught.message).toContain('CLOSED');

      await cleanup(vehicleId, stationId, userId);
    },
    20000
  );

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  test(
    'Request at an OUT_OF_STOCK station → 400 error naming the current status',
    async () => {
      const userId    = await seedUser('outofstock');
      const stationId = await seedStation(adminId, 'OUT_OF_STOCK');
      const vehicleId = await seedVehicle(userId, 'PRIVATE');
      await seedQuotaPolicy('PRIVATE', 50, adminId);

      let caught;
      try {
        await requestFuel(userId, { vehicleId, stationId, requestedLiters: 10 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(400);
      expect(caught.message).toContain('OUT_OF_STOCK');

      await cleanup(vehicleId, stationId, userId);
    },
    20000
  );

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  test(
    'Request for a vehicle type with no quota policy → 400 error',
    async () => {
      const userId    = await seedUser('nopolicy');
      const stationId = await seedStation(adminId, 'OPEN');
      // COMMERCIAL vehicle — no policy seeded for COMMERCIAL in this test
      const vehicleId = await seedVehicle(userId, 'COMMERCIAL');
      // Ensure no stale COMMERCIAL policy exists
      await testPool.query("DELETE FROM quota_policies WHERE vehicle_type = 'COMMERCIAL'");

      let caught;
      try {
        await requestFuel(userId, { vehicleId, stationId, requestedLiters: 10 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(400);
      expect(caught.message).toMatch(/no quota policy/i);

      await cleanup(vehicleId, stationId, userId);
    },
    20000
  );

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  test(
    "Request using another user's vehicleId → 403 error",
    async () => {
      const ownerId   = await seedUser('owner');
      const attackerId = await seedUser('attacker');
      const stationId = await seedStation(adminId, 'OPEN');
      const vehicleId = await seedVehicle(ownerId, 'PRIVATE');
      await seedQuotaPolicy('PRIVATE', 50, adminId);

      let caught;
      try {
        // attacker uses ownerId's vehicleId
        await requestFuel(attackerId, { vehicleId, stationId, requestedLiters: 10 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(403);

      await cleanup(vehicleId, stationId, ownerId);
      await testPool.query('DELETE FROM users WHERE id = $1', [attackerId]);
    },
    20000
  );
});
