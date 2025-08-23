-- Fix Category Management System RPC Functions
-- Fix get_categories_by_type and delete_category functions

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS get_categories_by_type(text);
DROP FUNCTION IF EXISTS delete_category(uuid);

-- Create improved get_categories_by_type function
CREATE OR REPLACE FUNCTION get_categories_by_type(p_type text DEFAULT '')
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  description text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If p_type is empty or null, return all categories
  IF p_type IS NULL OR p_type = '' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.type,
      c.description,
      c.created_at,
      c.updated_at,
      CASE 
        WHEN c.type = 'quiz' THEN (
          SELECT COUNT(*)::bigint FROM quizzes q WHERE q.category = c.name
        )
        WHEN c.type = 'form' THEN (
          SELECT COUNT(*)::bigint FROM forms f WHERE f.category = c.name
        )
        WHEN c.type = 'qa' THEN (
          SELECT COUNT(*)::bigint FROM qa_questions qq WHERE qq.category = c.name
        )
        ELSE 0::bigint
      END as item_count
    FROM categories c
    ORDER BY c.name;
  ELSE
    -- Return categories of specific type
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.type,
      c.description,
      c.created_at,
      c.updated_at,
      CASE 
        WHEN c.type = 'quiz' THEN (
          SELECT COUNT(*)::bigint FROM quizzes q WHERE q.category = c.name
        )
        WHEN c.type = 'form' THEN (
          SELECT COUNT(*)::bigint FROM forms f WHERE f.category = c.name
        )
        WHEN c.type = 'qa' THEN (
          SELECT COUNT(*)::bigint FROM qa_questions qq WHERE qq.category = c.name
        )
        ELSE 0::bigint
      END as item_count
    FROM categories c
    WHERE c.type = p_type
    ORDER BY c.name;
  END IF;
END;
$$;

-- Create improved delete_category function
CREATE OR REPLACE FUNCTION delete_category(p_category_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLAR
  category_record RECORD;
  items_count INTEGER;
BEGIN
  -- Check if category exists
  SELECT * INTO category_record FROM categories WHERE id = p_category_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- Check if category is being used
  items_count := 0;
  
  IF category_record.type = 'quiz' THEN
    SELECT COUNT(*) INTO items_count FROM quizzes WHERE category = category_record.name;
  ELSIF category_record.type = 'form' THEN
    SELECT COUNT(*) INTO items_count FROM forms WHERE category = category_record.name;
  ELSIF category_record.type = 'qa' THEN
    SELECT COUNT(*) INTO items_count FROM qa_questions WHERE category = category_record.name;
  END IF;
  
  -- Prevent deletion if category is in use
  IF items_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category that is in use by % items', items_count;
  END IF;
  
  -- Delete the category
  DELETE FROM categories WHERE id = p_category_id;
  
  -- Check if deletion was successful
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error deleting category %: %', p_category_id, SQLERRM;
    RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_categories_by_type(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_category(uuid) TO authenticated;

-- Create function to safely create categories
CREATE OR REPLACE FUNCTION create_category(
  p_name text,
  p_type text,
  p_description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_category_id uuid;
BEGIN
  -- Validate input
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Category name is required';
  END IF;
  
  IF p_type NOT IN ('quiz', 'form', 'qa') THEN
    RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa';
  END IF;
  
  -- Check if category already exists
  IF EXISTS (SELECT 1 FROM categories WHERE name = trim(p_name) AND type = p_type) THEN
    RAISE EXCEPTION 'Category with this name already exists for type %', p_type;
  END IF;
  
  -- Create the category
  INSERT INTO categories (name, type, description, created_at, updated_at)
  VALUES (trim(p_name), p_type, p_description, NOW(), NOW())
  RETURNING id INTO new_category_id;
  
  RETURN new_category_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_category(text, text, text) TO authenticated;

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forms_category ON forms(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_questions_category ON qa_questions(category) WHERE category IS NOT NULL;
