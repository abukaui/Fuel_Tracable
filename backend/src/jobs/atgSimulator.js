'use strict';

const cron = require('node-cron');
const pool = require('../db/pool');
const config = require('../config');

let isRunning = false;

async function simulateOneTank(tank) {
  const { rows: latestReading } = await pool.query(
    'SELECT volume_liters FROM atg_readings WHERE tank_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [tank.id]
  );

  const capacity = parseFloat(tank.capacity_liters);
  const currentVolume = latestReading.length > 0
    ? parseFloat(latestReading[0].volume_liters)
    : capacity * 0.6; // Start at 60% if no reading exists

  const deltaPercent = (Math.random() * 4 - 2) / 100; // +/- 2%
  let nextVolume = currentVolume + capacity * deltaPercent;
  nextVolume = Math.min(Math.max(nextVolume, 0), capacity);

  const tempC = Math.random() * 20 + 15; // 15 to 35

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
    const { rows: tanks } = await pool.query('SELECT id, capacity_liters FROM tanks');

    for (const tank of tanks) {
      try {
        await simulateOneTank(tank);
        succeeded++;
      } catch (err) {
        failed++;
        console.error(`[atgSimulator] Failed to simulate tank ${tank.id}:`, err.message);
        // intentionally no `continue`/`break` needed — just falls through to next iteration
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

module.exports = { start };