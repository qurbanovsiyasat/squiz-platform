-- Migration: add_category_columns
-- Created at: 1754316687

-- Add category_id to existing tables
ALTER TABLE forms ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_forms_category_id ON forms(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_category_id ON qa_questions(category_id);;