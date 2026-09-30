'use strict';

/**
 * test/helpers/testPool.js
 *
 * A pg Pool that uses the same Supabase DATABASE_URL but prefixes every
 * connection with `SET search_path = test` so every table read/write goes
 * into the `test` schema, leaving the production schema untouched.
 */

require('dotenv').config();
const { Pool } = require('pg');

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

// Force the test schema for every connection in this pool.
testPool.on('connect', (client) => {
  client.query('SET search_path = test, public');
});

module.exports = testPool;
