CREATE TYPE ingestion_status AS ENUM ('parsing', 'parsed', 'reviewing', 'publishing', 'completed', 'failed');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_edit');

CREATE TABLE ingestion_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam VARCHAR NOT NULL,
    year INT NOT NULL,
    paper VARCHAR NOT NULL,
    source_filename VARCHAR NOT NULL,
    answer_key_filename VARCHAR NULL,
    status ingestion_status NOT NULL DEFAULT 'parsing',
    total_questions INT NOT NULL DEFAULT 0,
    error_log TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE staged_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES ingestion_batches(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    raw_question_stem TEXT NOT NULL,
    paraphrased_stem JSONB NULL,
    raw_options JSONB NOT NULL,
    paraphrased_options JSONB NULL,
    correct_option VARCHAR NULL,
    matched_from_answer_key BOOLEAN NOT NULL DEFAULT false,
    ai_explanation JSONB NULL,
    subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID NULL REFERENCES topics(id) ON DELETE SET NULL,
    subtopic_id UUID NULL REFERENCES subtopics(id) ON DELETE SET NULL,
    parse_confidence FLOAT NOT NULL,
    lexical_similarity_score FLOAT NULL,
    review_status review_status NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT NULL,
    has_image BOOLEAN NOT NULL DEFAULT false,
    image_url VARCHAR NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
