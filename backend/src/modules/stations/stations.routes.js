'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./stations.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const router = Router();

const createStationSchema = z.object({
  sid: z.string().min(1, 'sid is required'),
  name: z.string().min(1, 'name is required'),
  location: z.string().optional(),
});

const createTankSchema = z.object({
  capacityLiters: z.number().positive('capacityLiters must be a positive number'),
  productType: z.string().min(1).default('PETROL'),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'OUT_OF_STOCK'], {
    errorMap: () => ({ message: 'Status must be one of OPEN, CLOSED, or OUT_OF_STOCK' })
  }),
});

// All routes require authentication
router.use(authenticate);

// 1. POST /api/stations — ADMIN only
router.post('/', authorize('ADMIN'), validate(createStationSchema), controller.createStation);

// 2. GET /api/stations — any authenticated role
router.get('/', controller.getAllStations);

// 3. GET /api/stations/:id — any authenticated role
router.get('/:id', controller.getStationById);

// 4. POST /api/stations/:id/tanks — ADMIN only
router.post('/:id/tanks', authorize('ADMIN'), validate(createTankSchema), controller.createTank);

// 5. PUT /api/stations/:id/status — STATION_OPERATOR or ADMIN only
router.put('/:id/status', authorize('STATION_OPERATOR', 'ADMIN'), validate(updateStatusSchema), controller.updateStatus);

// 6. GET /api/stations/:id/status-history — any authenticated role
router.get('/:id/status-history', controller.getStatusHistory);

// 7. GET /api/stations/:id/reconciliations — any authenticated role
router.get('/:id/reconciliations', require('../reconciliation/reconciliation.controller').getStationReconciliations);

// 8. POST /api/stations/:id/reconciliations/run — GOV_REGULATOR or ADMIN only
router.post(
  '/:id/reconciliations/run',
  authorize('GOV_REGULATOR', 'ADMIN'),
  require('../reconciliation/reconciliation.controller').runReconciliation
);

// 9. PUT /api/stations/:id/suspend — GOV_REGULATOR only
router.put('/:id/suspend', authorize('GOV_REGULATOR'), controller.suspendStation);

// 10. PUT /api/stations/:id/reinstate — GOV_REGULATOR only
router.put('/:id/reinstate', authorize('GOV_REGULATOR'), controller.reinstateStation);

module.exports = router;
