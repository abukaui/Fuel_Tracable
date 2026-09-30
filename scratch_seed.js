'use strict';
require('dotenv').config();
const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const phone = '0985852123';
    const hash = await bcrypt.hash('password123', 10);
    
    // Check if exists
    const { rows } = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (rows.length > 0) {
      console.log('User already exists with id:', rows[0].id);
    } else {
      const res = await pool.query(
        `INSERT INTO users (full_name, phone, password_hash, role) 
         VALUES ('USSD Test Driver', $1, $2, 'DRIVER') RETURNING id`,
        [phone, hash]
      );
      console.log('Created user with id:', res.rows[0].id);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

seed();
