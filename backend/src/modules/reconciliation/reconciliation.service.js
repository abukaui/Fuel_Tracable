'use strict';

/**
 * reconciliation.service.js
 *
 * Core logic shared by both the scheduled job and the on-demand endpoint.
 *
 *  runForStation(stationId, periodStart, periodEnd)
 *    → computes tank_volume_delta + verified_dispense_volume → determines
 *      status (OK / FLAGGED / INCOMPLETE) → inserts a reconciliations row
 *    → returns the created row
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
 * @returns {Promise<object>} The created reconciliations row
 */
async function runForStation(stationId, periodStart, periodEnd) {
  // 1. Tank volume delta (sum of latest - earliest reading per tank)
  const { delta, hasData } = await repo.getTankVolumeDelta(stationId, periodStart, periodEnd);

  // 2. Verified dispense volume
  const verifiedDispenseVolume = await repo.getVerifiedDispenseVolume(stationId, periodStart, periodEnd);

  // 3. Determine status and variance
  let status;
  let varianceLiters = null;

  if (!hasData) {
    // No ATG readings in this period — cannot compute a meaningful result
    status = 'INCOMPLETE';
  } else {
    // Tank delta is negative when fuel left (sold). We want the absolute drop.
    const absoluteDrop = Math.abs(delta);
    // Variance = fuel that left the tank but has no matching sale record
    varianceLiters = absoluteDrop - verifiedDispenseVolume;

    if (varianceLiters > config.reconciliationToleranceLiters) {
      status = 'FLAGGED';
    } else {
      status = 'OK';
    }
  }

  // 4. Insert row (each run creates its own row — history is never overwritten)
  const row = await repo.createReconciliation({
    stationId,
    periodStart,
    periodEnd,
    tankVolumeDelta:        delta,
    verifiedDispenseVolume: hasData ? verifiedDispenseVolume : null,
    varianceLiters,
    stockOutFlag:           false,  // stock-out flag is set by the separate updateStatus path
    status,
  });

  console.log(
    `[reconciliation] station=${stationId} ` +
    `period=${periodStart.toISOString()}→${periodEnd.toISOString()} ` +
    `delta=${delta?.toFixed(2) ?? 'N/A'} ` +
    `dispensed=${hasData ? verifiedDispenseVolume.toFixed(2) : 'N/A'} ` +
    `variance=${varianceLiters?.toFixed(2) ?? 'N/A'} ` +
    `status=${status}`
  );

  return row;
}

/**
 * runForAllStations
 *
 * Iterates every station in the DB and runs reconciliation for the period
 * [periodStart, periodEnd]. Used by the scheduled cron job.
 *
 * Errors per-station are caught and logged so one bad station doesn't
 * abort the entire batch.
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
  const station = await repo.findReconciliationsByStationId(stationId); // validates station exists implicitly
  const now = new Date();
  const periodStart = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
  return runForStation(stationId, periodStart, now);
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
