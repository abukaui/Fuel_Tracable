-- 016_add_unique_to_reconciliations.sql
-- Deduplicate any existing duplicate reconciliations keeping the latest row
DELETE FROM reconciliations r1
WHERE r1.id IN (
  SELECT r2.id
  FROM reconciliations r2
  JOIN reconciliations r3 ON r2.station_id = r3.station_id
    AND r2.period_start = r3.period_start
    AND r2.period_end = r3.period_end
    AND (r2.created_at < r3.created_at OR (r2.created_at = r3.created_at AND r2.id < r3.id))
);

-- Create unique index to enforce single reconciliation per station and time window
CREATE UNIQUE INDEX IF NOT EXISTS uq_reconciliations_station_period
  ON reconciliations (station_id, period_start, period_end);
