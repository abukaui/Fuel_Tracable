/**
 * Centralized formatting utilities for numbers, dates, times, and reconciliation equations.
 */

export function formatNumber(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatLiters(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${formatNumber(val, decimals)} L`;
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString();
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const formatted = d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return tz ? `${formatted} (${tz})` : formatted;
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Formats reconciliation math as a clear arithmetic equation.
 * E.g. "Tank dropped 500.0 L − verified sales 300.0 L = 200.0 L unaccounted"
 */
export function formatReconciliationEquation(tankDelta, verifiedSales, variance) {
  if (tankDelta === null || tankDelta === undefined) {
    return 'Calculation incomplete (insufficient telemetry data in window)';
  }

  const deltaNum = parseFloat(tankDelta);
  const salesNum = parseFloat(verifiedSales) || 0;
  const varNum = parseFloat(variance) || 0;

  if (deltaNum >= 0) {
    return `Tank refilled by +${formatNumber(deltaNum)} L (no drop detected; variance is 0.0 L)`;
  }

  const drop = Math.abs(deltaNum);
  return `Tank dropped ${formatNumber(drop)} L − verified sales ${formatNumber(salesNum)} L = ${formatNumber(varNum)} L unaccounted`;
}
