-- Migration: fix_get_categories_by_type_function
-- Created at: 1754337451

-- Fix get_categories_by_type function parameter mismatch
-- The frontend is calling with p_category_type but function might have category_type

-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS get_categories_by_type(VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(VARCHAR(50));
DROP FUNCTION IF EXISTS get_categories_by_type(category_type VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(category_type VARCHAR(50));
DROP FUNCTION IF EXISTS get_categories_by_type(p_category_type VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(p_category_type VARCHAR(50));

-- Create the correct version with p_category_type parameter
CREATE OR REPLACE FUNCTION get_categories_by_type(p_category_type VARCHAR(50))
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Validate category type
    IF p_category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa.';
    END IF;
    
    RETURN QUERY
    SELECT c.id, c.name, c.type, c.description, c.created_at, c.updated_at
    FROM categories c
    WHERE c.type = p_category_type
    ORDER BY c.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_categories_by_type(VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_type(VARCHAR(50)) TO anon;
