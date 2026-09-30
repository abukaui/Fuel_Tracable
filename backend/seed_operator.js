'use strict';
require('dotenv').config();
const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      ['0985852124']
    );

    if (rows.length > 0) {
      console.log('Operator already exists with id:', rows[0].id);
    } else {
      const res = await pool.query(
        "INSERT INTO users (full_name, phone, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        ['Test Operator', '0985852124', hash, 'STATION_OPERATOR']
      );
      console.log('Created operator with id:', res.rows[0].id);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

seed();
