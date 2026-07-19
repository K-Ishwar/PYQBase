CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

-- Insert default exams using standard UUIDs
INSERT INTO exams (id, name, slug) VALUES
    ('11111111-1111-1111-1111-111111111111', 'UPSC CSE', 'upsc-cse'),
    ('22222222-2222-2222-2222-222222222222', 'UPSC CAPF', 'upsc-capf'),
    ('33333333-3333-3333-3333-333333333333', 'MPSC Rajyseva', 'mpsc-rajyseva'),
    ('44444444-4444-4444-4444-444444444444', 'UPSC CDS', 'upsc-cds')
ON CONFLICT (id) DO NOTHING;
