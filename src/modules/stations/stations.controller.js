'use strict';

const service = require('./stations.service');

async function createStation(req, res, next) {
  try {
    const station = await service.createStation(req.body);
    return res.status(201).json({ station });
  } catch (err) {
    next(err);
  }
}

async function getAllStations(req, res, next) {
  try {
    const stations = await service.getAllStations();
    return res.json({ stations });
  } catch (err) {
    next(err);
  }
}

async function getStationById(req, res, next) {
  try {
    const { id } = req.params;
    const station = await service.getStationWithTanks(id);
    return res.json({ station });
  } catch (err) {
    next(err);
  }
}

async function createTank(req, res, next) {
  try {
    const { id } = req.params;
    const tank = await service.createTank(id, req.body);
    return res.status(201).json({ tank });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const station = await service.updateStatus(id, req.body);
    return res.json({ station });
  } catch (err) {
    next(err);
  }
}

async function getStatusHistory(req, res, next) {
  try {
    const { id } = req.params;
    const history = await service.getStatusHistory(id);
    return res.json({ history });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStation,
  getAllStations,
  getStationById,
  createTank,
  updateStatus,
  getStatusHistory,
};
