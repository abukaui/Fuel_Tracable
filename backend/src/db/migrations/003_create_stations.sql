-- 003_create_stations.sql
-- Depends on: 001 (station_status enum)

CREATE TABLE IF NOT EXISTS stations (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  sid                 TEXT            UNIQUE NOT NULL,
  name                TEXT            NOT NULL,
  location            TEXT,
  current_status      station_status  NOT NULL DEFAULT 'CLOSED',
  status_declared_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     DEFAULT now()
);
