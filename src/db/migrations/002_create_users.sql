-- 002_create_users.sql
-- Depends on: 001 (user_role enum)

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT        NOT NULL,
  phone         TEXT        UNIQUE NOT NULL,
  password_hash TEXT,
  role          user_role   NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
