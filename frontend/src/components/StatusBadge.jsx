import React from 'react';

/**
 * Unified StatusBadge component used across the entire dashboard.
 * Color map:
 * - OPEN, OK, RESOLVED -> badge-green
 * - CLOSED, INCOMPLETE, DISMISSED -> badge-gray
 * - OUT_OF_STOCK, FLAGGED -> badge-orange (amber)
 * - REVIEWED -> badge-blue
 * - SUSPENDED -> badge-red
 */
const COLOR_MAP = {
  OPEN: 'badge-green',
  OK: 'badge-green',
  RESOLVED: 'badge-green',

  CLOSED: 'badge-gray',
  INCOMPLETE: 'badge-gray',
  DISMISSED: 'badge-gray',

  OUT_OF_STOCK: 'badge-orange',
  FLAGGED: 'badge-orange',

  REVIEWED: 'badge-blue',

  SUSPENDED: 'badge-red',
};

export default function StatusBadge({ status, isStockOut = false, label }) {
  if (isStockOut) {
    return (
      <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <span>⚠</span>
        <span>{label || 'FALSE STOCK-OUT'}</span>
      </span>
    );
  }

  const normalized = (status || '').toUpperCase();
  const badgeClass = COLOR_MAP[normalized] || 'badge-gray';

  return (
    <span className={`badge ${badgeClass}`}>
      {label || status || '—'}
    </span>
  );
}
