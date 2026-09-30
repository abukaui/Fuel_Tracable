CREATE TABLE dispense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_request_id UUID UNIQUE NOT NULL REFERENCES fuel_requests(id),
  verified_by UUID NOT NULL REFERENCES users(id),
  liters_dispensed NUMERIC NOT NULL,
  plate_verified BOOLEAN NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT now()
);
