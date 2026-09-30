'use strict';

const { Router } = require('express');
const controller  = require('./reconciliation.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

// GET  /api/reconciliations/:id  — any authenticated role
router.get('/:id', controller.getReconciliationById);

module.exports = router;
