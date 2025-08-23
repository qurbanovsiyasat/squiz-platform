-- Fix delete_category RPC function to match frontend expectations
-- This migration fixes the function signature mismatch causing 404 errors

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS delete_category(uuid);
DROP FUNCTION IF EXISTS delete_category(uuid, boolean, boolean);

-- Create enhanced delete_category function with proper signature
CREATE OR REPLACE FUNCTION delete_category(
    p_category_id uuid,
    force_delete boolean DEFAULT false,
    reassign_to_default boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    category_record RECORD;
    items_count INTEGER := 0;
    default_category_id uuid;
BEGIN
    -- Check if category exists
    SELECT * INTO category_record FROM categories WHERE id = p_category_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Category not found',
            'items_reassigned', 0
        );
    END IF;
    
    -- Count items in this category based on type
    CASE category_record.type
        WHEN 'quiz' THEN
            SELECT COUNT(*) INTO items_count FROM quizzes WHERE category = category_record.name;
        WHEN 'form' THEN
            SELECT COUNT(*) INTO items_count FROM forms WHERE category = category_record.name;
        WHEN 'qa' THEN
            SELECT COUNT(*) INTO items_count FROM qa_questions WHERE category = category_record.name;
        ELSE
            items_count := 0;
    END CASE;
    
    -- If items exist and we want to reassign them
    IF items_count > 0 AND reassign_to_default THEN
        -- Find or create default "General" category for this type
        SELECT id INTO default_category_id 
        FROM categories 
        WHERE type = category_record.type AND name = 'General'
        LIMIT 1;
        
        -- Create General category if it doesn't exist
        IF default_category_id IS NULL THEN
            INSERT INTO categories (name, type, description, created_at, updated_at)
            VALUES ('General', category_record.type, 'Default category', NOW(), NOW())
            RETURNING id INTO default_category_id;
        END IF;
        
        -- Reassign items to the default category
        CASE category_record.type
            WHEN 'quiz' THEN
                UPDATE quizzes SET category = 'General' WHERE category = category_record.name;
            WHEN 'form' THEN
                UPDATE forms SET category = 'General' WHERE category = category_record.name;
            WHEN 'qa' THEN
                UPDATE qa_questions SET category = 'General' WHERE category = category_record.name;
        END CASE;
    
    -- If items exist but we're not reassigning and force_delete is false
    ELSIF items_count > 0 AND NOT force_delete THEN
        RETURN json_build_object(
            'success', false, 
            'message', format('Cannot delete category that is being used by %s items. Enable force delete to proceed.', items_count),
            'items_reassigned', 0
        );
    END IF;
    
    -- Delete the category
    DELETE FROM categories WHERE id = p_category_id;
    
    -- Return success with reassignment info
    RETURN json_build_object(
        'success', true, 
        'message', 'Category deleted successfully',
        'items_reassigned', CASE WHEN reassign_to_default THEN items_count ELSE 0 END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false, 
            'message', format('Error deleting category: %s', SQLERRM),
            'items_reassigned', 0
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_category(uuid, boolean, boolean) TO authenticated;

-- Ensure create_category function exists with proper signature
CREATE OR REPLACE FUNCTION create_category(
    category_name text,
    category_type text,
    category_description text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_category_id uuid;
BEGIN
    -- Validate input
    IF category_name IS NULL OR trim(category_name) = '' THEN
        RAISE EXCEPTION 'Category name is required';
    END IF;
    
    IF category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa';
    END IF;
    
    -- Check if category already exists
    IF EXISTS (SELECT 1 FROM categories WHERE name = trim(category_name) AND type = category_type) THEN
        RAISE EXCEPTION 'Category with this name already exists for type %', category_type;
    END IF;
    
    -- Create the category
    INSERT INTO categories (name, type, description, created_at, updated_at)
    VALUES (trim(category_name), category_type, category_description, NOW(), NOW())
    RETURNING id INTO new_category_id;
    
    RETURN new_category_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_category(text, text, text) TO authenticated;

-- Ensure update_category function exists
CREATE OR REPLACE FUNCTION update_category(
    category_id uuid,
    category_name text DEFAULT null,
    category_description text DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update category
    UPDATE categories 
    SET 
        name = COALESCE(category_name, name),
        description = COALESCE(category_description, description),
        updated_at = NOW()
    WHERE id = category_id;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_category(uuid, text, text) TO authenticated;

RAISE NOTICE 'Category management RPC functions fixed successfully!';
