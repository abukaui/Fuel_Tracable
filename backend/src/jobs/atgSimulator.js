'use strict';

const cron = require('node-cron');
const pool = require('../db/pool');
const config = require('../config');

async function runSimulation() {
  const client = await pool.connect();
  try {
    const { rows: tanks } = await client.query('SELECT id, capacity_liters FROM tanks');

    for (const tank of tanks) {
      const { rows: latestReading } = await client.query(
        'SELECT volume_liters FROM atg_readings WHERE tank_id = $1 ORDER BY recorded_at DESC LIMIT 1',
        [tank.id]
      );

      let currentVolume = latestReading.length > 0 
        ? parseFloat(latestReading[0].volume_liters) 
        : parseFloat(tank.capacity_liters) * 0.6; // Start at 60% if no reading exists

      const capacity = parseFloat(tank.capacity_liters);
      const deltaPercent = (Math.random() * 4 - 2) / 100; // +/- 2%
      
      let nextVolume = currentVolume + (capacity * deltaPercent);
      if (nextVolume < 0) nextVolume = 0;
      if (nextVolume > capacity) nextVolume = capacity;

      const tempC = Math.random() * 20 + 15; // 15 to 35

      await client.query(
        `INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source)
         VALUES ($1, $2, $3, 'SIMULATED')`,
        [tank.id, nextVolume.toFixed(2), tempC.toFixed(2)]
      );
    }
  } catch (err) {
    console.error('[atgSimulator] Error running simulation:', err);
  } finally {
    client.release();
  }
}

function start() {
  console.log(`[atgSimulator] Starting with cron: ${config.atgSimulatorIntervalCron}`);
  cron.schedule(config.atgSimulatorIntervalCron, () => {
    runSimulation();
  });
}

module.exports = { start };
