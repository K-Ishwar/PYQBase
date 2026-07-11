-- Fix incompatible constraint on audit_logs
ALTER TABLE audit_logs ALTER COLUMN admin_id DROP NOT NULL;
