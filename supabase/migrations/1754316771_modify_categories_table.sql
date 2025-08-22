-- Migration: modify_categories_table
-- Created at: 1754316771

-- Add missing columns to existing categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(50) CHECK (type IN ('quiz', 'form', 'qa'));
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing categories to have a default type
UPDATE categories SET type = 'quiz' WHERE type IS NULL;

-- Make type NOT NULL
ALTER TABLE categories ALTER COLUMN type SET NOT NULL;;