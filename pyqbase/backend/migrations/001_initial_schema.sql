-- Enable the uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_subscription_status AS ENUM ('free', 'active', 'past_due', 'canceled');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ==========================================
-- USERS
-- ==========================================
-- Maps to Supabase Auth UID
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    subscription_status user_subscription_status NOT NULL DEFAULT 'free',
    trial_ends_at TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- SUBJECTS
-- ==========================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR UNIQUE NOT NULL
);

-- ==========================================
-- TOPICS
-- ==========================================
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    UNIQUE(subject_id, name)
);

-- ==========================================
-- SUBTOPICS
-- ==========================================
CREATE TABLE subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL
);

-- ==========================================
-- QUESTIONS
-- ==========================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam VARCHAR NOT NULL,
    year INT NOT NULL,
    paper VARCHAR NOT NULL,
    question_number INT NOT NULL,
    question_stem JSONB NOT NULL,
    options JSONB NOT NULL,
    correct_option VARCHAR NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D', 'DROPPED')),
    question_type VARCHAR NOT NULL,
    has_image BOOLEAN NOT NULL DEFAULT FALSE,
    image_url VARCHAR NULL,
    image_description TEXT NULL,
    parse_confidence FLOAT,
    subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE RESTRICT,
    syllabus_point_id INT NULL,
    elo_rating INT NOT NULL DEFAULT 1200,
    search_vector TSVECTOR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- USER ATTEMPTS (Partitioned Table)
-- ==========================================
-- Declarative range partitioning requires the partition key to be part of the primary key.
CREATE TABLE user_attempts (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option VARCHAR NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INT NOT NULL,
    attempt_date DATE NOT NULL,
    PRIMARY KEY (id, attempt_date)
) PARTITION BY RANGE (attempt_date);

-- Example quarterly partitions for 2026
CREATE TABLE user_attempts_2026_q1 PARTITION OF user_attempts FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE user_attempts_2026_q2 PARTITION OF user_attempts FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE user_attempts_2026_q3 PARTITION OF user_attempts FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE user_attempts_2026_q4 PARTITION OF user_attempts FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- ==========================================
-- USER SRS
-- ==========================================
CREATE TABLE user_srs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    next_review_date DATE NOT NULL,
    interval INT NOT NULL,
    ease_factor FLOAT NOT NULL,
    UNIQUE(user_id, question_id)
);

-- ==========================================
-- MOCK TESTS
-- ==========================================
CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam VARCHAR NOT NULL,
    question_ids UUID[] NOT NULL,
    mode VARCHAR NOT NULL,
    score FLOAT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- BACKGROUND JOBS
-- ==========================================
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type VARCHAR NOT NULL,
    payload JSONB NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    locked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- AUDIT LOGS
-- ==========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR NOT NULL,
    previous_payload JSONB NULL,
    new_payload JSONB NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_user_attempts_date ON user_attempts(user_id, attempt_date);
CREATE INDEX idx_srs_review_date ON user_srs(user_id, next_review_date);
CREATE INDEX idx_questions_subtopic ON questions(subtopic_id);
CREATE INDEX idx_questions_search ON questions USING GIN(search_vector);

-- ==========================================
-- TRIGGERS
-- ==========================================
-- Auto-populate search_vector from question_stem->>'en' and options on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_questions_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.question_stem->>'en', '') || ' ' || COALESCE(NEW.options::text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_questions_search_vector
BEFORE INSERT OR UPDATE OF question_stem, options ON questions
FOR EACH ROW
EXECUTE FUNCTION update_questions_search_vector();

-- ==========================================
-- MATERIALIZED VIEW
-- ==========================================
-- Topic heatmap: pre-aggregates question_count and weightage_percent per topic
CREATE MATERIALIZED VIEW topic_heatmap AS
WITH topic_counts AS (
    SELECT 
        t.id AS topic_id,
        t.name AS topic_name,
        t.subject_id,
        COUNT(q.id) AS question_count
    FROM topics t
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY t.id, t.name, t.subject_id
),
total_counts AS (
    SELECT COUNT(id) AS total_questions FROM questions
)
SELECT 
    tc.topic_id,
    tc.topic_name,
    tc.subject_id,
    tc.question_count,
    CASE 
        WHEN tt.total_questions > 0 THEN 
            ROUND((tc.question_count::numeric / tt.total_questions::numeric) * 100, 2)
        ELSE 0 
    END AS weightage_percent
FROM topic_counts tc
CROSS JOIN total_counts tt;

-- Unique index required for CONCURRENTLY refreshing the materialized view
CREATE UNIQUE INDEX idx_topic_heatmap_topic_id ON topic_heatmap(topic_id);
