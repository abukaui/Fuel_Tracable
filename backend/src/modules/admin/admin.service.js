'use strict';

const repo = require('./admin.repository');

async function getAuditLogs(filters) {
  return await repo.findAuditLogs(filters);
}

module.exports = {
  getAuditLogs
};
