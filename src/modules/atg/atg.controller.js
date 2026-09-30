'use strict';

const service = require('./atg.service');

async function getReadings(req, res, next) {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    const readings = await service.getTankReadings(id, from, to);
    return res.json({ readings });
  } catch (err) {
    next(err);
  }
}

async function getLatestReading(req, res, next) {
  try {
    const { id } = req.params;
    const reading = await service.getLatestTankReading(id);
    return res.json({ reading });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReadings,
  getLatestReading,
};
