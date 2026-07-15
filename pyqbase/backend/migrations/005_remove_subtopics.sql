-- Migration: Remove Subtopics
-- 1. Drop foreign key constraints
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_subtopic_id_fkey;
ALTER TABLE staged_questions DROP CONSTRAINT IF EXISTS staged_questions_subtopic_id_fkey;

-- 2. Add topic_id column to questions and staged_questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;
ALTER TABLE staged_questions ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

-- 3. Drop subtopic_id column
ALTER TABLE questions DROP COLUMN IF EXISTS subtopic_id CASCADE;
ALTER TABLE staged_questions DROP COLUMN IF EXISTS subtopic_id CASCADE;

-- 4. Drop subtopics table
DROP TABLE IF EXISTS subtopics CASCADE;
