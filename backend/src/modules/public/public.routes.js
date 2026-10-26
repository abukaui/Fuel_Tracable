'use strict';

const { Router } = require('express');
const controller = require('./public.controller');

const router = Router();

// Public endpoint - no auth required
router.get('/landing-stats', controller.getLandingStats);
router.get('/stats', controller.getLandingStats);

module.exports = router;
