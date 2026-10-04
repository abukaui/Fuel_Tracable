-- 014_add_tank_constraints.sql
-- Adds unique constraint to tanks on station_id and product_type to prevent duplicate tanks

ALTER TABLE tanks ADD CONSTRAINT unique_station_product UNIQUE (station_id, product_type);
