-- 001_create_enums.sql
-- ENUMs must exist before any table references them.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('DRIVER', 'STATION_OPERATOR', 'GOV_REGULATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE station_status AS ENUM ('OPEN', 'CLOSED', 'OUT_OF_STOCK', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
