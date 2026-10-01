'use strict';

const repo = require('./complaints.repository');
const pool = require('../../db/pool');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createComplaint(driverId, { stationId, category, description }) {
  if (!stationId || !description) {
    throw httpError('stationId and description are required', 400);
  }

  // Get first vehicle
  const { rows: vehicles } = await pool.query('SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1', [driverId]);
  if (vehicles.length === 0) {
    throw httpError('No registered vehicle found for driver', 400);
  }
  const vehicleId = vehicles[0].id;

  // Validate station
  const { rows: stations } = await pool.query('SELECT id FROM stations WHERE id = $1', [stationId]);
  if (stations.length === 0) {
    throw httpError('Station not found', 404);
  }

  const complaint = await repo.createComplaint({ vehicleId, stationId, category, description });
  return complaint;
}

async function getComplaints(filters) {
  return await repo.findAllComplaints(filters);
}

async function updateStatus(id, status) {
  if (status !== 'REVIEWED' && status !== 'DISMISSED') {
    throw httpError('Invalid status. Must be REVIEWED or DISMISSED', 400);
  }

  const complaint = await repo.findComplaintById(id);
  if (!complaint) {
    throw httpError('Complaint not found', 404);
  }

  if (complaint.status !== 'OPEN') {
    throw httpError('Can only update status of OPEN complaints', 400);
  }

  const updated = await repo.updateStatus(id, status);
  return updated;
}

module.exports = {
  createComplaint,
  getComplaints,
  updateStatus
};
