'use strict';

const pool = require('../../db/pool');

async function createComplaint({ vehicleId, stationId, category, description }) {
  const query = `
    INSERT INTO driver_complaints (vehicle_id, station_id, category, description, status)
    VALUES ($1, $2, $3, $4, 'OPEN')
    RETURNING *;
  `;
  const result = await pool.query(query, [vehicleId, stationId, category, description]);
  return result.rows[0];
}

async function findAllComplaints(filters = {}) {
  let query = `
    SELECT c.*, s.name as station_name, s.sid as station_sid
    FROM driver_complaints c
    JOIN stations s ON c.station_id = s.id
    WHERE 1=1
  `;
  const values = [];

  if (filters.stationId) {
    values.push(filters.stationId);
    query += ` AND c.station_id = $${values.length}`;
  }

  if (filters.status) {
    values.push(filters.status);
    query += ` AND c.status = $${values.length}`;
  }

  query += ` ORDER BY c.created_at DESC`;
  const result = await pool.query(query, values);
  return result.rows;
}

async function findComplaintById(id) {
  const query = `SELECT * FROM driver_complaints WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function updateStatus(id, status) {
  const query = `
    UPDATE driver_complaints
    SET status = $1
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
}

module.exports = {
  createComplaint,
  findAllComplaints,
  findComplaintById,
  updateStatus
};
