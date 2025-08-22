-- Migration: create_categories_table
-- Created at: 1754316667

-- Create categories table for quizzes, forms, and Q&A
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('quiz', 'form', 'qa')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Add category_id to existing tables
ALTER TABLE forms ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_forms_category_id ON forms(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_category_id ON qa_questions(category_id);

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "categories_select_all" ON categories
    FOR SELECT USING (true);

CREATE POLICY "categories_insert_super_admin" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "categories_update_super_admin" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "categories_delete_super_admin" ON categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );;