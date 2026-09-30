'use strict';

const { Pool } = require('pg');
const config = require('../config');

/**
 * Shared pg connection pool.
 * One pool is created at startup and reused for the lifetime of the process.
 * Import this wherever you need a DB connection — never create a new Pool elsewhere.
 */
const pool = new Pool({
  connectionString: config.databaseUrl,
  // Supabase requires SSL on every connection (not just production).
  // rejectUnauthorized: false is needed because Supabase's pooler uses a
  // self-signed certificate on port 6543 (Transaction mode).
  ssl: { rejectUnauthorized: false },
  max: 10,            // maximum number of clients in the pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Surface connection errors immediately so they don't get swallowed silently.
pool.on('error', (err) => {
  console.error('[pool] Unexpected client error:', err.message);
});

module.exports = pool;
