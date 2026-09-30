CREATE TYPE reconciliation_status AS ENUM ('OK','FLAGGED','RESOLVED','INCOMPLETE');

CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  tank_volume_delta NUMERIC,
  verified_dispense_volume NUMERIC,
  variance_liters NUMERIC,
  status reconciliation_status NOT NULL DEFAULT 'OK',
  stock_out_flag BOOLEAN NOT NULL DEFAULT false,
  investigated_by UUID REFERENCES users(id),
  investigation_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
