'use strict';

const pool = require('../../db/pool');

async function findTankById(tankId) {
  const { rows } = await pool.query(
    `SELECT id, station_id, capacity_liters, product_type
     FROM tanks
     WHERE id = $1`,
    [tankId]
  );
  return rows[0] || null;
}

async function findReadingsByTankId(tankId, from, to) {
  let query = `
    SELECT id, tank_id, volume_liters, temperature_c, recorded_at, source
    FROM atg_readings
    WHERE tank_id = $1
  `;
  const params = [tankId];
  let paramIndex = 2;

  if (from) {
    query += ` AND recorded_at >= $${paramIndex}`;
    params.push(from);
    paramIndex++;
  }
  if (to) {
    query += ` AND recorded_at <= $${paramIndex}`;
    params.push(to);
    paramIndex++;
  }

  query += ` ORDER BY recorded_at DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

async function findLatestReadingByTankId(tankId) {
  const { rows } = await pool.query(
    `SELECT id, tank_id, volume_liters, temperature_c, recorded_at, source
     FROM atg_readings
     WHERE tank_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [tankId]
  );
  return rows[0] || null;
}

module.exports = {
  findTankById,
  findReadingsByTankId,
  findLatestReadingByTankId,
};
