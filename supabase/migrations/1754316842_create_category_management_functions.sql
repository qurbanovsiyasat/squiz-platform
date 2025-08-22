-- Migration: create_category_management_functions
-- Created at: 1754316842

-- Category management functions for super admins

-- Function to create categories (super admin only)
CREATE OR REPLACE FUNCTION create_category(
    category_name VARCHAR(255),
    category_type VARCHAR(50),
    category_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_category_id UUID;
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
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

-- Function to update categories (super admin only)
CREATE OR REPLACE FUNCTION update_category(
    category_id UUID,
    category_name VARCHAR(255) DEFAULT NULL,
    category_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
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

-- Function to delete categories (super admin only)
CREATE OR REPLACE FUNCTION delete_category(category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    category_type VARCHAR(50);
    content_count INTEGER;
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Get category type
    SELECT type INTO category_type FROM categories WHERE id = category_id;
    
    IF category_type IS NULL THEN
        RAISE EXCEPTION 'Category not found with id: %', category_id;
    END IF;
    
    -- Check if category is being used
    IF category_type = 'quiz' THEN
        SELECT COUNT(*) INTO content_count FROM quizzes WHERE category_id = category_id;
    ELSIF category_type = 'form' THEN
        SELECT COUNT(*) INTO content_count FROM forms WHERE category_id = category_id;
    ELSIF category_type = 'qa' THEN
        SELECT COUNT(*) INTO content_count FROM qa_questions WHERE category_id = category_id;
    END IF;
    
    IF content_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete category. It is being used by % item(s).', content_count;
    END IF;
    
    -- Delete the category
    DELETE FROM categories WHERE id = category_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete category: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get categories by type
CREATE OR REPLACE FUNCTION get_categories_by_type(category_type VARCHAR(50))
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
    IF category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa.';
    END IF;
    
    RETURN QUERY
    SELECT c.id, c.name, c.type, c.description, c.created_at, c.updated_at
    FROM categories c
    WHERE c.type = category_type
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;