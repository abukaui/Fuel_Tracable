'use strict';

const pool = require('../../db/pool');

async function createFuelRequest({ vehicleId, stationId, requestedLiters, otpCodeHash, expiresAt }) {
  const query = `
    INSERT INTO fuel_requests (vehicle_id, station_id, requested_liters, otp_code_hash, status, expires_at)
    VALUES ($1, $2, $3, $4, 'PENDING', $5)
    RETURNING id, vehicle_id, station_id, requested_liters, status, expires_at, created_at;
  `;
  const result = await pool.query(query, [vehicleId, stationId, requestedLiters, otpCodeHash, expiresAt]);
  return result.rows[0];
}

async function findById(id) {
  const query = `SELECT * FROM fuel_requests WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function getUsedLitersToday(vehicleId) {
  const query = `
    SELECT COALESCE(SUM(requested_liters), 0) AS total
    FROM fuel_requests
    WHERE vehicle_id = $1
      AND status = 'USED'
      AND created_at >= NOW() - INTERVAL '24 hours';
  `;
  const result = await pool.query(query, [vehicleId]);
  return parseFloat(result.rows[0].total) || 0;
}

// Helper to fetch vehicle and policy
async function getVehicleWithPolicy(vehicleId) {
  const query = `
    SELECT v.*, q.daily_limit_liters
    FROM vehicles v
    LEFT JOIN quota_policies q ON v.vehicle_type = q.vehicle_type
    WHERE v.id = $1;
  `;
  const result = await pool.query(query, [vehicleId]);
  return result.rows[0];
}

// Helper to fetch station status
async function getStationStatus(stationId) {
  const query = `SELECT current_status FROM stations WHERE id = $1;`;
  const result = await pool.query(query, [stationId]);
  return result.rows[0];
}

module.exports = {
  createFuelRequest,
  findById,
  getUsedLitersToday,
  getVehicleWithPolicy,
  getStationStatus
};
