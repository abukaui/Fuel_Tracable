-- 013_add_station_to_users.sql
-- Assigns a user (e.g. an operator) to a specific station

ALTER TABLE users ADD COLUMN station_id UUID REFERENCES stations(id);
