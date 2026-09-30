'use strict';

/**
 * authorize(...allowedRoles) → Express middleware
 *
 * Must run AFTER authenticate in the middleware chain (req.user must exist).
 * Returns 403 if the user's role is not in allowedRoles.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), controller.handler);
 *   router.get('/ops',        authenticate, authorize('ADMIN', 'GOV_REGULATOR'), handler);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Safety net — should not happen if authenticate ran first.
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Allowed role(s): ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = authorize;
