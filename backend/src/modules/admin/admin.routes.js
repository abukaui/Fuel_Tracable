'use strict';

const { Router } = require('express');
const controller = require('./admin.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

// GET /api/audit-logs -> GOV_REGULATOR, ADMIN
router.get('/audit-logs', authorize('GOV_REGULATOR', 'ADMIN'), controller.getAuditLogs);

module.exports = router;
