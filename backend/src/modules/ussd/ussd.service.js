'use strict';

const authRepo           = require('../auth/auth.repository');
const vehiclesService    = require('../vehicles/vehicles.service');
const fuelRequestsService = require('../fuel-requests/fuel-requests.service');
const fuelRequestsRepo   = require('../fuel-requests/fuel-requests.repository');
const stationsService    = require('../stations/stations.service');   // Day 6/7 reuse
const dispenseService    = require('../dispense/dispense.service');   // Day 11 reuse
const pool               = require('../../db/pool');

/**
 * Handle USSD callback
 * Returns a string prefixed with 'CON ' (session continues) or 'END ' (session over).
 * Routing is purely by role — no second endpoint needed.
 */
async function handleCallback({ sessionId, phoneNumber, text }) {
  const parts = text === '' ? [] : text.split('*');
  const level = parts.length;

  const user = await authRepo.findByPhone(phoneNumber);

  if (!user) {
    return `END Unregistered phone number.\nPlease register through the web app first.`;
  }

  if (user.role === 'DRIVER') {
    return handleDriverMenu(user, parts, level);
  }

  if (user.role === 'STATION_OPERATOR') {
    return handleOperatorMenu(user, parts, level);
  }

  return `END Your account role is not supported over USSD.`;
}

// ── DRIVER MENU ──────────────────────────────────────────────────────────────

async function handleDriverMenu(user, parts, level) {
  if (level === 0) {
    return `CON Welcome, ${user.full_name.split(' ')[0]}
1. Register Vehicle
2. Request Fuel
3. Check Quota Balance
4. Report Station`;
  }

  const option = parts[0];

  if (option === '1') {
    if (level === 1) return `CON Enter Vehicle Plate Number:`;
    if (level === 2) return `CON Select Vehicle Type:\n1. PRIVATE\n2. TAXI\n3. COMMERCIAL`;
    if (level === 3) return `CON Select Gas Type:\n1. PETROL\n2. DIESEL`;
    if (level === 4) {
      const plateNumber   = parts[1];
      const typeSelection = parts[2];
      const fuelSelection = parts[3];

      const vehicleType = typeSelection === '2' ? 'TAXI'
                        : typeSelection === '3' ? 'COMMERCIAL'
                        : 'PRIVATE';
      const fuelType = fuelSelection === '2' ? 'DIESEL' : 'PETROL';

      try {
        const vehicle = await vehiclesService.registerVehicle(user.id, { plateNumber, vehicleType, fuelType });
        return `END Registered successfully.\nYour VID is: ${vehicle.vid}`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  }

  else if (option === '2') {
    const { rows: userVehicles } = await pool.query(
      'SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1', [user.id]
    );
    if (userVehicles.length === 0) {
      return `END You must register a vehicle first. Dial again and select 1.`;
    }
    const vehicleId = userVehicles[0].id;

    if (level === 1) return `CON Enter Station ID (SID):`;
    if (level === 2) return `CON Enter requested Liters:`;
    if (level === 3) {
      const sid             = parts[1];
      const requestedLiters = parseFloat(parts[2]);

      if (isNaN(requestedLiters) || requestedLiters <= 0) {
        return `END Invalid liters amount.`;
      }

      const { rows: stations } = await pool.query(
        'SELECT id, current_status FROM stations WHERE sid = $1', [sid]
      );
      if (stations.length === 0) return `END Station not found.`;
      if (stations[0].current_status === 'SUSPENDED') {
        return `END Station is currently suspended. Fuel request cannot be processed.`;
      }

      try {
        const result = await fuelRequestsService.requestFuel(user.id, {
          vehicleId,
          stationId: stations[0].id,
          requestedLiters
        });
        return `END Request successful.\nYour code is: ${result.otpCode}\nValid for 30 min.`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  }

  else if (option === '3') {
    const { rows: userVehicles } = await pool.query(
      'SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1', [user.id]
    );
    if (userVehicles.length === 0) {
      return `END You must register a vehicle first. Dial again and select 1.`;
    }
    const vehicleId = userVehicles[0].id;

    try {
      const vehicle = await fuelRequestsRepo.getVehicleWithPolicy(vehicleId);
      if (!vehicle || !vehicle.daily_limit_liters) {
        return `END No quota policy assigned to your vehicle type yet.`;
      }
      const dailyLimit = parseFloat(vehicle.daily_limit_liters);
      const usedLiters = await fuelRequestsRepo.getUsedLitersToday(vehicleId);
      const remaining  = Math.max(0, dailyLimit - usedLiters);
      return `END You have ${remaining.toFixed(2)} liters remaining today.`;
    } catch (err) {
      return `END Error: ${err.message}`;
    }
  }

  else if (option === '4') {
    if (level === 1) return `CON Enter Station ID (SID):`;
    if (level === 2) return `CON Select problem:\n1. Refused Sale\n2. False Stock-Out Suspected\n3. Other`;
    if (level === 3) return `CON Describe the problem:`;
    if (level === 4) {
      const sid = parts[1];
      const categoryIndex = parts[2];
      const description = parts[3];

      const catMap = { '1': 'Refused Sale', '2': 'False Stock-Out Suspected', '3': 'Other' };
      const category = catMap[categoryIndex];
      if (!category) return `END Invalid category selection.`;

      const { rows: stations } = await pool.query(
        'SELECT id FROM stations WHERE sid = $1', [sid]
      );
      if (stations.length === 0) return `END Unable to file complaint. Please check the Station ID and try again.`;

      const complaintsService = require('../complaints/complaints.service');
      try {
        await complaintsService.createComplaint(user.id, {
          stationId: stations[0].id,
          category,
          description
        });
        return `END Complaint filed. Thank you.`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  }

  return `END Invalid option. Please dial again.`;
}

// ── STATION OPERATOR MENU ────────────────────────────────────────────────────
//
// KNOWN SIMPLIFICATION: The operator types their Station SID manually each
// session because there is no operator-to-station assignment table yet. This
// is intentional for now — not a bug. A future migration will add that table.

async function handleOperatorMenu(user, parts, level) {
  if (level === 0) {
    return `CON Welcome, Operator\n1. Declare Station Status\n2. Verify Code & Dispense`;
  }

  const option = parts[0];

  // ── Option 1: Declare Station Status ────────────────────────────────────────
  if (option === '1') {
    if (level === 1) return `CON Enter your Station ID (SID):`;
    if (level === 2) {
      return `CON Select new status:\n1. OPEN\n2. CLOSED\n3. OUT_OF_STOCK`;
    }
    if (level === 3) {
      const sid          = parts[1];
      const statusChoice = parts[2];

      const statusMap = { '1': 'OPEN', '2': 'CLOSED', '3': 'OUT_OF_STOCK' };
      const newStatus = statusMap[statusChoice];
      if (!newStatus) return `END Invalid status selection.`;

      // Resolve SID → UUID
      const { rows: stations } = await pool.query(
        'SELECT id FROM stations WHERE sid = $1', [sid]
      );
      if (stations.length === 0) return `END Station not found.`;
      const stationId = stations[0].id;

      try {
        // Reuses Day 6 updateStatus, which also triggers Day 7 stock-out check
        await stationsService.updateStatus(stationId, { status: newStatus });

        if (newStatus === 'OUT_OF_STOCK') {
          // Check if a FLAGGED reconciliation row was just created
          const { rows: flagged } = await pool.query(
            `SELECT id FROM reconciliations
             WHERE station_id = $1 AND stock_out_flag = true AND status = 'FLAGGED'
             ORDER BY created_at DESC LIMIT 1`,
            [stationId]
          );
          if (flagged.length > 0) {
            return `END Status updated to OUT_OF_STOCK.\nNOTE: This has been flagged for review.`;
          }
        }

        return `END Status updated to ${newStatus}.`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  }

  // ── Option 2: Verify Code & Dispense ─────────────────────────────────────────
  else if (option === '2') {
    if (level === 1) return `CON Enter the driver's OTP code:`;
    if (level === 2) return `CON Enter vehicle plate number:`;
    if (level === 3) return `CON Enter liters dispensed:`;

    // Level 4: show vehicle summary + quota, ask for confirmation
    if (level === 4) {
      const otpCode         = parts[1];
      const plateNumber     = parts[2];
      const litersDispensed = parseFloat(parts[3]);

      if (isNaN(litersDispensed) || litersDispensed <= 0) {
        return `END Invalid liters amount.`;
      }

      try {
        const { matchedRequest, vehicleDetails, usedLiters, dailyLimit } =
          await dispenseService.previewDispense(otpCode);

        // Plate mismatch check at preview stage too
        const submittedPlate = plateNumber.trim().toUpperCase();
        const vehiclePlate   = matchedRequest.plate_number.trim().toUpperCase();
        if (submittedPlate !== vehiclePlate) {
          return `END Plate number does not match. Please verify the vehicle.`;
        }

        const remaining = dailyLimit != null
          ? Math.max(0, dailyLimit - usedLiters - litersDispensed).toFixed(1)
          : 'N/A';

        return `CON --- Vehicle Info ---
Plate: ${matchedRequest.plate_number}
Type: ${vehicleDetails.vehicle_type || 'N/A'}
Gas: ${vehicleDetails.fuel_type || 'N/A'}
Requested: ${matchedRequest.requested_liters}L
Dispensing: ${litersDispensed}L
After quota: ${remaining}L left

1. Confirm Dispense
2. Cancel`;
      } catch (err) {
        const codeMessages = {
          WRONG_CODE: 'Code not recognised. Please check and try again.',
          EXPIRED:    'Code has expired. Ask the driver to request a new code.',
        };
        return `END ${codeMessages[err.code] || err.message}`;
      }
    }

    // Level 5: operator confirms or cancels
    if (level === 5) {
      const confirm = parts[4];
      if (confirm !== '1') return `END Dispense cancelled.`;

      const otpCode         = parts[1];
      const plateNumber     = parts[2];
      const litersDispensed = parseFloat(parts[3]);

      try {
        await dispenseService.verifyAndDispense(user.id, {
          otpCode,
          plateNumber,
          litersDispensed
        });
        return `END Dispense authorized.\n${litersDispensed}L dispensed successfully.`;
      } catch (err) {
        const codeMessages = {
          WRONG_CODE:     'Code not recognised. Please check and try again.',
          ALREADY_USED:   'Code already used. Ask the driver to request a new code.',
          EXPIRED:        'Code has expired. Ask the driver to request a new code.',
          PLATE_MISMATCH: 'Plate number does not match. Please verify the vehicle.',
          OVER_DISPENSED: 'Liters entered exceed the approved amount.',
        };
        return `END ${codeMessages[err.code] || err.message}`;
      }
    }
  }

  return `END Invalid option. Please dial again.`;
}

module.exports = {
  handleCallback
};
