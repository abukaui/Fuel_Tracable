'use strict';

const repo = require('./vehicles.repository');
const crypto = require('crypto');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function registerVehicle(ownerId, data) {
  const { plateNumber, vehicleType, fuelType = 'PETROL' } = data;
  
  const existing = await repo.findByPlateNumber(plateNumber);
  if (existing) {
    throw httpError('Plate number already registered to a vehicle.', 409);
  }

  // Generate a random 6-digit number as a string
  const vid = crypto.randomInt(100000, 999999).toString();

  return await repo.createVehicle({ vid, plateNumber, ownerId, vehicleType, fuelType });
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
