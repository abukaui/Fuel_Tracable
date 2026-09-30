CREATE TABLE quota_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT UNIQUE NOT NULL,
  daily_limit_liters NUMERIC NOT NULL,
  set_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
