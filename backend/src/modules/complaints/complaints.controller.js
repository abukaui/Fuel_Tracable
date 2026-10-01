'use strict';

const service = require('./complaints.service');

async function createComplaint(req, res, next) {
  try {
    const driverId = req.user.userId;
    const complaint = await service.createComplaint(driverId, req.body);
    return res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
}

async function getComplaints(req, res, next) {
  try {
    const filters = {
      stationId: req.query.stationId,
      status: req.query.status
    };
    const complaints = await service.getComplaints(filters);
    return res.json({ complaints });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const complaint = await service.updateStatus(id, status);
    return res.json({ complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createComplaint,
  getComplaints,
  updateStatus
};
