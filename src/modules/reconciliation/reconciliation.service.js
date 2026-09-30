'use strict';

const repo = require('./reconciliation.repository');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getStationReconciliations(stationId) {
  return await repo.findReconciliationsByStationId(stationId);
}

async function getReconciliation(id) {
  const rec = await repo.findReconciliationById(id);
  if (!rec) {
    throw httpError('Reconciliation not found.', 404);
  }
  return rec;
}

module.exports = {
  getStationReconciliations,
  getReconciliation,
};
