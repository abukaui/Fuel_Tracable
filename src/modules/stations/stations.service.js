'use strict';

const repo = require('./stations.repository');
const config = require('../../config');
const atgRepo = require('../atg/atg.repository');
const reconRepo = require('../reconciliation/reconciliation.repository');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createStation(data) {
  const existing = await repo.findStationBySid(data.sid);
  if (existing) {
    throw httpError('A station with that sid already exists.', 409);
  }
  const station = await repo.createStation(data);
  return station;
}

async function getAllStations() {
  return await repo.findAllStations();
}

async function getStationWithTanks(id) {
  const station = await repo.findStationById(id);
  if (!station) {
    throw httpError('Station not found.', 404);
  }
  const tanks = await repo.findTanksByStationId(id);
  return { ...station, tanks };
}

async function createTank(stationId, data) {
  const station = await repo.findStationById(stationId);
  if (!station) {
    throw httpError('Station not found.', 404);
  }
  const tank = await repo.createTank({
    stationId,
    capacityLiters: data.capacityLiters,
    productType: data.productType || 'PETROL',
  });
  return tank;
}

async function updateStatus(id, { status }) {
  const station = await repo.findStationById(id);
  if (!station) {
    throw httpError('Station not found.', 404);
  }
  const updatedStation = await repo.updateStationStatus(id, status);

  if (status === 'OUT_OF_STOCK') {
    const tanks = await repo.findTanksByStationId(id);
    let falseFlag = false;

    for (const tank of tanks) {
      const latestReading = await atgRepo.findLatestReadingByTankId(tank.id);
      if (!latestReading) {
        console.log(`[Reconciliation] Tank ${tank.id} has no readings yet. Skipping.`);
        continue;
      }
      if (parseFloat(latestReading.volume_liters) > config.stockOutMinThresholdLiters) {
        falseFlag = true;
        break;
      }
    }

    if (falseFlag) {
      await reconRepo.createReconciliation({
        stationId: id,
        periodStart: new Date(),
        periodEnd: new Date(),
        stockOutFlag: true,
        status: 'FLAGGED'
      });
    }
  }

  return updatedStation;
}

async function getStatusHistory(id) {
  const station = await repo.findStationById(id);
  if (!station) {
    throw httpError('Station not found.', 404);
  }
  return {
    currentStatus: station.current_status,
    statusDeclaredAt: station.status_declared_at,
  };
}

module.exports = {
  createStation,
  getAllStations,
  getStationWithTanks,
  createTank,
  updateStatus,
  getStatusHistory,
};
