-- Add 'repetitions' column to user_srs table for proper SM-2 calculation
ALTER TABLE user_srs ADD COLUMN IF NOT EXISTS repetitions INT NOT NULL DEFAULT 0;
