'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const { passwordChangeRateLimiter } = require('./profile.rateLimiter');
const controller = require('./profile.controller');

const router = Router();

// All profile endpoints require authentication and operate only on the logged-in user
router.get('/', authenticate, controller.getProfile);
router.patch('/', authenticate, controller.updateProfile);
router.post('/change-password', authenticate, passwordChangeRateLimiter, controller.changePassword);

module.exports = router;
