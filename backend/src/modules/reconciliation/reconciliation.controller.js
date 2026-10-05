'use strict';

const service = require('./reconciliation.service');
const config  = require('../../config');

// Default lookback for on-demand run = same interval as scheduled job (in minutes)
function defaultLookbackMinutes() {
  // Parse */30 → 30; for more complex crons fall back to 30
  const cron = config.reconciliationIntervalCron;
  const m = cron.match(/^\*\/(\d+)\s/);
  return m ? parseInt(m[1], 10) : 30;
}

async function runReconciliation(req, res, next) {
  try {
    const stationId = req.params.id;
    const lookback  = req.query.lookbackMinutes
      ? parseInt(req.query.lookbackMinutes, 10)
      : defaultLookbackMinutes();

    if (isNaN(lookback) || lookback <= 0) {
      return res.status(400).json({ error: 'lookbackMinutes must be a positive integer.' });
    }

    const row = await service.runOnDemand(stationId, lookback);
    return res.status(201).json({ reconciliation: row });
  } catch (err) {
    next(err);
  }
}

async function getStationReconciliations(req, res, next) {
  try {
    const { id } = req.params;
    const reconciliations = await service.getStationReconciliations(id);
    return res.json({ reconciliations });
  } catch (err) {
    next(err);
  }
}

async function getReconciliationById(req, res, next) {
  try {
    const { id } = req.params;
    const reconciliation = await service.getReconciliation(id);
    return res.json({ reconciliation });
  } catch (err) {
    next(err);
  }
}

async function resolveReconciliation(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const actorId = req.user.userId;
    const reconciliation = await service.resolveReconciliation(id, note, actorId);
    return res.json({ reconciliation });
  } catch (err) {
    next(err);
  }
}

async function getAllReconciliations(req, res, next) {
  try {
    const pool = require('../../db/pool');
    const { rows } = await pool.query(`
      SELECT
        r.id, r.station_id, r.period_start, r.period_end,
        r.tank_volume_delta, r.verified_dispense_volume, r.variance_liters,
        r.status, r.stock_out_flag, r.created_at,
        s.name AS station_name, s.sid
      FROM reconciliations r
      JOIN stations s ON s.id = r.station_id
      ORDER BY r.created_at DESC
      LIMIT 500
    `);
    return res.json({ reconciliations: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runReconciliation,
  getStationReconciliations,
  getReconciliationById,
  getAllReconciliations,
  resolveReconciliation,
};
