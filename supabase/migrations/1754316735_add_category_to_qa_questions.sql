-- Migration: add_category_to_qa_questions
-- Created at: 1754316735

-- Add category_id to qa_questions table
ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);;