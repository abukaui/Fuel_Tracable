'use strict';
require('dotenv').config();
const { Client } = require('pg');

async function setup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS test CASCADE');
  await client.query('CREATE SCHEMA test');
  await client.end();
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
