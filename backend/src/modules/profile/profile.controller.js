'use strict';

const service = require('./profile.service');

async function getProfile(req, res, next) {
  try {
    const profile = await service.getProfile(req.user.userId);
    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    // Strict allow-list enforcement: only 'full_name' and 'phone' are allowed
    const ALLOWED_FIELDS = ['full_name', 'phone'];
    const bodyKeys = Object.keys(req.body || {});
    
    const disallowedKeys = bodyKeys.filter(k => !ALLOWED_FIELDS.includes(k));
    if (disallowedKeys.length > 0) {
      return res.status(400).json({
        error: `Cannot modify restricted field(s): ${disallowedKeys.join(', ')}. Only full_name and phone may be updated.`,
      });
    }

    if (bodyKeys.length === 0) {
      return res.status(400).json({
        error: 'At least one field (full_name or phone) must be provided for update.',
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const updated = await service.updateProfile(req.user.userId, {
      fullName: req.body.full_name,
      phone: req.body.phone,
      ip,
      userAgent,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await service.changePassword(req.user.userId, {
      currentPassword,
      newPassword,
      ip,
      userAgent,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
