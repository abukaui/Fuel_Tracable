CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vid TEXT UNIQUE NOT NULL,
  plate_number TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  vehicle_type TEXT NOT NULL DEFAULT 'PRIVATE'
);
