'use strict';

const pool = require('../../db/pool');

/**
 * Raw SQL queries for the users table.
 * Never called directly from routes — always go through the service layer.
 */

/**
 * Find a user by phone number.
 * Returns the full row INCLUDING password_hash (service layer strips it).
 * Normalizes by checking the last 9 digits to handle mixed country codes (+254, 07, etc).
 */
async function findByPhone(phone) {
  // Extract only digits and take the last 9 digits
  const digits = phone.replace(/\D/g, '');
  const last9 = digits.slice(-9);

  const { rows } = await pool.query(
    `SELECT id, full_name, phone, password_hash, role, created_at
     FROM users
     WHERE phone LIKE $1`,
    [`%${last9}`],
  );
  return rows[0] ?? null;
}

/**
 * Find a user by UUID — omits password_hash at the query level.
 */
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, phone, role, created_at
     FROM users
     WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Insert a new user and return the created row without password_hash.
 * @param {{ fullName: string, phone: string, passwordHash: string, role: string }} param
 */
async function createUser({ fullName, phone, passwordHash, role }) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, phone, role, created_at`,
    [fullName, phone, passwordHash, role],
  );
  return rows[0];
}

module.exports = { findByPhone, findById, createUser };
