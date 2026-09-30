'use strict';

const repo = require('./quota-policies.repository');

async function setQuotaPolicy(setBy, data) {
  const { vehicleType, dailyLimitLiters } = data;
  return await repo.upsertQuotaPolicy({ vehicleType, dailyLimitLiters, setBy });
}

async function getAllQuotaPolicies() {
  return await repo.getAllQuotaPolicies();
}

module.exports = {
  setQuotaPolicy,
  getAllQuotaPolicies,
};
