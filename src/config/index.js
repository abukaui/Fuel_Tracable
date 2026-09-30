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
};

// Fail fast if the minimum required variable is missing.
if (!config.databaseUrl) {
  throw new Error(
    '[config] Missing required env var: DATABASE_URL\n' +
      'Copy .env.example → .env and fill in your connection string.',
  );
}

module.exports = config;
