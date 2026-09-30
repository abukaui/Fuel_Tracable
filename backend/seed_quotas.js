'use strict';
require('dotenv').config();
const pool = require('./src/db/pool');

async function seed() {
  const policies = [
    ['PRIVATE',    50],
    ['TAXI',       80],
    ['COMMERCIAL', 200],
  ];

  for (const [type, limit] of policies) {
    await pool.query(
      `INSERT INTO quota_policies (vehicle_type, daily_limit_liters)
       VALUES ($1, $2)
       ON CONFLICT (vehicle_type) DO UPDATE SET daily_limit_liters = $2`,
      [type, limit]
    );
    console.log(`Upserted: ${type} → ${limit}L/day`);
  }

  pool.end();
}

seed().catch(err => { console.error(err); pool.end(); });
