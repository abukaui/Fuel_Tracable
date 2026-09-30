'use strict';

const authRepo = require('../auth/auth.repository');
const vehiclesRepo = require('../vehicles/vehicles.repository');
const vehiclesService = require('../vehicles/vehicles.service');
const fuelRequestsService = require('../fuel-requests/fuel-requests.service');
const fuelRequestsRepo = require('../fuel-requests/fuel-requests.repository');
const pool = require('../../db/pool');

/**
 * Handle USSD callback
 * Returning a string prefixed with 'CON ' means continue session, 'END ' means end it.
 */
async function handleCallback({ sessionId, phoneNumber, text }) {
  const parts = text === '' ? [] : text.split('*');
  const level = parts.length;

  const user = await authRepo.findByPhone(phoneNumber);
  
  if (!user) {
    return `END Unregistered phone number.\nPlease register through the web app first.`;
  }

  // Today we only handle DRIVER menus.
  if (user.role === 'DRIVER') {
    return handleDriverMenu(user, parts, level);
  } else {
    // Station operator menu is deferred to Day 15
    return `END Station Operator USSD menu is under construction.`;
  }
}

async function handleDriverMenu(user, parts, level) {
  if (level === 0) {
    return `CON Welcome, ${user.full_name.split(' ')[0]}
1. Register Vehicle
2. Request Fuel
3. Check Quota Balance`;
  }

  const option = parts[0];

  if (option === '1') {
    // Register Vehicle
    if (level === 1) {
      return `CON Enter Vehicle Plate Number:`;
    } else if (level === 2) {
      return `CON Select Vehicle Type:
1. PRIVATE
2. TAXI
3. COMMERCIAL`;
    } else if (level === 3) {
      return `CON Select Gas Type:
1. PETROL
2. DIESEL`;
    } else if (level === 4) {
      const plateNumber = parts[1];
      const typeSelection = parts[2];
      const fuelSelection = parts[3];
      
      let vehicleType = 'PRIVATE';
      if (typeSelection === '2') vehicleType = 'TAXI';
      if (typeSelection === '3') vehicleType = 'COMMERCIAL';

      let fuelType = 'PETROL';
      if (fuelSelection === '2') fuelType = 'DIESEL';

      try {
        const vehicle = await vehiclesService.registerVehicle(user.id, { plateNumber, vehicleType, fuelType });
        return `END Registered successfully.\nYour VID is: ${vehicle.vid}`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  } 
  
  else if (option === '2') {
    // Request Fuel
    
    // Check if they have a vehicle first
    const { rows: userVehicles } = await pool.query('SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1', [user.id]);
    if (userVehicles.length === 0) {
      return `END You must register a vehicle first. Dial again and select 1.`;
    }
    const vehicleId = userVehicles[0].id;

    if (level === 1) {
      return `CON Enter Station ID (SID):`;
    } else if (level === 2) {
      return `CON Enter requested Liters:`;
    } else if (level === 3) {
      const sid = parts[1];
      const litersStr = parts[2];
      const requestedLiters = parseFloat(litersStr);
      
      if (isNaN(requestedLiters) || requestedLiters <= 0) {
        return `END Invalid liters amount.`;
      }

      // We need station internal UUID from the SID
      const { rows: stations } = await pool.query('SELECT id FROM stations WHERE sid = $1', [sid]);
      if (stations.length === 0) {
        return `END Station not found.`;
      }
      const stationId = stations[0].id;

      try {
        const result = await fuelRequestsService.requestFuel(user.id, {
          vehicleId,
          stationId,
          requestedLiters
        });
        return `END Request successful.\nYour code is: ${result.otpCode}\nValid for 30 min.`;
      } catch (err) {
        return `END Error: ${err.message}`;
      }
    }
  } 
  
  else if (option === '3') {
    // Check Quota Balance
    const { rows: userVehicles } = await pool.query('SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1', [user.id]);
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
      const remaining = Math.max(0, dailyLimit - usedLiters);

      return `END You have ${remaining.toFixed(2)} liters remaining today.`;
    } catch (err) {
      return `END Error: ${err.message}`;
    }
  }

  return `END Invalid option. Please dial again.`;
}

module.exports = {
  handleCallback
};
