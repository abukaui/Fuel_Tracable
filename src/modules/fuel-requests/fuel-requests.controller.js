'use strict';

const service = require('./fuel-requests.service');

async function requestFuel(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await service.requestFuel(userId, req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getFuelRequestById(req, res, next) {
  try {
    const { id } = req.params;
    const request = await service.getFuelRequestById(id, req.user);
    return res.json({ fuelRequest: request });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requestFuel,
  getFuelRequestById
};
