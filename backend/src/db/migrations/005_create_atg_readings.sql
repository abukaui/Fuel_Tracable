-- 005_create_atg_readings.sql
-- Depends on: 004 (tanks)

CREATE TABLE IF NOT EXISTS atg_readings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id        UUID        NOT NULL REFERENCES tanks(id),
  volume_liters  NUMERIC     NOT NULL,
  temperature_c  NUMERIC,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source         TEXT        NOT NULL DEFAULT 'SIMULATED'
);

CREATE INDEX IF NOT EXISTS idx_atg_tank_time
  ON atg_readings(tank_id, recorded_at DESC);
