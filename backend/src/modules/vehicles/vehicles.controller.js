'use strict';

const service = require('./vehicles.service');

async function registerVehicle(req, res, next) {
  try {
    const ownerId = req.user.userId;
    const vehicle = await service.registerVehicle(ownerId, req.body);
    return res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
}

async function getVehicleById(req, res, next) {
  try {
    const { id } = req.params;
    const vehicle = await service.getVehicleById(id, req.user);
    return res.json({ vehicle });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerVehicle,
  getVehicleById,
};
