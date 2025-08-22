-- Migration: add_unique_constraint_categories
-- Created at: 1754316797

-- Add unique constraint for name and type
ALTER TABLE categories ADD CONSTRAINT unique_name_type UNIQUE (name, type);;