CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pre-seed the exams we already have
INSERT INTO exams (name, slug, description, icon) VALUES 
('UPSC CSE', 'upsc-cse', 'Union Public Service Commission Civil Services Examination', 'landmark'),
('CAPF', 'capf', 'Central Armed Police Forces', 'shield'),
('MPSC', 'mpsc', 'Maharashtra Public Service Commission', 'book-open'),
('CDS', 'cds', 'Combined Defence Services', 'graduation-cap');
