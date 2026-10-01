'use strict';

const pool = require('../../db/pool');

async function createStation({ sid, name, location }) {
  const { rows } = await pool.query(
    `INSERT INTO stations (sid, name, location, current_status)
     VALUES ($1, $2, $3, 'CLOSED')
     RETURNING id, sid, name, location, current_status, created_at`,
    [sid, name, location]
  );
  return rows[0];
}

async function findStationBySid(sid) {
  const { rows } = await pool.query(
    `SELECT id, sid, name, location, current_status, created_at
     FROM stations
     WHERE sid = $1`,
    [sid]
  );
  return rows[0] || null;
}

async function findAllStations() {
  const { rows } = await pool.query(
    `SELECT id, sid, name, location, current_status, created_at
     FROM stations
     ORDER BY created_at DESC`
  );
  return rows;
}

async function findStationById(id) {
  const { rows } = await pool.query(
    `SELECT id, sid, name, location, current_status, created_at
     FROM stations
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findTanksByStationId(stationId) {
  const { rows } = await pool.query(
    `SELECT id, station_id, capacity_liters, product_type
     FROM tanks
     WHERE station_id = $1
     ORDER BY id ASC`,
    [stationId]
  );
  return rows;
}

async function createTank({ stationId, capacityLiters, productType }) {
  const { rows } = await pool.query(
    `INSERT INTO tanks (station_id, capacity_liters, product_type)
     VALUES ($1, $2, $3)
     RETURNING id, station_id, capacity_liters, product_type`,
    [stationId, capacityLiters, productType]
  );
  return rows[0];
}

async function updateStationStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE stations
     SET current_status = $1, status_declared_at = now()
     WHERE id = $2
     RETURNING id, sid, name, location, current_status, status_declared_at, created_at`,
    [status, id]
  );
  return rows[0] || null;
}

async function findStationForOperator(operatorId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.sid, s.name, s.location, s.current_status, s.created_at
     FROM stations s
     JOIN users u ON u.station_id = s.id
     WHERE u.id = $1`,
    [operatorId]
  );
  return rows; // Return array to match findAllStations structure
}

module.exports = {
  createStation,
  findStationBySid,
  findAllStations,
  findStationById,
  findTanksByStationId,
  createTank,
  updateStationStatus,
  findStationForOperator,
};
