'use strict';

/**
 * Standalone script: npm run db:check
 * Runs `SELECT 1` against the pool and exits with code 0 (success)
 * or 1 (failure). No server needs to be running.
 */
const pool = require('./pool');

(async () => {
  console.log('[db:check] Connecting to database…');
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query('SELECT 1 AS result');
    const result = rows[0].result;
    console.log(`[db:check] ✓ Connection successful. SELECT 1 returned: ${result}`);
    process.exit(0);
  } catch (err) {
    console.error('[db:check] ✗ Connection failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
