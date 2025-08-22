-- Fix Category Deletion Migration
-- Date: 2025-08-07
-- Fixes: Improve category deletion function with better error handling and reassignment options

-- Drop existing function
DROP FUNCTION IF EXISTS delete_category(UUID);

-- Function to delete categories with improved logic (super admin only)
CREATE OR REPLACE FUNCTION delete_category(
    category_id UUID,
    force_delete BOOLEAN DEFAULT FALSE,
    reassign_to_default BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    category_type VARCHAR(50);
    category_name VARCHAR(255);
    content_count INTEGER := 0;
    quiz_count INTEGER := 0;
    form_count INTEGER := 0;
    qa_count INTEGER := 0;
    default_category_id UUID;
    result JSONB;
BEGIN
    -- Check if user is super admin (updated to use auth.users and improved role checking)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND (raw_user_meta_data->>'role' = 'super_admin' OR auth.uid()::text IN (
            SELECT id::text FROM auth.users WHERE email = 'qurbanov@gmail.com'
        ))
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Get category info
    SELECT type, name INTO category_type, category_name 
    FROM categories WHERE id = category_id;
    
    IF category_type IS NULL THEN
        RAISE EXCEPTION 'Category not found with id: %', category_id;
    END IF;
    
    -- Count items using this category
    IF category_type = 'quiz' THEN
        SELECT COUNT(*) INTO quiz_count FROM quizzes WHERE category_id = delete_category.category_id;
        content_count := quiz_count;
    ELSIF category_type = 'form' THEN
        SELECT COUNT(*) INTO form_count FROM forms WHERE category_id = delete_category.category_id;
        content_count := form_count;
    ELSIF category_type = 'qa' THEN
        SELECT COUNT(*) INTO qa_count FROM qa_questions WHERE category_id = delete_category.category_id;
        content_count := qa_count;
    END IF;
    
    -- If category is in use and not forcing deletion
    IF content_count > 0 AND NOT force_delete THEN
        -- If reassign_to_default is true, try to reassign to default category
        IF reassign_to_default THEN
            -- Find or create default category
            SELECT id INTO default_category_id 
            FROM categories 
            WHERE type = category_type AND (name = 'Uncategorized' OR name = 'General')
            LIMIT 1;
            
            -- If no default category exists, create one
            IF default_category_id IS NULL THEN
                INSERT INTO categories (name, type, description)
                VALUES ('Uncategorized', category_type, 'Default category for uncategorized items')
                RETURNING id INTO default_category_id;
            END IF;
            
            -- Reassign items to default category
            IF category_type = 'quiz' THEN
                UPDATE quizzes SET category_id = default_category_id WHERE category_id = delete_category.category_id;
            ELSIF category_type = 'form' THEN
                UPDATE forms SET category_id = default_category_id WHERE category_id = delete_category.category_id;
            ELSIF category_type = 'qa' THEN
                UPDATE qa_questions SET category_id = default_category_id WHERE category_id = delete_category.category_id;
            END IF;
            
            -- Now delete the category
            DELETE FROM categories WHERE id = category_id;
            
            result := jsonb_build_object(
                'success', true,
                'message', format('Category "%s" deleted successfully. %s items reassigned to default category.', category_name, content_count),
                'items_reassigned', content_count,
                'reassigned_to', default_category_id
            );
        ELSE
            -- Return error with detailed count
            result := jsonb_build_object(
                'success', false,
                'message', format('Cannot delete category "%s". It is being used by %s item(s).', category_name, content_count),
                'items_count', content_count,
                'category_type', category_type
            );
        END IF;
    ELSE
        -- Delete the category (either not in use or force delete)
        DELETE FROM categories WHERE id = category_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', format('Category "%s" deleted successfully.', category_name),
            'items_count', content_count
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', format('Failed to delete category: %s', SQLERRM),
            'error_code', SQLSTATE
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simpler wrapper function for backward compatibility
CREATE OR REPLACE FUNCTION delete_category(category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    deletion_result JSONB;
BEGIN
    -- Call the new function with default parameters
    deletion_result := delete_category(category_id, FALSE, TRUE);
    
    -- Return boolean for backward compatibility
    RETURN (deletion_result->>'success')::BOOLEAN;
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception with a cleaner message
        RAISE EXCEPTION '%', deletion_result->>'message';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_category(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_category(UUID) TO authenticated;

-- Update other category management functions to use improved auth checking
CREATE OR REPLACE FUNCTION create_category(
    category_name VARCHAR(255),
    category_type VARCHAR(50),
    category_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_category_id UUID;
BEGIN
    -- Check if user is super admin (improved check)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND (raw_user_meta_data->>'role' = 'super_admin' OR auth.uid()::text IN (
            SELECT id::text FROM auth.users WHERE email = 'qurbanov@gmail.com'
        ))
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Validate category type
    IF category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa.';
    END IF;
    
    -- Insert new category
    INSERT INTO categories (name, type, description)
    VALUES (category_name, category_type, category_description)
    RETURNING id INTO new_category_id;
    
    RETURN new_category_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Category with name "%" already exists for type "%"', category_name, category_type;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create category: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update category function
CREATE OR REPLACE FUNCTION update_category(
    category_id UUID,
    category_name VARCHAR(255) DEFAULT NULL,
    category_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is super admin (improved check)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND (raw_user_meta_data->>'role' = 'super_admin' OR auth.uid()::text IN (
            SELECT id::text FROM auth.users WHERE email = 'qurbanov@gmail.com'
        ))
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Update category
    UPDATE categories 
    SET 
        name = COALESCE(category_name, name),
        description = COALESCE(category_description, description),
        updated_at = NOW()
    WHERE id = category_id;
    
    -- Check if category was found and updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category not found with id: %', category_id;
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Category name already exists for this type';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update category: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
