'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db/pool');

/**
 * authenticate middleware
 *
 * Reads: Authorization: Bearer <token>
 * On success:
 * 1. Verifies token validity and signature.
 * 2. Checks tokenVersion against the user's active token_version in the DB (session invalidation).
 * 3. Enforces the forced-change policy if must_change_password is true.
 * Attaches { userId, role, tokenVersion, mustChangePassword } to req.user and calls next().
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Token is invalid or has expired.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, role, token_version, must_change_password FROM users WHERE id = $1`,
      [decoded.userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Session invalidation check (Requirement 2):
    // If the token was issued with a tokenVersion and it does not match current user.token_version,
    // the session has been invalidated (e.g. after a password change).
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({
        error: 'Session invalidated. Please log in again with your new password.',
        code: 'SESSION_INVALIDATED',
      });
    }

    req.user = {
      userId: user.id,
      role: user.role,
      tokenVersion: user.token_version,
      mustChangePassword: Boolean(user.must_change_password),
    };

    // Forced password change check (Requirement 3):
    // While must_change_password is true, user can only call GET /me and POST /change-password.
    if (user.must_change_password) {
      const fullPath = ((req.baseUrl || '') + (req.path || '')).replace(/\/+$/, '');
      const isGetMe = req.method === 'GET' && (fullPath.endsWith('/me') || fullPath === '/api/v1/me');
      const isChangePassword = req.method === 'POST' && fullPath.endsWith('/change-password');

      if (!isGetMe && !isChangePassword) {
        return res.status(403).json({
          error: 'Password change required before accessing other resources.',
          code: 'MUST_CHANGE_PASSWORD',
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
