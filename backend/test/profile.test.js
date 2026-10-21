'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure all repository modules use testPool
jest.mock('../src/db/pool', () => require('./helpers/testPool'));

const testPool = require('./helpers/testPool');
const config = require('../src/config');
const app = require('../src/app');
const { resetRateLimiter } = require('../src/modules/profile/profile.rateLimiter');

describe('Profile and Password Management Integration Tests', () => {
  let user1;
  let token1;
  const initialPassword = 'InitialSecurePassword123!';

  beforeEach(() => {
    resetRateLimiter();
  });

  beforeAll(async () => {
    // Seed test user in test schema
    const hash = await bcrypt.hash(initialPassword, 12);
    const phone = `+2519${Date.now().toString().slice(-8)}`;
    const { rows } = await testPool.query(
      `INSERT INTO users (full_name, phone, email, office, password_hash, role, token_version, must_change_password)
       VALUES ('Regulator Test User', $1, 'test.regulator@energy.gov.et', 'Federal Energy Authority', $2, 'GOV_REGULATOR', 1, false)
       RETURNING id, full_name, phone, email, office, role, token_version, must_change_password`,
      [phone, hash],
    );
    user1 = rows[0];

    token1 = jwt.sign(
      { userId: user1.id, role: user1.role, tokenVersion: user1.token_version },
      config.jwtSecret,
      { expiresIn: '24h' },
    );
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM audit_logs WHERE user_id = $1', [user1.id]);
    await testPool.query('DELETE FROM users WHERE id = $1', [user1.id]);
    await testPool.end();
  });

  // ── 1. GET /api/v1/me ───────────────────────────────────────────────────────
  describe('GET /api/v1/me', () => {
    test('returns logged in user profile without sensitive fields', async () => {
      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body.id).toBe(user1.id);
      expect(res.body.full_name).toBe('Regulator Test User');
      expect(res.body.email).toBe('test.regulator@energy.gov.et');
      expect(res.body.role).toBe('GOV_REGULATOR');
      expect(res.body.office).toBe('Federal Energy Authority');
      expect(res.body.password_hash).toBeUndefined();
      expect(res.body.token_version).toBeUndefined();
    });
  });

  // ── 2. PATCH /api/v1/me ─────────────────────────────────────────────────────
  describe('PATCH /api/v1/me', () => {
    test('allows updating only full_name and phone', async () => {
      const res = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          full_name: 'Updated Regulator Name',
          phone: '+251911998877',
        })
        .expect(200);

      expect(res.body.full_name).toBe('Updated Regulator Name');
      expect(res.body.phone).toBe('+251911998877');

      // Check audit log
      const { rows: logs } = await testPool.query(
        "SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'PROFILE_UPDATED' ORDER BY created_at DESC",
        [user1.id],
      );
      expect(logs.length).toBeGreaterThan(0);
    });

    test('attempt to PATCH a forbidden field (role) is strictly rejected', async () => {
      const res = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          role: 'ADMIN',
        })
        .expect(400);

      expect(res.body.error).toMatch(/Cannot modify restricted field\(s\): role/i);
    });

    test('attempt to PATCH other forbidden fields (email, office, id) is rejected', async () => {
      const res = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          email: 'hacker@evil.com',
          office: 'New Office',
        })
        .expect(400);

      expect(res.body.error).toMatch(/Cannot modify restricted field/i);
    });
  });

  // ── 3. POST /api/v1/me/change-password ──────────────────────────────────────
  describe('POST /api/v1/me/change-password validation & security', () => {
    test('wrong current password returns generic error and logs failure', async () => {
      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewValidPassword123!',
        })
        .expect(400);

      expect(res.body.error).toBe('Invalid current password.');

      const { rows: logs } = await testPool.query(
        "SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'PASSWORD_CHANGE_FAILED'",
        [user1.id],
      );
      expect(logs.length).toBeGreaterThan(0);
    });

    test('weak new password (dictionary password) is rejected', async () => {
      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: initialPassword,
          newPassword: 'password123',
        })
        .expect(400);

      expect(res.body.error).toMatch(/common or weak/i);
    });

    test('weak new password (< 10 chars) is rejected', async () => {
      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: initialPassword,
          newPassword: 'Short9!',
        })
        .expect(400);

      expect(res.body.error).toMatch(/at least 10 characters/i);
    });

    test('same-as-old password is rejected', async () => {
      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: initialPassword,
          newPassword: initialPassword,
        })
        .expect(400);

      expect(res.body.error).toMatch(/must be different from current password/i);
    });

    test('rate limit triggered after 5 attempts', async () => {
      // Perform 5 attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/me/change-password')
          .set('Authorization', `Bearer ${token1}`)
          .send({
            currentPassword: 'WrongPassword!',
            newPassword: 'BrandNewValidPassword123!',
          });
      }

      // 6th attempt must trigger 429
      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: initialPassword,
          newPassword: 'BrandNewValidPassword123!',
        })
        .expect(429);

      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toMatch(/Too many password change attempts/i);
    });

    test('successful password change invalidates old token', async () => {
      resetRateLimiter();
      const updatedPassword = 'BrandNewSuperSecurePassword999!';

      const res = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.message).toMatch(/Password changed successfully/i);

      // Verify audit log has PASSWORD_CHANGED
      const { rows: logs } = await testPool.query(
        "SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'PASSWORD_CHANGED'",
        [user1.id],
      );
      expect(logs.length).toBeGreaterThan(0);

      // Requirement 2: Old token is now rejected because token_version was incremented
      const oldTokenRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(401);

      expect(oldTokenRes.body.code).toBe('SESSION_INVALIDATED');

      // New token works
      const newTokenRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${res.body.token}`)
        .expect(200);

      expect(newTokenRes.body.id).toBe(user1.id);
    });
  });

  // ── 4. Forced password change on first login flow ────────────────────────────
  describe('Forced password change on first login flow', () => {
    let forcedUser;
    let forcedToken;
    const tempPassword = 'TempAdminPassword123!';

    beforeAll(async () => {
      const hash = await bcrypt.hash(tempPassword, 12);
      const phone = `+2519${Date.now().toString().slice(-7)}9`;
      const { rows } = await testPool.query(
        `INSERT INTO users (full_name, phone, email, password_hash, role, token_version, must_change_password)
         VALUES ('Forced Change User', $1, 'forced@energy.gov.et', $2, 'GOV_REGULATOR', 1, true)
         RETURNING id, role, token_version`,
        [phone, hash],
      );
      forcedUser = rows[0];

      forcedToken = jwt.sign(
        { userId: forcedUser.id, role: forcedUser.role, tokenVersion: forcedUser.token_version },
        config.jwtSecret,
        { expiresIn: '24h' },
      );
    });

    afterAll(async () => {
      await testPool.query('DELETE FROM audit_logs WHERE user_id = $1', [forcedUser.id]);
      await testPool.query('DELETE FROM users WHERE id = $1', [forcedUser.id]);
    });

    test('blocked from accessing protected endpoints (e.g. GET /api/stations) with 403 MUST_CHANGE_PASSWORD', async () => {
      const res = await request(app)
        .get('/api/stations')
        .set('Authorization', `Bearer ${forcedToken}`)
        .expect(403);

      expect(res.body.code).toBe('MUST_CHANGE_PASSWORD');
      expect(res.body.error).toMatch(/Password change required/i);
    });

    test('allowed to call GET /api/v1/me while must_change_password is true', async () => {
      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${forcedToken}`)
        .expect(200);

      expect(res.body.must_change_password).toBe(true);
    });

    test('changing password successfully clears must_change_password and unlocks all endpoints', async () => {
      const permanentPassword = 'PermanentSecurePassword456!';

      const changeRes = await request(app)
        .post('/api/v1/me/change-password')
        .set('Authorization', `Bearer ${forcedToken}`)
        .send({
          currentPassword: tempPassword,
          newPassword: permanentPassword,
        })
        .expect(200);

      const activeToken = changeRes.body.token;

      // GET /api/v1/me now shows must_change_password: false
      const meRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(200);

      expect(meRes.body.must_change_password).toBe(false);

      // Endpoints previously blocked (e.g. GET /api/stations) are now accessible!
      await request(app)
        .get('/api/stations')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(200);
    });
  });
});
