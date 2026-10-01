CREATE TABLE driver_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  station_id UUID NOT NULL REFERENCES stations(id),
  category TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT now()
);
