'use strict';

/**
 * reconciliation.service.js
 *
 * Core logic shared by both the scheduled job and the on-demand endpoint.
 *
 *  runForStation(stationId, periodStart, periodEnd)
 *    → computes tank drops (tank_outflow) + verified_dispense_volume
 *    → determines status (OK / FLAGGED / INCOMPLETE)
 *    → upserts a reconciliations row
 *    → returns the created/updated row
 */

const repo   = require('./reconciliation.repository');
const config = require('../../config');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * runForStation
 *
 * @param {string} stationId
 * @param {Date}   periodStart
 * @param {Date}   periodEnd
 * @returns {Promise<object>} The reconciliations row
 */
async function runForStation(stationId, periodStart, periodEnd) {
  // 1. Calculate tank telemetry data (genuine outflow drops and signed delta)
  const tankData = await repo.getTankReconciliationData(stationId, periodStart, periodEnd);

  let status;
  let varianceLiters = null;
  let verifiedDispenseVolume = null;
  let signedDelta = null;

  if (!tankData.hasEnoughReadings) {
    // Fewer than 2 readings in the window — cannot compute a meaningful result
    status = 'INCOMPLETE';
  } else {
    signedDelta = tankData.signedDelta;

    // 2. Verified dispense volume covering the same time span as the readings used
    verifiedDispenseVolume = await repo.getVerifiedDispenseVolume(
      stationId,
      tankData.minReadingTime,
      tankData.maxReadingTime
    );

    // 3. Variance = GREATEST(tank_outflow - verified_dispense_volume, 0)
    // Only genuine drops are counted in tank_outflow (refills/increases are ignored).
    varianceLiters = Math.max(tankData.tankOutflow - verifiedDispenseVolume, 0);

    if (varianceLiters > config.reconciliationToleranceLiters) {
      status = 'FLAGGED';
    } else {
      status = 'OK';
    }
  }

  // 4. Upsert row (unique index on station_id, period_start, period_end ensures idempotency)
  const row = await repo.createReconciliation({
    stationId,
    periodStart,
    periodEnd,
    tankVolumeDelta:        signedDelta,
    verifiedDispenseVolume,
    varianceLiters,
    stockOutFlag:           false,
    status,
  });

  console.log(
    `[reconciliation] station=${stationId} ` +
    `period=${periodStart.toISOString()}→${periodEnd.toISOString()} ` +
    `outflow=${tankData.tankOutflow?.toFixed(2) ?? 'N/A'} ` +
    `delta=${signedDelta?.toFixed(2) ?? 'N/A'} ` +
    `dispensed=${verifiedDispenseVolume != null ? verifiedDispenseVolume.toFixed(2) : 'N/A'} ` +
    `variance=${varianceLiters != null ? varianceLiters.toFixed(2) : 'N/A'} ` +
    `status=${status}`
  );

  return row;
}

/**
 * runForAllStations
 *
 * Iterates every station in the DB and runs reconciliation for the period
 * [periodStart, periodEnd]. Used by the scheduled cron job.
 */
async function runForAllStations(periodStart, periodEnd) {
  const stationIds = await repo.getAllStationIds();
  console.log(`[reconciliation] Running batch for ${stationIds.length} station(s) …`);

  for (const stationId of stationIds) {
    try {
      await runForStation(stationId, periodStart, periodEnd);
    } catch (err) {
      console.error(`[reconciliation] Error for station ${stationId}:`, err.message);
    }
  }
}

// ── On-demand trigger (used by the HTTP endpoint) ─────────────────────────────

async function runOnDemand(stationId, lookbackMinutes) {
  await repo.findReconciliationsByStationId(stationId); // validates station exists implicitly
  const minutes = lookbackMinutes || 30;
  const now = new Date();

  // Round periodEnd to the current minute boundary so multiple rapid clicks produce the same key
  const periodEnd = new Date(Math.floor(now.getTime() / 60000) * 60000);
  const periodStart = new Date(periodEnd.getTime() - minutes * 60 * 1000);

  return runForStation(stationId, periodStart, periodEnd);
}

async function getStationReconciliations(stationId) {
  return await repo.findReconciliationsByStationId(stationId);
}

async function getReconciliation(id) {
  const rec = await repo.findReconciliationById(id);
  if (!rec) {
    throw httpError('Reconciliation not found.', 404);
  }
  return rec;
}

async function resolveReconciliation(id, note, actorId) {
  if (!note || !note.trim()) {
    throw httpError('Note is required.', 400);
  }
  const rec = await repo.findReconciliationById(id);
  if (!rec) throw httpError('Reconciliation not found.', 404);

  if (rec.status === 'RESOLVED') {
    return rec;
  }

  const pool = require('../../db/pool');
  const query = `
    UPDATE reconciliations
    SET status = 'RESOLVED', investigated_by = $1, investigation_note = $2
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [actorId, note.trim(), id]);

  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'RECONCILIATION_RESOLVED', 'reconciliations', $2, $3)`,
    [actorId, id, JSON.stringify({ note: note.trim() })]
  );

  return result.rows[0];
}

module.exports = {
  runForStation,
  runForAllStations,
  runOnDemand,
  getStationReconciliations,
  getReconciliation,
  resolveReconciliation,
};
