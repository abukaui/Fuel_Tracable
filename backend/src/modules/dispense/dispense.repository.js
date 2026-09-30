'use strict';

const pool = require('../../db/pool');

/**
 * Finds a PENDING fuel_request whose otp_code_hash we can bcrypt-compare
 * against. We need to fetch ALL pending requests for the vehicle/station so
 * the caller can iterate and bcrypt.compare each — we cannot do a hash lookup
 * in SQL. To limit the scan we fetch only requests that are still within their
 * expiry window OR recently expired (so we can return EXPIRED vs WRONG_CODE).
 *
 * Returns all PENDING fuel_requests (not yet used/rejected) with their
 * linked vehicle so the service can compare plate + hash.
 */
async function findPendingRequests() {
  const query = `
    SELECT
      fr.id,
      fr.vehicle_id,
      fr.station_id,
      fr.requested_liters,
      fr.otp_code_hash,
      fr.status,
      fr.expires_at,
      fr.created_at,
      v.plate_number,
      v.owner_id
    FROM fuel_requests fr
    JOIN vehicles v ON v.id = fr.vehicle_id
    WHERE fr.status = 'PENDING'
    ORDER BY fr.created_at DESC
    LIMIT 500;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Also fetch recently expired PENDING requests so we can distinguish
 * EXPIRED vs WRONG_CODE vs ALREADY_USED.
 */
async function findRecentExpiredRequest(fuelRequestId) {
  const query = `
    SELECT id, status, expires_at
    FROM fuel_requests
    WHERE id = $1;
  `;
  const result = await pool.query(query, [fuelRequestId]);
  return result.rows[0] || null;
}

async function findDispenseById(id) {
  const query = `
    SELECT dt.*, fr.vehicle_id, fr.requested_liters
    FROM dispense_transactions dt
    JOIN fuel_requests fr ON fr.id = dt.fuel_request_id
    WHERE dt.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Executes the three-table write atomically:
 *  1. Insert dispense_transactions row
 *  2. Update fuel_requests.status → 'USED'
 *  3. Insert audit_logs row
 *
 * Uses a single client in a BEGIN/COMMIT transaction.
 */
async function recordDispenseTransaction({ fuelRequestId, verifiedBy, litersDispensed, auditMeta }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert dispense record
    const dispenseResult = await client.query(`
      INSERT INTO dispense_transactions
        (fuel_request_id, verified_by, liters_dispensed, plate_verified)
      VALUES ($1, $2, $3, true)
      RETURNING *;
    `, [fuelRequestId, verifiedBy, litersDispensed]);
    const dispense = dispenseResult.rows[0];

    // 2. Mark fuel_request as USED
    await client.query(`
      UPDATE fuel_requests SET status = 'USED' WHERE id = $1;
    `, [fuelRequestId]);

    // 3. Audit log
    await client.query(`
      INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, metadata)
      VALUES ($1, 'DISPENSE_VERIFIED', 'dispense_transactions', $2, $3);
    `, [
      verifiedBy,
      dispense.id,
      JSON.stringify({
        otpValid: true,
        plateVerified: true,
        litersDispensed,
        ...auditMeta,
      }),
    ]);

    await client.query('COMMIT');
    return dispense;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findPendingRequests,
  findRecentExpiredRequest,
  findDispenseById,
  recordDispenseTransaction,
};
