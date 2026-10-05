'use strict';

const pool = require('../db/pool');

async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      INSERT INTO idempotency_keys (key, status)
      VALUES ($1, 'PROCESSING')
      ON CONFLICT (key) DO NOTHING
      RETURNING *;
    `, [idempotencyKey]);

    if (rows.length === 0) {
      const { rows: existing } = await client.query(`SELECT * FROM idempotency_keys WHERE key = $1`, [idempotencyKey]);
      const record = existing[0];
      if (record.status === 'PROCESSING') {
        return res.status(409).json({ error: 'Duplicate request already in progress.' });
      } else if (record.status === 'COMPLETED') {
        res.status(record.response_status);
        res.set('Content-Type', 'application/json');
        return res.send(record.response_body);
      }
    }

    const originalSend = res.send.bind(res);
    res.send = function (body) {
      pool.query(`
        UPDATE idempotency_keys 
        SET status = 'COMPLETED', response_status = $1, response_body = $2 
        WHERE key = $3
      `, [res.statusCode, body, idempotencyKey]).catch(() => {});
      return originalSend(body);
    };

    next();
  } catch (err) {
    // If idempotency_keys table doesn't exist yet, degrade gracefully
    console.warn('[idempotency] middleware error, skipping:', err.message);
    next();
  } finally {
    client.release();
  }
}

module.exports = idempotencyMiddleware;
