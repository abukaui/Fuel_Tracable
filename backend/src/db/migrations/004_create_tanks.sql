-- 004_create_tanks.sql
-- Depends on: 003 (stations)

CREATE TABLE IF NOT EXISTS tanks (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id       UUID    NOT NULL REFERENCES stations(id),
  capacity_liters  NUMERIC NOT NULL,
  product_type     TEXT    NOT NULL DEFAULT 'PETROL'
);
