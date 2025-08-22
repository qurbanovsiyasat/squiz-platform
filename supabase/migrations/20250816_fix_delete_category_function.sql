-- Fix delete_category RPC function
-- This migration ensures the delete_category function exists with the correct signature

CREATE OR REPLACE FUNCTION delete_category(
    category_id UUID,
    force_delete BOOLEAN DEFAULT false,
    reassign_to_default BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    category_type TEXT;
    items_count INTEGER := 0;
    default_category_id UUID;
BEGIN
    -- Get category info
    SELECT type INTO category_type FROM categories WHERE id = category_id;
    
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Category not found.');
    END IF;
    
    -- Count items in this category
    CASE category_type
        WHEN 'quiz' THEN
            SELECT COUNT(*) INTO items_count FROM quizzes WHERE category_id = delete_category.category_id;
        WHEN 'form' THEN
            SELECT COUNT(*) INTO items_count FROM forms WHERE category_id = delete_category.category_id;
        WHEN 'qa' THEN
            SELECT COUNT(*) INTO items_count FROM qa_questions WHERE category_id = delete_category.category_id;
    END CASE;
    
    -- If items exist and reassignment is requested
    IF items_count > 0 AND reassign_to_default THEN
        -- Find or create default category
        SELECT id INTO default_category_id 
        FROM categories 
        WHERE type = category_type AND name = 'General'
        LIMIT 1;
        
        IF default_category_id IS NULL THEN
            INSERT INTO categories (name, type, description)
            VALUES ('General', category_type, 'Default category')
            RETURNING id INTO default_category_id;
        END IF;
        
        -- Reassign items
        CASE category_type
            WHEN 'quiz' THEN
                UPDATE quizzes SET category_id = default_category_id WHERE category_id = delete_category.category_id;
            WHEN 'form' THEN
                UPDATE forms SET category_id = default_category_id WHERE category_id = delete_category.category_id;
            WHEN 'qa' THEN
                UPDATE qa_questions SET category_id = default_category_id WHERE category_id = delete_category.category_id;
        END CASE;
    END IF;
    
    -- Delete the category
    DELETE FROM categories WHERE id = category_id;
    
    RETURN JSON_BUILD_OBJECT(
        'success', true, 
        'message', 'Category deleted successfully.',
        'items_reassigned', items_count
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_category(UUID, BOOLEAN, BOOLEAN) TO authenticated;

RAISE NOTICE 'delete_category function created/updated successfully!';
