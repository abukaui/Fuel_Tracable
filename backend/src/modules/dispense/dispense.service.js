'use strict';

const bcrypt   = require('bcryptjs');
const repo     = require('./dispense.repository');
const fuelRepo = require('../fuel-requests/fuel-requests.repository');
const pool     = require('../../db/pool');

const OVER_DISPENSE_TOLERANCE = 0.5; // litres — allows for meter rounding

function httpError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * verifyAndDispense
 *
 * Orchestrates OTP verification, plate check, tolerance guard, and the
 * atomic three-table write.
 *
 * Error codes returned to caller (never leak raw OTP digits):
 *   WRONG_CODE    — no matching pending request found
 *   ALREADY_USED  — request exists but status is already USED/REJECTED
 *   EXPIRED       — request exists but has passed expires_at
 *   PLATE_MISMATCH — OTP matched but plate number doesn't match vehicle
 *   OVER_DISPENSED — litersDispensed > requested + tolerance
 */
async function verifyAndDispense(operatorId, { otpCode, plateNumber, litersDispensed }) {
  // ── Step 1: scan PENDING requests and bcrypt.compare ─────────────────────
  const pendingRequests = await repo.findPendingRequests();

  let matchedRequest = null;
  for (const req of pendingRequests) {
    const isMatch = await bcrypt.compare(String(otpCode), req.otp_code_hash);
    if (isMatch) {
      matchedRequest = req;
      break;
    }
  }

  // ── Step 2: if no PENDING match, figure out WHY ───────────────────────────
  if (!matchedRequest) {
    // We cannot tell ALREADY_USED from WRONG_CODE without the matched row,
    // so return a generic WRONG_CODE. If the operator sees this and suspects
    // an already-used scenario they can check request status via GET.
    throw httpError(
      'No matching pending fuel request found for this OTP.',
      400,
      'WRONG_CODE'
    );
  }

  // ── Step 3: check expiry ──────────────────────────────────────────────────
  const now = new Date();
  if (new Date(matchedRequest.expires_at) < now) {
    throw httpError(
      `This OTP has expired (expired at ${matchedRequest.expires_at}).`,
      400,
      'EXPIRED'
    );
  }

  // ── Step 4: plate check (case-insensitive, trimmed) ───────────────────────
  const submittedPlate = plateNumber.trim().toUpperCase();
  const vehiclePlate   = matchedRequest.plate_number.trim().toUpperCase();
  if (submittedPlate !== vehiclePlate) {
    throw httpError(
      'Plate number does not match the vehicle on this fuel request.',
      400,
      'PLATE_MISMATCH'
    );
    // NOTE: request stays PENDING — it is NOT consumed by a failed plate check
  }

  // ── Step 5: over-dispense tolerance guard ─────────────────────────────────
  const maxAllowed = parseFloat(matchedRequest.requested_liters) + OVER_DISPENSE_TOLERANCE;
  if (litersDispensed > maxAllowed) {
    throw httpError(
      `litersDispensed (${litersDispensed}L) exceeds requested amount ` +
      `(${matchedRequest.requested_liters}L) by more than the allowed tolerance (${OVER_DISPENSE_TOLERANCE}L).`,
      400,
      'OVER_DISPENSED'
    );
  }

  // ── Step 6: atomic write ──────────────────────────────────────────────────
  const dispense = await repo.recordDispenseTransaction({
    fuelRequestId: matchedRequest.id,
    verifiedBy: operatorId,
    litersDispensed,
    auditMeta: { fuelRequestId: matchedRequest.id, vehicleId: matchedRequest.vehicle_id },
  });

  return dispense;
}

async function getDispenseById(dispenseId, user) {
  const dispense = await repo.findDispenseById(dispenseId);
  if (!dispense) {
    throw httpError('Dispense transaction not found.', 404, 'NOT_FOUND');
  }

  // Ownership: DRIVER must own the vehicle on the linked fuel_request
  if (user.role === 'DRIVER') {
    const vehicle = await fuelRepo.getVehicleWithPolicy(dispense.vehicle_id);
    if (!vehicle || vehicle.owner_id !== user.userId) {
      throw httpError('Access denied.', 403, 'FORBIDDEN');
    }
  }

  return dispense;
}

/**
 * previewDispense
 *
 * Performs the bcrypt OTP scan and returns a summary of the matched request
 * (vehicle plate, type, fuel type, requested liters, remaining daily quota)
 * WITHOUT writing any records. Used by the USSD confirmation step.
 *
 * Returns { matchedRequest, vehicleDetails, usedLiters, dailyLimit }
 * Throws with the same error codes as verifyAndDispense on failure.
 */
async function previewDispense(otpCode) {
  const pendingRequests = await repo.findPendingRequests();

  let matchedRequest = null;
  for (const req of pendingRequests) {
    const isMatch = await bcrypt.compare(String(otpCode), req.otp_code_hash);
    if (isMatch) { matchedRequest = req; break; }
  }

  if (!matchedRequest) {
    throw httpError('No matching pending fuel request found for this OTP.', 400, 'WRONG_CODE');
  }

  const now = new Date();
  if (new Date(matchedRequest.expires_at) < now) {
    throw httpError(`This OTP has expired.`, 400, 'EXPIRED');
  }

  // Fetch full vehicle details (type, fuel_type)
  const { rows: vRows } = await pool.query(
    'SELECT vehicle_type, fuel_type FROM vehicles WHERE id = $1',
    [matchedRequest.vehicle_id]
  );
  const vehicleDetails = vRows[0] || {};

  // Fetch quota info
  const vehicleWithPolicy = await fuelRepo.getVehicleWithPolicy(matchedRequest.vehicle_id);
  const dailyLimit = vehicleWithPolicy ? parseFloat(vehicleWithPolicy.daily_limit_liters) : null;
  const usedLiters = await fuelRepo.getUsedLitersToday(matchedRequest.vehicle_id);

  return { matchedRequest, vehicleDetails, usedLiters, dailyLimit };
}

module.exports = {
  verifyAndDispense,
  getDispenseById,
  previewDispense,
};
