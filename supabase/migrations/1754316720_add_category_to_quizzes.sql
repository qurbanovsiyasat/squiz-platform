-- Migration: add_category_to_quizzes
-- Created at: 1754316720

-- Add category_id to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);;