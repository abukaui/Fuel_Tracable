'use strict';

const service = require('./quota-policies.service');

async function setQuotaPolicy(req, res, next) {
  try {
    const setBy = req.user.userId;
    const policy = await service.setQuotaPolicy(setBy, req.body);
    return res.status(201).json({ policy });
  } catch (err) {
    next(err);
  }
}

async function getAllQuotaPolicies(req, res, next) {
  try {
    const policies = await service.getAllQuotaPolicies();
    return res.json({ policies });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setQuotaPolicy,
  getAllQuotaPolicies,
};
