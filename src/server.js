'use strict';

const config = require('./config');
const app = require('./app');
const atgSimulator = require('./jobs/atgSimulator');
const reconciliationJob = require('./jobs/reconciliation');

app.listen(config.port, () => {
  console.log(`[server] ✓ Running on http://localhost:${config.port}`);
  console.log(`[server]   Environment: ${config.nodeEnv}`);
  atgSimulator.start();
  reconciliationJob.start();
});
