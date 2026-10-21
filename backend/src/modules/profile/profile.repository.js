'use strict';

const pool = require('../../db/pool');

/**
 * Fetch profile fields for the logged in user.
 * Explicitly never returns password_hash, token_version, or internal secrets.
 */
async function findProfileById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, office, last_login_at, created_at, must_change_password
     FROM users
     WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Fetch user row including password_hash for authentication/password verification only.
 */
async function findUserWithHash(id) {
  const { rows } = await pool.query(
    `SELECT id, role, password_hash, token_version, must_change_password
     FROM users
     WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Update full_name and phone only. Uses parameterized queries.
 */
async function updateProfile(id, { fullName, phone }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone)
     WHERE id = $3
     RETURNING id, full_name, email, phone, role, office, last_login_at, created_at, must_change_password`,
    [fullName, phone, id],
  );
  return rows[0] ?? null;
}

/**
 * Update password, increment token_version for session invalidation,
 * and clear must_change_password flag.
 */
async function updatePassword(id, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         token_version = token_version + 1,
         must_change_password = false,
         password_changed_at = now()
     WHERE id = $2
     RETURNING id, role, token_version, must_change_password`,
    [passwordHash, id],
  );
  return rows[0] ?? null;
}

/**
 * Insert an audit log entry.
 * Never stores passwords or old values.
 */
async function createAuditLog({ userId, action, ip, userAgent, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, ip_address, user_agent, metadata, occurred_at, created_at)
     VALUES ($1, $1, $2, 'users', $1, $3, $4, $5, now(), now())`,
    [userId, action, ip || null, userAgent || null, JSON.stringify(metadata)],
  );
}

module.exports = {
  findProfileById,
  findUserWithHash,
  updateProfile,
  updatePassword,
  createAuditLog,
};
