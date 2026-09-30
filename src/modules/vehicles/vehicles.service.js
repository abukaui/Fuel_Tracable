'use strict';

const repo = require('./vehicles.repository');
const crypto = require('crypto');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function registerVehicle(ownerId, data) {
  const { plateNumber, vehicleType } = data;
  
  const existing = await repo.findByPlateNumber(plateNumber);
  if (existing) {
    throw httpError('Plate number already registered to a vehicle.', 409);
  }

  const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
  const vid = `VID-${randomString}`;

  return await repo.createVehicle({ vid, plateNumber, ownerId, vehicleType });
}

async function getVehicleById(vehicleId, user) {
  const vehicle = await repo.findById(vehicleId);
  if (!vehicle) {
    throw httpError('Vehicle not found.', 404);
  }

  if (user.role === 'DRIVER' && vehicle.owner_id !== user.userId) {
    throw httpError('Access denied. You do not own this vehicle.', 403);
  }

  return vehicle;
}

module.exports = {
  registerVehicle,
  getVehicleById,
};
