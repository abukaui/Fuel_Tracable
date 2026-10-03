'use strict';

const express    = require('express');
const { z }      = require('zod');
const validate   = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const controller   = require('./dispense.controller');

const router = express.Router();

const verifySchema = z.object({
  body: z.object({
    otpCode:         z.string().min(1),
    plateNumber:     z.string().min(1),
    litersDispensed: z.number().positive(),
  }),
});

const previewSchema = z.object({
  body: z.object({
    otpCode: z.string().min(1),
  }),
});

// POST /api/dispense/preview
router.post(
  '/preview',
  authenticate,
  authorize('STATION_OPERATOR', 'ADMIN'),
  validate(previewSchema),
  controller.previewDispense
);

// POST /api/dispense/verify  — STATION_OPERATOR only
router.post(
  '/verify',
  authenticate,
  authorize('STATION_OPERATOR', 'ADMIN'),
  validate(verifySchema),
  controller.verifyAndDispense
);

// GET /api/dispense/:id  — owner driver, GOV_REGULATOR, or ADMIN
router.get(
  '/:id',
  authenticate,
  authorize('DRIVER', 'GOV_REGULATOR', 'ADMIN', 'STATION_OPERATOR'),
  controller.getDispenseById
);

module.exports = router;
