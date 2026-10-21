'use strict';

const cron = require('node-cron');
const pool = require('../db/pool');
const config = require('../config');

let isRunning = false;

/**
 * Simulates a single tank's telemetry reading.
 * - First reading: 60% of capacity.
 * - Subsequent readings:
 *     - If volume < 15% of capacity: simulates a tanker refill to 90% capacity.
 *     - Otherwise: volume = last volume - liters sold at station since last reading + sensor noise (+/- 3L).
 * - Clamped to [0, capacity].
 *
 * NOTE ON MULTI-TANK ATTRIBUTION:
 * When a station has multiple tanks sharing the same product_type (e.g. two PETROL tanks),
 * dispense transactions record vehicle fuel type and station ID, but do not record the physical
 * tank/nozzle plumbed to the dispenser. In such cases, sales are split equally across matching tanks.
 */
async function simulateOneTank(tank) {
  const { rows: latestReading } = await pool.query(
    'SELECT volume_liters, recorded_at FROM atg_readings WHERE tank_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [tank.id]
  );

  const capacity = parseFloat(tank.capacity_liters);

  // First reading for a tank: 60% of capacity
  if (latestReading.length === 0) {
    const initialVolume = capacity * 0.6;
    const tempC = Math.random() * 20 + 15; // 15 to 35 C
    await pool.query(
      `INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source)
       VALUES ($1, $2, $3, 'SIMULATED')`,
      [tank.id, initialVolume.toFixed(2), tempC.toFixed(2)]
    );
    return;
  }

  const currentVolume = parseFloat(latestReading[0].volume_liters);
  const lastRecordedAt = latestReading[0].recorded_at;

  let nextVolume;

  // Refill check: if volume < 15% of capacity, simulate a tanker refill to 90%
  if (currentVolume < capacity * 0.15) {
    nextVolume = capacity * 0.9;
  } else {
    // Query verified sales for this station and product_type since last reading
    const { rows: salesRows } = await pool.query(
      `SELECT COALESCE(SUM(dt.liters_dispensed), 0) AS sold_liters
       FROM dispense_transactions dt
       JOIN fuel_requests fr ON fr.id = dt.fuel_request_id
       JOIN vehicles v ON v.id = fr.vehicle_id
       WHERE fr.station_id = $1
         AND dt.occurred_at > $2
         AND (v.fuel_type = $3 OR $3 IS NULL)`,
      [tank.station_id, lastRecordedAt, tank.product_type]
    );

    const totalSold = parseFloat(salesRows[0].sold_liters) || 0;

    // Check if station has multiple tanks for this product type to split sold volume
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS count FROM tanks WHERE station_id = $1 AND product_type = $2',
      [tank.station_id, tank.product_type]
    );
    const tankCount = parseInt(countRows[0]?.count || '1', 10) || 1;
    const soldForTank = totalSold / tankCount;

    // Sensor noise: approximately +/- 3 liters
    const sensorNoise = Math.random() * 6 - 3;

    nextVolume = currentVolume - soldForTank + sensorNoise;
  }

  // Clamp to [0, capacity]
  nextVolume = Math.min(Math.max(nextVolume, 0), capacity);

  const tempC = Math.random() * 20 + 15; // 15 to 35 C

  await pool.query(
    `INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source)
     VALUES ($1, $2, $3, 'SIMULATED')`,
    [tank.id, nextVolume.toFixed(2), tempC.toFixed(2)]
  );
}

async function runSimulation() {
  if (isRunning) {
    console.warn('[atgSimulator] Previous run still in progress, skipping this tick.');
    return;
  }
  isRunning = true;

  let succeeded = 0;
  let failed = 0;

  try {
    const { rows: tanks } = await pool.query('SELECT id, station_id, capacity_liters, product_type FROM tanks');

    for (const tank of tanks) {
      try {
        await simulateOneTank(tank);
        succeeded++;
      } catch (err) {
        failed++;
        console.error(`[atgSimulator] Failed to simulate tank ${tank.id}:`, err.message);
      }
    }

    console.log(`[atgSimulator] Cycle complete: ${succeeded} updated, ${failed} failed, ${tanks.length} total.`);
  } catch (err) {
    console.error('[atgSimulator] Fatal error fetching tank list:', err.message);
  } finally {
    isRunning = false;
  }
}

function start() {
  console.log(`[atgSimulator] Starting with cron: ${config.atgSimulatorIntervalCron}`);
  cron.schedule(config.atgSimulatorIntervalCron, () => {
    runSimulation();
  });
}

module.exports = { start, runSimulation };