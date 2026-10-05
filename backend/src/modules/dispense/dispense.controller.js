'use strict';

const service = require('./dispense.service');

async function verifyAndDispense(req, res, next) {
  try {
    const operatorId = req.user.userId;
    const dispense = await service.verifyAndDispense(operatorId, req.body);
    return res.status(201).json({ dispense });
  } catch (err) {
    // Attach the machine-readable code to the JSON response as well
    if (err.code && err.statusCode) {
      err.body = { error: err.message, code: err.code };
    }
    next(err);
  }
}

async function getDispenseById(req, res, next) {
  try {
    const dispense = await service.getDispenseById(req.params.id, req.user);
    return res.json({ dispense });
  } catch (err) {
    next(err);
  }
}

async function previewDispense(req, res, next) {
  try {
    const { otpCode } = req.body;
    const preview = await service.previewDispense(otpCode);
    return res.json({ preview });
  } catch (err) {
    if (err.code && err.statusCode) {
      err.body = { error: err.message, code: err.code };
    }
    next(err);
  }
}

async function getStationDispenses(req, res, next) {
  try {
    const { id } = req.params;
    const repo = require('./dispense.repository');
    const dispenses = await repo.findDispensesByStationId(id);
    return res.json({ dispenses });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifyAndDispense,
  getDispenseById,
  previewDispense,
  getStationDispenses,
};
