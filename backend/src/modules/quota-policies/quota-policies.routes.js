'use strict';

const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const controller = require('./quota-policies.controller');

const router = express.Router();

const policySchema = z.object({
  body: z.object({
    vehicleType: z.enum(['PRIVATE', 'TAXI', 'COMMERCIAL']),
    dailyLimitLiters: z.number().positive()
  })
});

router.post(
  '/',
  authenticate,
  authorize('GOV_REGULATOR', 'ADMIN'),
  validate(policySchema),
  controller.setQuotaPolicy
);

router.get(
  '/',
  authenticate,
  controller.getAllQuotaPolicies
);

module.exports = router;
