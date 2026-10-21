'use strict';

/**
 * In-memory sliding window rate limiter for password changes.
 * Allows at most 5 attempts per 15 minutes per user.
 */
const attempts = new Map(); // userId -> Array<number> (timestamps in ms)
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function passwordChangeRateLimiter(req, res, next) {
  const userId = req.user?.userId || req.ip;
  const now = Date.now();

  const userAttempts = (attempts.get(userId) || []).filter(ts => now - ts < WINDOW_MS);

  if (userAttempts.length >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many password change attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  userAttempts.push(now);
  attempts.set(userId, userAttempts);

  // Periodic cleanup if map grows
  if (attempts.size > 1000) {
    for (const [key, timestamps] of attempts.entries()) {
      const active = timestamps.filter(ts => now - ts < WINDOW_MS);
      if (active.length === 0) attempts.delete(key);
      else attempts.set(key, active);
    }
  }

  next();
}

function resetRateLimiter() {
  attempts.clear();
}

module.exports = { passwordChangeRateLimiter, resetRateLimiter };
