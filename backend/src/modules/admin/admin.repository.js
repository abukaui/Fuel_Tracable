'use strict';

const pool = require('../../db/pool');

async function findAuditLogs(filters = {}) {
  let query = `
    SELECT al.*, u.full_name as actor_name, u.role as actor_role
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_id = u.id
    WHERE 1=1
  `;
  const values = [];
  
  if (filters.actorId) {
    values.push(filters.actorId);
    query += ` AND al.actor_id = $${values.length}`;
  }
  
  if (filters.entityType) {
    values.push(filters.entityType);
    query += ` AND al.entity_type = $${values.length}`;
  }

  if (filters.from) {
    values.push(filters.from);
    query += ` AND al.occurred_at >= $${values.length}`;
  }

  if (filters.to) {
    values.push(filters.to);
    query += ` AND al.occurred_at <= $${values.length}`;
  }

  query += ` ORDER BY al.occurred_at DESC`;

  const limit = parseInt(filters.limit, 10) || 20;
  const offset = parseInt(filters.offset, 10) || 0;

  values.push(Math.min(limit, 100)); // cap at 100
  query += ` LIMIT $${values.length}`;

  values.push(offset);
  query += ` OFFSET $${values.length}`;

  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = {
  findAuditLogs
};
