'use strict';

const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./fuel-requests.controller');

const router = express.Router();

const requestSchema = z.object({
  body: z.object({
    vehicleId: z.string().uuid(),
    stationId: z.string().uuid(),
    requestedLiters: z.number().positive()
  })
});

router.post(
  '/',
  authenticate,
  authorize('DRIVER'),
  validate(requestSchema),
  controller.requestFuel
);

router.get(
  '/:id',
  authenticate,
  authorize('DRIVER', 'GOV_REGULATOR', 'ADMIN'),
  controller.getFuelRequestById
);

module.exports = router;
