'use strict';

const { Router } = require('express');
const controller = require('./reconciliation.controller');
const authenticate = require('../../middleware/authenticate');

const router = Router();

router.use(authenticate);

// GET /api/reconciliations/:id
router.get('/:id', controller.getReconciliationById);

module.exports = router;
