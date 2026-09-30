'use strict';

const pool = require('../../db/pool');

async function createReconciliation(data) {
  const { rows } = await pool.query(
    `INSERT INTO reconciliations (station_id, period_start, period_end, stock_out_flag, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.stationId, data.periodStart, data.periodEnd, data.stockOutFlag, data.status]
  );
  return rows[0];
}

async function findReconciliationsByStationId(stationId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM reconciliations
     WHERE station_id = $1
     ORDER BY created_at DESC`,
    [stationId]
  );
  return rows;
}

async function findReconciliationById(id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM reconciliations
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  createReconciliation,
  findReconciliationsByStationId,
  findReconciliationById,
};
