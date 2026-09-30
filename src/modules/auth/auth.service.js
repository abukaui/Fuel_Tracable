'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const repo = require('./auth.repository');

const VALID_ROLES = ['DRIVER', 'STATION_OPERATOR', 'GOV_REGULATOR', 'ADMIN'];
const SALT_ROUNDS = 12;

/**
 * Creates an error with an HTTP status code attached.
 * Controllers forward these to the global error handler via next(err).
 */
function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ── register ─────────────────────────────────────────────────────────────────

async function register({ fullName, phone, password, role }) {
  if (!VALID_ROLES.includes(role)) {
    throw httpError(
      `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.`,
      400,
    );
  }

  // Check duplicate before hitting the DB constraint, so we can return a
  // clean 409 instead of catching a pg constraint violation.
  const existing = await repo.findByPhone(phone);
  if (existing) {
    throw httpError('A user with that phone number is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await repo.createUser({ fullName, phone, passwordHash, role });
  return user; // password_hash never selected by createUser
}

// ── login ────────────────────────────────────────────────────────────────────

async function login({ phone, password }) {
  // Single generic message — never reveal whether phone or password was wrong.
  const GENERIC = 'Invalid phone number or password.';

  const user = await repo.findByPhone(phone);
  if (!user) throw httpError(GENERIC, 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw httpError(GENERIC, 401);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h' },
  );

  return { token };
}

// ── getMe ────────────────────────────────────────────────────────────────────

async function getMe(userId) {
  const user = await repo.findById(userId);
  if (!user) throw httpError('User not found.', 404);
  return user;
}

module.exports = { register, login, getMe };
