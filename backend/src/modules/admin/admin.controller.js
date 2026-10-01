'use strict';

const service = require('./admin.service');

async function getAuditLogs(req, res, next) {
  try {
    const filters = {
      actorId: req.query.actorId,
      entityType: req.query.entityType,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
      offset: req.query.offset
    };
    const logs = await service.getAuditLogs(filters);
    return res.json({ logs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs
};
