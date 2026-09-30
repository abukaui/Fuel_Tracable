CREATE TYPE request_status AS ENUM ('PENDING','USED','EXPIRED','REJECTED');

CREATE TABLE fuel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  station_id UUID NOT NULL REFERENCES stations(id),
  requested_liters NUMERIC NOT NULL,
  otp_code_hash TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fuelreq_vehicle_time ON fuel_requests(vehicle_id, created_at DESC);
