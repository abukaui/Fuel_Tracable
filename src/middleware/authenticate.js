'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * authenticate middleware
 *
 * Reads: Authorization: Bearer <token>
 * On success: attaches { userId, role } to req.user and calls next().
 * On failure: returns 401 immediately.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Token is invalid or has expired.' });
  }
}

module.exports = authenticate;
