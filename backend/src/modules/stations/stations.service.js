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

async function getAllStations(user) {
  if (user && user.role === 'STATION_OPERATOR') {
    return await repo.findStationForOperator(user.userId);
  }
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
  const productType = data.productType || 'PETROL';
  const existingTanks = await repo.findTanksByStationId(stationId);
  if (existingTanks.some(t => t.product_type === productType)) {
    throw httpError(`A ${productType} tank already exists for this station.`, 409);
  }
  const tank = await repo.createTank({
    stationId,
    capacityLiters: data.capacityLiters,
    productType,
  });
  return tank;
}

/**
 * evaluateStockOutFlag
 *
 * Pure detection logic, extracted for testability.
 * Given a list of tank objects (each with an `id`), inspects the latest ATG
 * reading for each. Returns { shouldFlag: true } if ANY tank has a reading
 * ABOVE config.stockOutMinThresholdLiters while the station claims OUT_OF_STOCK
 * — indicating a potential false stock-out / black-market diversion.
 *
 * Tanks with NO readings are skipped (ambiguous — not enough data to flag).
 *
 * @param {string} stationId   (used only for logging)
 * @param {Array<{id: string}>} tanks
 * @returns {Promise<{ shouldFlag: boolean }>}
 */
async function evaluateStockOutFlag(stationId, tanks) {
  for (const tank of tanks) {
    const latestReading = await atgRepo.findLatestReadingByTankId(tank.id);
    if (!latestReading) {
      console.log(`[Reconciliation] Tank ${tank.id} has no readings yet. Skipping.`);
      continue;
    }
    if (parseFloat(latestReading.volume_liters) > config.stockOutMinThresholdLiters) {
      return { shouldFlag: true };
    }
  }
  return { shouldFlag: false };
}

async function updateStatus(id, { status }) {
  const station = await repo.findStationById(id);
  if (!station) {
    throw httpError('Station not found.', 404);
  }
  if (station.current_status === status) {
    return station;
  }
  const updatedStation = await repo.updateStationStatus(id, status);

  if (status === 'OUT_OF_STOCK') {
    const tanks = await repo.findTanksByStationId(id);
    const { shouldFlag } = await evaluateStockOutFlag(id, tanks);

    if (shouldFlag) {
      await reconRepo.createReconciliation({
        stationId: id,
        periodStart: new Date(),
        periodEnd: new Date(),
        stockOutFlag: true,
        status: 'FLAGGED',
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

async function suspendStation(id, reason, actorId) {
  if (!reason || !reason.trim()) {
    throw httpError('Reason is required.', 400);
  }
  const station = await repo.findStationById(id);
  if (!station) throw httpError('Station not found.', 404);

  if (station.current_status === 'SUSPENDED') {
    return station;
  }

  const updated = await repo.updateStationStatus(id, 'SUSPENDED');
  
  // Create audit log
  const pool = require('../../db/pool');
  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'STATION_SUSPENDED', 'stations', $2, $3)`,
    [actorId, id, JSON.stringify({ reason: reason.trim() })]
  );
  
  return updated;
}

async function reinstateStation(id, reason, actorId) {
  if (!reason || !reason.trim()) {
    throw httpError('Reason is required.', 400);
  }
  const station = await repo.findStationById(id);
  if (!station) throw httpError('Station not found.', 404);

  if (station.current_status === 'OPEN') {
    return station;
  }

  const updated = await repo.updateStationStatus(id, 'OPEN');
  
  // Create audit log
  const pool = require('../../db/pool');
  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'STATION_REINSTATED', 'stations', $2, $3)`,
    [actorId, id, JSON.stringify({ reason: reason.trim() })]
  );
  
  return updated;
}

module.exports = {
  createStation,
  getAllStations,
  getStationWithTanks,
  createTank,
  updateStatus,
  getStatusHistory,
  evaluateStockOutFlag, // exported for testing
  suspendStation,
  reinstateStation,
};
