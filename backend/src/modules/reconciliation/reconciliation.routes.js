'use strict';

const { Router } = require('express');
const controller  = require('./reconciliation.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

// GET /api/reconciliations — all reconciliations (GOV_REGULATOR, ADMIN)
router.get('/', authorize('GOV_REGULATOR', 'ADMIN'), controller.getAllReconciliations);

// GET  /api/reconciliations/:id  — any authenticated role
router.get('/:id', controller.getReconciliationById);

// PUT /api/reconciliations/:id/resolve — GOV_REGULATOR only
router.put('/:id/resolve', authorize('GOV_REGULATOR'), controller.resolveReconciliation);

module.exports = router;
