'use strict';

const { Router } = require('express');
const controller = require('./atg.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

// All routes require authentication
router.use(authenticate);

// 1. GET /api/tanks/:id/readings
router.get('/:id/readings', controller.getReadings);

// 2. GET /api/tanks/:id/readings/latest
router.get('/:id/readings/latest', controller.getLatestReading);

module.exports = router;
