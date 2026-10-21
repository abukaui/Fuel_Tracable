'use strict';

require('dotenv').config();

/**
 * Central config object.
 * All process.env access is centralised here.
 * Never read process.env directly from business-logic modules.
 */
const config = {
  /** 'development' | 'production' | 'test' */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** HTTP port the server listens on */
  port: parseInt(process.env.PORT || '3000', 10),

  /** Full Postgres connection string (required) */
  databaseUrl: process.env.DATABASE_URL,

  /** JWT signing secret — not used until Day 2 */
  jwtSecret: process.env.JWT_SECRET,

  /** Cron expression for ATG simulator */
  atgSimulatorIntervalCron: process.env.ATG_SIMULATOR_INTERVAL_CRON || '*/5 * * * *',

  /** Minimum liters threshold for false stock-out detection */
  stockOutMinThresholdLiters: parseFloat(process.env.STOCK_OUT_MIN_THRESHOLD_LITERS) || 200,

  /**
   * Cron expression for the reconciliation job.
   * Default: every 30 minutes.
   * To shorten for local testing set e.g. RECONCILIATION_INTERVAL_CRON="*\/1 * * * *" (every 1 min)
   * or use the on-demand POST /api/stations/:id/reconciliations/run endpoint.
   */
  reconciliationIntervalCron: process.env.RECONCILIATION_INTERVAL_CRON || '*/30 * * * *',

  /**
   * Maximum acceptable variance (litres) between tank volume delta and
   * verified dispense volume before a reconciliation period is FLAGGED.
   * Default: 20 litres.
   */
  reconciliationToleranceLiters: parseFloat(process.env.RECONCILIATION_TOLERANCE_LITERS) || 20,

  /** Whether demo tools like /api/internal/atg/inject-loss are enabled */
  enableDemoTools: process.env.ENABLE_DEMO_TOOLS === 'true',
};

// Fail fast if the minimum required variable is missing.
if (!config.databaseUrl) {
  throw new Error(
    '[config] Missing required env var: DATABASE_URL\n' +
      'Copy .env.example → .env and fill in your connection string.',
  );
}

module.exports = config;
