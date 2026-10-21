import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatLiters,
  formatRelativeTime,
  formatReconciliationEquation,
} from '../utils/formatters';

describe('formatters', () => {
  describe('formatNumber and formatLiters', () => {
    it('formats numbers with 1 decimal by default and thousand separators', () => {
      expect(formatNumber(1234.567)).toBe('1,234.6');
      expect(formatLiters(1234.567)).toBe('1,234.6 L');
    });

    it('returns — for null or undefined', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatLiters(undefined)).toBe('—');
      expect(formatNumber(NaN)).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns relative intervals correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(new Date(now - 10000))).toBe('just now');
      expect(formatRelativeTime(new Date(now - 120000))).toBe('2 min ago');
      expect(formatRelativeTime(new Date(now - 3700000))).toBe('1 hour ago');
      expect(formatRelativeTime(null)).toBe('—');
    });
  });

  describe('formatReconciliationEquation', () => {
    it('formats a normal tank drop equation', () => {
      const eq = formatReconciliationEquation(-500, 300, 200);
      expect(eq).toBe('Tank dropped 500.0 L − verified sales 300.0 L = 200.0 L unaccounted');
    });

    it('handles refills or incomplete data', () => {
      expect(formatReconciliationEquation(null, 100, 0)).toBe(
        'Calculation incomplete (insufficient telemetry data in window)'
      );
      expect(formatReconciliationEquation(150, 0, 0)).toContain('Tank refilled by +150.0 L');
    });
  });
});
