'use strict';

const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./vehicles.controller');

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    plateNumber: z.string().min(1, "plateNumber is required"),
    vehicleType: z.enum(['PRIVATE', 'TAXI', 'COMMERCIAL']),
    fuelType: z.enum(['PETROL', 'DIESEL']).default('PETROL')
  })
});

router.post(
  '/',
  authenticate,
  authorize('DRIVER'),
  validate(registerSchema),
  controller.registerVehicle
);

router.get(
  '/:id',
  authenticate,
  authorize('DRIVER', 'GOV_REGULATOR', 'ADMIN'),
  controller.getVehicleById
);

module.exports = router;
