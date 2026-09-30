'use strict';

const { Router } = require('express');
const controller  = require('./auth.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

// Public routes
router.post('/register', controller.register);
router.post('/login',    controller.login);

// Protected routes (JWT required)
router.get('/me', authenticate, controller.me);

module.exports = router;
