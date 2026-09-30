'use strict';

const service = require('./auth.service');

// ── POST /api/auth/register ───────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { fullName, phone, password, role } = req.body;

    if (!fullName || !phone || !password || !role) {
      return res.status(400).json({
        error: 'fullName, phone, password, and role are all required.',
      });
    }

    const user = await service.register({ fullName, phone, password, role });
    return res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'phone and password are required.' });
    }

    const result = await service.login({ phone, password });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    // req.user is set by the authenticate middleware ({ userId, role })
    const user = await service.getMe(req.user.userId);
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
