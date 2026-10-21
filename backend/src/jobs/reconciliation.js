'use strict';

const cron = require('node-cron');
const config = require('../config');
const { runForAllStations } = require('../modules/reconciliation/reconciliation.service');

let isRunning = false;

function defaultLookbackMinutes() {
  const c = config.reconciliationIntervalCron;
  const m = c.match(/^\*\/(\d+)\s/);
  return m ? parseInt(m[1], 10) : 30;
}

async function runScheduledBatch() {
  if (isRunning) {
    console.warn('[reconciliationJob] Previous batch still running, skipping this tick.');
    return;
  }
  isRunning = true;

  try {
    const lookbackMinutes = defaultLookbackMinutes();
    const intervalMs = lookbackMinutes * 60 * 1000;
    const now = new Date();

    // Align periodEnd to the interval boundary (e.g. 12:00 to 12:30) so double runs produce the same key
    const periodEndMs = Math.floor(now.getTime() / intervalMs) * intervalMs;
    const periodEnd = new Date(periodEndMs);
    const periodStart = new Date(periodEndMs - intervalMs);

    console.log(`[reconciliationJob] Running scheduled batch for window ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
    await runForAllStations(periodStart, periodEnd);
  } catch (err) {
    console.error('[reconciliationJob] Batch failed:', err);
  } finally {
    isRunning = false;
  }
}

function start() {
  console.log(`[reconciliationJob] Starting with cron: ${config.reconciliationIntervalCron}`);
  cron.schedule(config.reconciliationIntervalCron, () => {
    runScheduledBatch();
  });
}

module.exports = { start, runScheduledBatch };
