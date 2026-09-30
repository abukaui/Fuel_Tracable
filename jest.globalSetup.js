'use strict';

/**
 * jest.globalSetup.js
 *
 * Runs ONCE before all test suites. Migrates the test schema so every
 * table exists before any test file imports modules that touch the DB.
 */

const migrateTestDb = require('./test/helpers/migrateTestDb');

module.exports = async function globalSetup() {
  await migrateTestDb();
};
