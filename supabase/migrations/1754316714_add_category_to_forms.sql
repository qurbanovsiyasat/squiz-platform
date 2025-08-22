-- Migration: add_category_to_forms
-- Created at: 1754316714

-- Add category_id to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);;