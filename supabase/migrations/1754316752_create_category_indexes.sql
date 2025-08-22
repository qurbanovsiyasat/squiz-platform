-- Migration: create_category_indexes
-- Created at: 1754316752

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_forms_category_id ON forms(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_category_id ON qa_questions(category_id);;