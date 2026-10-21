'use strict';

const pool = require('../../db/pool');

async function createReconciliation(data) {
  const { rows } = await pool.query(
    `INSERT INTO reconciliations
       (station_id, period_start, period_end,
        tank_volume_delta, verified_dispense_volume, variance_liters,
        stock_out_flag, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (station_id, period_start, period_end)
     DO UPDATE SET
       tank_volume_delta = EXCLUDED.tank_volume_delta,
       verified_dispense_volume = EXCLUDED.verified_dispense_volume,
       variance_liters = EXCLUDED.variance_liters,
       stock_out_flag = EXCLUDED.stock_out_flag,
       status = CASE
         WHEN reconciliations.status = 'RESOLVED' THEN 'RESOLVED'
         ELSE EXCLUDED.status
       END
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
 * Calculates tank outflow and signed volume delta for a station across a window [periodStart, periodEnd].
 *
 * Rules:
 * - Only genuine volume DROPS between consecutive readings are summed into tank_outflow.
 * - Volume increases (refills) are ignored (not treated as theft).
 * - The latest reading just before periodStart is included as the first comparison baseline.
 * - Requires at least 2 readings in the window for a complete reconciliation.
 */
async function getTankReconciliationData(stationId, periodStart, periodEnd) {
  const { rows: tanks } = await pool.query(
    `SELECT id FROM tanks WHERE station_id = $1 ORDER BY id`,
    [stationId]
  );

  if (tanks.length === 0) {
    return {
      hasEnoughReadings: false,
      tankOutflow: 0,
      signedDelta: null,
      minReadingTime: null,
      maxReadingTime: null,
    };
  }

  let totalWindowReadings = 0;
  let totalOutflow = 0;
  let totalSignedDelta = 0;
  let overallMinTime = null;
  let overallMaxTime = null;

  for (const tank of tanks) {
    // 1. Fetch readings inside the window
    const { rows: windowReadings } = await pool.query(
      `SELECT volume_liters, recorded_at
       FROM atg_readings
       WHERE tank_id = $1
         AND recorded_at BETWEEN $2 AND $3
       ORDER BY recorded_at ASC`,
      [tank.id, periodStart, periodEnd]
    );

    totalWindowReadings += windowReadings.length;

    // 2. Fetch last reading just BEFORE window start to use as baseline
    const { rows: preReadings } = await pool.query(
      `SELECT volume_liters, recorded_at
       FROM atg_readings
       WHERE tank_id = $1
         AND recorded_at < $2
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [tank.id, periodStart]
    );

    const sequence = preReadings.length > 0
      ? [preReadings[0], ...windowReadings]
      : windowReadings;

    if (sequence.length >= 2) {
      // Calculate drops between consecutive readings
      for (let i = 0; i < sequence.length - 1; i++) {
        const vBefore = parseFloat(sequence[i].volume_liters);
        const vAfter  = parseFloat(sequence[i + 1].volume_liters);
        const drop = vBefore - vAfter;
        if (drop > 0) {
          totalOutflow += drop;
        }
      }

      // Signed delta = last reading - first reading used
      const firstVol = parseFloat(sequence[0].volume_liters);
      const lastVol  = parseFloat(sequence[sequence.length - 1].volume_liters);
      totalSignedDelta += (lastVol - firstVol);

      const firstTime = new Date(sequence[0].recorded_at);
      const lastTime  = new Date(sequence[sequence.length - 1].recorded_at);

      if (!overallMinTime || firstTime < overallMinTime) overallMinTime = firstTime;
      if (!overallMaxTime || lastTime > overallMaxTime) overallMaxTime = lastTime;
    }
  }

  // Need at least 2 readings inside the window across the station
  if (totalWindowReadings < 2) {
    return {
      hasEnoughReadings: false,
      tankOutflow: 0,
      signedDelta: null,
      minReadingTime: null,
      maxReadingTime: null,
    };
  }

  return {
    hasEnoughReadings: true,
    tankOutflow: totalOutflow,
    signedDelta: totalSignedDelta,
    minReadingTime: overallMinTime || periodStart,
    maxReadingTime: overallMaxTime || periodEnd,
  };
}

/**
 * Backward compatibility wrapper for getTankVolumeDelta.
 */
async function getTankVolumeDelta(stationId, periodStart, periodEnd) {
  const result = await getTankReconciliationData(stationId, periodStart, periodEnd);
  return {
    delta: result.signedDelta,
    hasData: result.hasEnoughReadings,
    outflow: result.tankOutflow,
    minReadingTime: result.minReadingTime,
    maxReadingTime: result.maxReadingTime,
  };
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
  getTankReconciliationData,
  getTankVolumeDelta,
  getVerifiedDispenseVolume,
};
