'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const repo = require('./profile.repository');

const SALT_ROUNDS = 12;

const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  'password1234',
  '1234567890',
  '12345678901',
  'admin12345',
  'administrator',
  'qwerty1234',
  'letmein123',
  'iloveyou123',
  'welcome1234',
  'changeme123',
  'passphrase1',
  'government1',
  'fuelguard123',
  '0123456789',
]);

function httpError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

async function getProfile(userId) {
  const user = await repo.findProfileById(userId);
  if (!user) throw httpError('User not found.', 404);
  return user;
}

async function updateProfile(userId, { fullName, phone, ip, userAgent }) {
  if (fullName !== undefined && (!fullName || typeof fullName !== 'string' || !fullName.trim())) {
    throw httpError('Full name cannot be empty.', 400);
  }

  if (phone !== undefined && (!phone || typeof phone !== 'string' || phone.trim().length < 7)) {
    throw httpError('Phone number must be at least 7 characters.', 400);
  }

  const updated = await repo.updateProfile(userId, {
    fullName: fullName ? fullName.trim() : undefined,
    phone: phone ? phone.trim() : undefined,
  });

  if (!updated) throw httpError('User not found.', 404);

  // Record PROFILE_UPDATED in audit log (never store old or new password values)
  await repo.createAuditLog({
    userId,
    action: 'PROFILE_UPDATED',
    ip,
    userAgent,
    metadata: {
      updated_fields: [
        ...(fullName ? ['full_name'] : []),
        ...(phone ? ['phone'] : []),
      ],
    },
  });

  return updated;
}

async function changePassword(userId, { currentPassword, newPassword, ip, userAgent }) {
  if (!currentPassword || typeof currentPassword !== 'string') {
    throw httpError('Current password is required.', 400);
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw httpError('New password is required.', 400);
  }

  const user = await repo.findUserWithHash(userId);
  if (!user) throw httpError('User not found.', 404);

  // Verify current password against stored hash
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash || '');
  if (!isMatch) {
    // Record failure in audit log
    await repo.createAuditLog({
      userId,
      action: 'PASSWORD_CHANGE_FAILED',
      ip,
      userAgent,
      metadata: { reason: 'INVALID_CURRENT_PASSWORD' },
    });
    // Return a generic error for a wrong current password (no hints)
    throw httpError('Invalid current password.', 400);
  }

  // Validate new password requirements:
  // 1. Minimum 10 characters
  if (newPassword.length < 10) {
    throw httpError('New password must be at least 10 characters long.', 400);
  }

  // 2. Must differ from current password
  if (newPassword === currentPassword) {
    throw httpError('New password must be different from current password.', 400);
  }

  const sameAsOld = await bcrypt.compare(newPassword, user.password_hash || '');
  if (sameAsOld) {
    throw httpError('New password must be different from current password.', 400);
  }

  // 3. Reject common weak passwords or pure repetitive characters
  const normalized = newPassword.toLowerCase().trim();
  if (COMMON_WEAK_PASSWORDS.has(normalized) || /^(.)\1+$/.test(newPassword)) {
    throw httpError('The chosen password is too common or weak. Please select a stronger password.', 400);
  }

  // Hash new password using project standard bcrypt (SALT_ROUNDS = 12)
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password in DB, increment token_version for session invalidation, clear must_change_password
  const updatedUser = await repo.updatePassword(userId, passwordHash);

  // Record PASSWORD_CHANGED in audit log
  await repo.createAuditLog({
    userId,
    action: 'PASSWORD_CHANGED',
    ip,
    userAgent,
    metadata: {
      token_version: updatedUser.token_version,
      forced_change_cleared: user.must_change_password === true,
    },
  });

  // Generate a fresh JWT with the new token_version so the active session can seamlessly update
  const newToken = jwt.sign(
    { userId: updatedUser.id, role: updatedUser.role, tokenVersion: updatedUser.token_version },
    config.jwtSecret,
    { expiresIn: '24h' },
  );

  return {
    message: 'Password changed successfully. All other active sessions have been invalidated.',
    token: newToken,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
