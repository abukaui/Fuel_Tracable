'use strict';

const cron = require('node-cron');
const config = require('../config');
const { runForAllStations } = require('../modules/reconciliation/reconciliation.service');

function defaultLookbackMinutes() {
  const c = config.reconciliationIntervalCron;
  const m = c.match(/^\*\/(\d+)\s/);
  return m ? parseInt(m[1], 10) : 30;
}

function start() {
  console.log(`[reconciliationJob] Starting with cron: ${config.reconciliationIntervalCron}`);
  cron.schedule(config.reconciliationIntervalCron, () => {
    const lookbackMinutes = defaultLookbackMinutes();
    const now = new Date();
    const periodStart = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
    console.log(`[reconciliationJob] Running scheduled reconciliation batch...`);
    runForAllStations(periodStart, now).catch(err => {
      console.error('[reconciliationJob] Batch failed:', err);
    });
  });
}

module.exports = { start };
