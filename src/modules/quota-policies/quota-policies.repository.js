'use strict';

const pool = require('../../db/pool');

async function upsertQuotaPolicy({ vehicleType, dailyLimitLiters, setBy }) {
  const query = `
    INSERT INTO quota_policies (vehicle_type, daily_limit_liters, set_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (vehicle_type) 
    DO UPDATE SET 
      daily_limit_liters = EXCLUDED.daily_limit_liters,
      set_by = EXCLUDED.set_by,
      updated_at = now()
    RETURNING *;
  `;
  const result = await pool.query(query, [vehicleType, dailyLimitLiters, setBy]);
  return result.rows[0];
}

async function getAllQuotaPolicies() {
  const query = `SELECT * FROM quota_policies ORDER BY updated_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = {
  upsertQuotaPolicy,
  getAllQuotaPolicies,
};
