'use strict';

const service = require('./reconciliation.service');

async function getStationReconciliations(req, res, next) {
  try {
    const { id } = req.params;
    const reconciliations = await service.getStationReconciliations(id);
    return res.json({ reconciliations });
  } catch (err) {
    next(err);
  }
}

async function getReconciliationById(req, res, next) {
  try {
    const { id } = req.params;
    const reconciliation = await service.getReconciliation(id);
    return res.json({ reconciliation });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStationReconciliations,
  getReconciliationById,
};
