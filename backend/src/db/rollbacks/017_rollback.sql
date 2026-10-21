-- 017_rollback.sql
-- Rollback for 017_add_profile_fields_and_audit_columns.sql

DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_users_email;

ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_agent;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS ip_address;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS created_at;

ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
ALTER TABLE users DROP COLUMN IF EXISTS token_version;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE users DROP COLUMN IF EXISTS office;
ALTER TABLE users DROP COLUMN IF EXISTS email;
