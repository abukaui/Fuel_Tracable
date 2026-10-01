'use strict';

const { Router } = require('express');
const controller = require('./complaints.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = Router();

router.use(authenticate);

// POST /api/complaints -> DRIVER only
router.post('/', authorize('DRIVER'), controller.createComplaint);

// GET /api/complaints -> GOV_REGULATOR, ADMIN
router.get('/', authorize('GOV_REGULATOR', 'ADMIN'), controller.getComplaints);

// PUT /api/complaints/:id -> GOV_REGULATOR only
router.put('/:id', authorize('GOV_REGULATOR'), controller.updateStatus);

module.exports = router;
