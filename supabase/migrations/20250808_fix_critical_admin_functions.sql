-- Fix Critical Admin Functions Migration
-- Date: 2025-08-08
-- Fixes: Missing get_all_users_with_admin_info, category deletion, form viewing

-- 1. CREATE MISSING get_all_users_with_admin_info FUNCTION (HIGHEST PRIORITY)
CREATE OR REPLACE FUNCTION get_all_users_with_admin_info(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_active BOOLEAN,
    is_private BOOLEAN,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) THEN
        -- Also check auth.users as fallback
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
                OR email = 'qurbanov@gmail.com')
        ) THEN
            RAISE EXCEPTION 'Access denied. Admin privileges required.';
        END IF;
    END IF;

    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            u.id,
            u.email,
            u.full_name,
            u.role,
            u.is_private,
            u.avatar_url,
            u.created_at,
            u.updated_at,
            au.last_sign_in_at,
            -- Determine if user is active (signed in within last 30 days or recently created)
            CASE 
                WHEN au.last_sign_in_at IS NULL AND u.created_at > NOW() - INTERVAL '7 days' THEN true
                WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN true
                ELSE false
            END as is_active,
            COUNT(*) OVER() as total_count
        FROM users u
        LEFT JOIN auth.users au ON u.id = au.id
        ORDER BY u.created_at DESC
        LIMIT page_size OFFSET page_offset
    )
    SELECT 
        us.id,
        us.email,
        COALESCE(us.full_name, 'Anonymous') as full_name,
        us.role,
        us.is_active,
        us.is_private,
        us.avatar_url,
        us.created_at,
        us.updated_at,
        us.last_sign_in_at,
        us.total_count
    FROM user_stats us;
END;
$$;

-- 2. ENHANCED CATEGORY DELETION WITH PROPER ERROR HANDLING
CREATE OR REPLACE FUNCTION delete_category_safe(category_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    category_rec RECORD;
    content_count INTEGER := 0;
    default_category_id UUID;
    result JSONB;
BEGIN
    -- Check if user is admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) THEN
        -- Also check auth.users as fallback
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
                OR email = 'qurbanov@gmail.com')
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Access denied. Admin privileges required.'
            );
        END IF;
    END IF;
    
    -- Get category info
    SELECT id, name, type INTO category_rec
    FROM categories 
    WHERE id = category_id;
    
    IF category_rec.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Category not found'
        );
    END IF;
    
    -- Count items using this category
    IF category_rec.type = 'quiz' THEN
        SELECT COUNT(*) INTO content_count FROM quizzes WHERE category_id = delete_category_safe.category_id;
    ELSIF category_rec.type = 'form' THEN
        SELECT COUNT(*) INTO content_count FROM forms WHERE category_id = delete_category_safe.category_id;
    ELSIF category_rec.type = 'qa' THEN
        SELECT COUNT(*) INTO content_count FROM qa_questions WHERE category_id = delete_category_safe.category_id;
    END IF;
    
    -- If category has content, reassign to default category
    IF content_count > 0 THEN
        -- Find or create default category
        SELECT id INTO default_category_id 
        FROM categories 
        WHERE type = category_rec.type 
        AND name IN ('General', 'Uncategorized', 'Default')
        ORDER BY name
        LIMIT 1;
        
        -- If no default category exists, create one
        IF default_category_id IS NULL THEN
            INSERT INTO categories (name, type, description)
            VALUES ('General', category_rec.type, 'Default category for ' || category_rec.type || ' items')
            RETURNING id INTO default_category_id;
        END IF;
        
        -- Reassign items to default category
        IF category_rec.type = 'quiz' THEN
            UPDATE quizzes SET category_id = default_category_id WHERE category_id = delete_category_safe.category_id;
        ELSIF category_rec.type = 'form' THEN
            UPDATE forms SET category_id = default_category_id WHERE category_id = delete_category_safe.category_id;
        ELSIF category_rec.type = 'qa' THEN
            UPDATE qa_questions SET category_id = default_category_id WHERE category_id = delete_category_safe.category_id;
        END IF;
    END IF;
    
    -- Delete the category
    DELETE FROM categories WHERE id = category_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Category deleted successfully',
            'items_reassigned', content_count
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to delete category'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;

-- 3. ENHANCED FORM VIEWING FUNCTION
CREATE OR REPLACE FUNCTION get_form_with_complete_details(form_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    form_data JSONB;
    fields_data JSONB;
    replies_data JSONB;
    creator_data JSONB;
    result JSONB;
BEGIN
    -- Get form basic data
    SELECT jsonb_build_object(
        'id', f.id,
        'title', f.title,
        'description', f.description,
        'is_public', f.is_public,
        'settings', f.settings,
        'view_count', COALESCE(f.view_count, 0),
        'submission_count', COALESCE(f.submission_count, 0),
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'creator_id', f.creator_id
    ) INTO form_data
    FROM forms f
    WHERE f.id = form_id
    AND (f.is_public = true OR f.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));
    
    IF form_data IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Form not found or access denied'
        );
    END IF;
    
    -- Get creator information
    SELECT jsonb_build_object(
        'full_name', COALESCE(u.full_name, 'Anonymous'),
        'avatar_url', u.avatar_url,
        'is_private', COALESCE(u.is_private, false)
    ) INTO creator_data
    FROM users u
    WHERE u.id = (form_data->>'creator_id')::UUID;
    
    -- Get form fields with proper ordering
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ff.id,
            'field_type', ff.field_type,
            'label', ff.label,
            'placeholder', ff.placeholder,
            'options', ff.options,
            'is_required', ff.is_required,
            'order_index', ff.order_index,
            'validation_rules', ff.validation_rules
        ) ORDER BY ff.order_index
    ), '[]'::jsonb) INTO fields_data
    FROM form_fields ff
    WHERE ff.form_id = form_id;
    
    -- Get form replies with authors
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', fr.id,
            'content', fr.content,
            'created_at', fr.created_at,
            'author', jsonb_build_object(
                'full_name', COALESCE(u.full_name, 'Anonymous'),
                'avatar_url', u.avatar_url,
                'is_private', COALESCE(u.is_private, false)
            )
        ) ORDER BY fr.created_at ASC
    ), '[]'::jsonb) INTO replies_data
    FROM form_replies fr
    LEFT JOIN users u ON fr.author_id = u.id
    WHERE fr.form_id = form_id;
    
    -- Combine all data
    result := form_data || jsonb_build_object(
        'creator', creator_data,
        'fields', fields_data,
        'replies', replies_data,
        'success', true
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error retrieving form: ' || SQLERRM
        );
END;
$$;

-- 4. USER SEARCH AND FILTERING FUNCTION
CREATE OR REPLACE FUNCTION search_users(
    search_term TEXT DEFAULT '',
    role_filter TEXT DEFAULT '',
    page_size INTEGER DEFAULT 25,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.full_name, 'Anonymous') as full_name,
        u.role,
        CASE 
            WHEN au.last_sign_in_at IS NULL AND u.created_at > NOW() - INTERVAL '7 days' THEN true
            WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN true
            ELSE false
        END as is_active,
        u.created_at,
        COUNT(*) OVER() as total_count
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE 
        (search_term = '' OR 
         u.email ILIKE '%' || search_term || '%' OR 
         u.full_name ILIKE '%' || search_term || '%')
    AND 
        (role_filter = '' OR u.role = role_filter)
    ORDER BY u.created_at DESC
    LIMIT page_size OFFSET page_offset;
END;
$$;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_all_users_with_admin_info(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_category_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_with_complete_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Also allow public access where appropriate
GRANT EXECUTE ON FUNCTION get_form_with_complete_details(UUID) TO anon;

-- 6. CREATE HELPER FUNCTION FOR FORM VIEW COUNT INCREMENT
CREATE OR REPLACE FUNCTION increment_form_view_count(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE forms 
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = form_id
    AND (is_public = true OR creator_id = auth.uid());
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_form_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_form_view_count(UUID) TO anon;

-- 7. UPDATE EXISTING ADMIN FUNCTIONS TO USE CONSISTENT AUTH CHECKS
CREATE OR REPLACE FUNCTION get_user_role_info(user_id UUID)
RETURNS TABLE (
    role TEXT,
    is_admin BOOLEAN,
    is_super_admin BOOLEAN,
    can_create_quiz BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- First try to get role from users table
    SELECT u.role INTO user_role
    FROM users u
    WHERE u.id = user_id;
    
    -- If not found, try auth.users as fallback
    IF user_role IS NULL THEN
        SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
        INTO user_role
        FROM auth.users 
        WHERE id = user_id;
    END IF;
    
    -- If still no role found, default to student
    IF user_role IS NULL THEN
        user_role := 'student';
    END IF;
    
    -- Return role information
    RETURN QUERY SELECT
        user_role,
        (user_role IN ('admin', 'super_admin'))::BOOLEAN as is_admin,
        (user_role = 'super_admin')::BOOLEAN as is_super_admin,
        (user_role IN ('admin', 'super_admin', 'teacher'))::BOOLEAN as can_create_quiz;
END;
$$;

RAISE NOTICE 'Critical admin functions migration completed successfully';
