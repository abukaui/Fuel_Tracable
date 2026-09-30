'use strict';

const pool = require('../../db/pool');

async function createReconciliation(data) {
  const { rows } = await pool.query(
    `INSERT INTO reconciliations
       (station_id, period_start, period_end,
        tank_volume_delta, verified_dispense_volume, variance_liters,
        stock_out_flag, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.stationId,
      data.periodStart,
      data.periodEnd,
      data.tankVolumeDelta   ?? null,
      data.verifiedDispenseVolume ?? null,
      data.varianceLiters    ?? null,
      data.stockOutFlag      ?? false,
      data.status,
    ]
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

/** Returns all station IDs (for the scheduled job to iterate). */
async function getAllStationIds() {
  const { rows } = await pool.query(`SELECT id FROM stations ORDER BY id`);
  return rows.map(r => r.id);
}

/**
 * For each tank at a station, finds the earliest and latest ATG reading
 * within [periodStart, periodEnd] and returns the sum of
 * (latest - earliest) across all tanks.
 *
 * Returns { delta: number | null, hasData: boolean }
 *   delta    – net volume change (negative = fuel left the tanks)
 *   hasData  – false if no readings exist in the period for any tank
 */
async function getTankVolumeDelta(stationId, periodStart, periodEnd) {
  const { rows } = await pool.query(
    `SELECT
       t.id AS tank_id,
       MIN(a.volume_liters) FILTER (WHERE a.recorded_at = earliest.min_ts) AS earliest_vol,
       MAX(a.volume_liters) FILTER (WHERE a.recorded_at = latest.max_ts)   AS latest_vol
     FROM tanks t
     JOIN atg_readings a ON a.tank_id = t.id
     JOIN (
       SELECT tank_id, MIN(recorded_at) AS min_ts
       FROM atg_readings
       WHERE recorded_at BETWEEN $2 AND $3
       GROUP BY tank_id
     ) earliest ON earliest.tank_id = t.id
     JOIN (
       SELECT tank_id, MAX(recorded_at) AS max_ts
       FROM atg_readings
       WHERE recorded_at BETWEEN $2 AND $3
       GROUP BY tank_id
     ) latest ON latest.tank_id = t.id
     WHERE t.station_id = $1
       AND a.recorded_at BETWEEN $2 AND $3
     GROUP BY t.id, earliest.min_ts, latest.max_ts`,
    [stationId, periodStart, periodEnd]
  );

  if (rows.length === 0) return { delta: null, hasData: false };

  let totalDelta = 0;
  for (const row of rows) {
    const earliest = parseFloat(row.earliest_vol) || 0;
    const latest   = parseFloat(row.latest_vol)   || 0;
    totalDelta += (latest - earliest);
  }
  return { delta: totalDelta, hasData: true };
}

/**
 * Sums liters_dispensed for all dispense_transactions at a given station
 * within [periodStart, periodEnd].
 */
async function getVerifiedDispenseVolume(stationId, periodStart, periodEnd) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(dt.liters_dispensed), 0) AS total
     FROM dispense_transactions dt
     JOIN fuel_requests fr ON fr.id = dt.fuel_request_id
     WHERE fr.station_id = $1
       AND dt.occurred_at BETWEEN $2 AND $3`,
    [stationId, periodStart, periodEnd]
  );
  return parseFloat(rows[0].total) || 0;
}

module.exports = {
  createReconciliation,
  findReconciliationsByStationId,
  findReconciliationById,
  getAllStationIds,
  getTankVolumeDelta,
  getVerifiedDispenseVolume,
};

