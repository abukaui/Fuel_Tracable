'use strict';

const express   = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const stationRoutes = require('./modules/stations/stations.routes');
const atgRoutes = require('./modules/atg/atg.routes');

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

/** Liveness probe — no DB call, no auth required */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/tanks', atgRoutes);
app.use('/api/reconciliations', require('./modules/reconciliation/reconciliation.routes'));
app.use('/api/vehicles', require('./modules/vehicles/vehicles.routes'));
app.use('/api/quota-policies', require('./modules/quota-policies/quota-policies.routes'));
app.use('/api/fuel-requests', require('./modules/fuel-requests/fuel-requests.routes'));

// ── Global error handler ──────────────────────────────────────────────────────
// Must be defined AFTER all routes (4-argument signature is required by Express).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.statusCode || 500;
  const message = err.message    || 'Internal server error.';

  // Log unexpected server errors but not deliberate 4xx responses.
  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ error: message });
});

module.exports = app;
