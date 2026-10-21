'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const config = require('../../config');
const pool = require('../../db/pool');

const router = Router();

// Enabled ONLY when ENABLE_DEMO_TOOLS=true, otherwise return 404
router.use((_req, res, next) => {
  if (!config.enableDemoTools) {
    return res.status(404).json({ error: 'Demo tools are disabled.' });
  }
  next();
});

router.use(authenticate);

/**
 * POST /api/internal/atg/inject-loss
 * Body: { tankId: string, liters: number }
 * Role: ADMIN only
 */
router.post('/inject-loss', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { tankId, liters } = req.body;

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required.' });
    }
    const lossLiters = parseFloat(liters);
    if (isNaN(lossLiters) || lossLiters <= 0) {
      return res.status(400).json({ error: 'liters must be a positive number.' });
    }

    // Verify tank exists
    const { rows: tankRows } = await pool.query(
      'SELECT id, capacity_liters FROM tanks WHERE id = $1',
      [tankId]
    );
    if (tankRows.length === 0) {
      return res.status(404).json({ error: 'Tank not found.' });
    }

    const capacity = parseFloat(tankRows[0].capacity_liters);

    // Get latest reading for tank
    const { rows: latestReading } = await pool.query(
      'SELECT volume_liters FROM atg_readings WHERE tank_id = $1 ORDER BY recorded_at DESC LIMIT 1',
      [tankId]
    );

    const currentVolume = latestReading.length > 0
      ? parseFloat(latestReading[0].volume_liters)
      : capacity * 0.6;

    const newVolume = Math.max(currentVolume - lossLiters, 0);

    // Insert new reading with loss injected, source='SIMULATED'
    const { rows: insertedReading } = await pool.query(
      `INSERT INTO atg_readings (tank_id, volume_liters, temperature_c, source, recorded_at)
       VALUES ($1, $2, 25.0, 'SIMULATED', now())
       RETURNING *`,
      [tankId, newVolume.toFixed(2)]
    );

    // Write audit log entry (action='DEMO_LOSS_INJECTED')
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'DEMO_LOSS_INJECTED', 'tanks', $2, $3)`,
      [
        req.user.userId,
        tankId,
        JSON.stringify({
          lossLiters,
          previousVolume: currentVolume,
          newVolume,
        }),
      ]
    );

    return res.status(201).json({
      message: `Injected loss of ${lossLiters}L on tank ${tankId}.`,
      reading: insertedReading[0],
      previousVolume,
      newVolume,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
