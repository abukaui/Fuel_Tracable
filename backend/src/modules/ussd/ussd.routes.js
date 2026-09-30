'use strict';

const { Router } = require('express');
const controller = require('./ussd.controller');

const router = Router();

// POST /api/ussd/callback - Unauthenticated, verified by Africa's Talking signatures in prod
router.post('/callback', controller.handleCallback);

module.exports = router;
