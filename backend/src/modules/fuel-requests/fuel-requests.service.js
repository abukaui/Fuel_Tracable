'use strict';

const repo = require('./fuel-requests.repository');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function requestFuel(userId, data) {
  const { vehicleId, stationId, requestedLiters } = data;

  // 1. Fetch vehicle and policy
  const vehicle = await repo.getVehicleWithPolicy(vehicleId);
  if (!vehicle) {
    throw httpError('Vehicle not found.', 404);
  }

  // 2. 403 if vehicleId doesn't belong to req.user
  if (vehicle.owner_id !== userId) {
    throw httpError('Access denied. You do not own this vehicle.', 403);
  }

  // 3. 404 if station doesn't exist
  const station = await repo.getStationStatus(stationId);
  if (!station) {
    throw httpError('Station not found.', 404);
  }

  // 4. Check station status
  if (station.current_status !== 'OPEN') {
    throw httpError(`Cannot request fuel. Station is currently ${station.current_status}.`, 400);
  }

  // 5. Check if policy exists
  if (!vehicle.daily_limit_liters) {
    throw httpError(`No quota policy found for vehicle type: ${vehicle.vehicle_type}.`, 400);
  }
  const dailyLimit = parseFloat(vehicle.daily_limit_liters);

  // 6. Check quota
  const usedLiters = await repo.getUsedLitersToday(vehicleId);
  if (requestedLiters + usedLiters > dailyLimit) {
    const remaining = Math.max(0, dailyLimit - usedLiters);
    throw httpError(`Request exceeds daily limit. Remaining allowance: ${remaining} liters.`, 400);
  }

  // 7. Generate OTP & Hash
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpCodeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  // 8. Create Request
  const request = await repo.createFuelRequest({
    vehicleId,
    stationId,
    requestedLiters,
    otpCodeHash,
    expiresAt
  });

  // Return raw OTP just this once
  return {
    requestId: request.id,
    otpCode,
    expiresAt: request.expires_at
  };
}

async function getFuelRequestById(requestId, user) {
  const request = await repo.findById(requestId);
  if (!request) {
    throw httpError('Fuel request not found.', 404);
  }

  // If driver, check ownership
  if (user.role === 'DRIVER') {
    const vehicle = await repo.getVehicleWithPolicy(request.vehicle_id);
    if (!vehicle || vehicle.owner_id !== user.userId) {
      throw httpError('Access denied. You do not own the vehicle for this request.', 403);
    }
  }

  return {
    id: request.id,
    vehicle_id: request.vehicle_id,
    station_id: request.station_id,
    requested_liters: request.requested_liters,
    status: request.status,
    expires_at: request.expires_at,
    created_at: request.created_at
  };
}

module.exports = {
  requestFuel,
  getFuelRequestById
};
