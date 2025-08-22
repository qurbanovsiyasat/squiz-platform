-- Migration: create_categories_table_fixed
-- Created at: 1754316678

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