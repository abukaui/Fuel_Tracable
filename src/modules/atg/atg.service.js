'use strict';

const repo = require('./atg.repository');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getTankReadings(tankId, from, to) {
  const tank = await repo.findTankById(tankId);
  if (!tank) {
    throw httpError('Tank not found.', 404);
  }
  return await repo.findReadingsByTankId(tankId, from, to);
}

async function getLatestTankReading(tankId) {
  const tank = await repo.findTankById(tankId);
  if (!tank) {
    throw httpError('Tank not found.', 404);
  }
  const reading = await repo.findLatestReadingByTankId(tankId);
  if (!reading) {
    throw httpError('No readings found for this tank.', 404);
  }
  return reading;
}

module.exports = {
  getTankReadings,
  getLatestTankReading,
};
