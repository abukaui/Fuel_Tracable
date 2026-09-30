'use strict';

const pool = require('../../db/pool');

async function createVehicle({ vid, plateNumber, ownerId, vehicleType }) {
  const query = `
    INSERT INTO vehicles (vid, plate_number, owner_id, vehicle_type)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await pool.query(query, [vid, plateNumber, ownerId, vehicleType]);
  return result.rows[0];
}

async function findByPlateNumber(plateNumber) {
  const query = `SELECT * FROM vehicles WHERE plate_number = $1;`;
  const result = await pool.query(query, [plateNumber]);
  return result.rows[0];
}

async function findById(id) {
  const query = `SELECT * FROM vehicles WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

module.exports = {
  createVehicle,
  findByPlateNumber,
  findById,
};
