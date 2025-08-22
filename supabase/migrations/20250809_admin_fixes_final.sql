-- Final Admin Panel Fixes
-- Date: 2025-08-09
-- Fixes: Drop all conflicting functions first, then recreate

-- 1. DROP ALL CONFLICTING FUNCTIONS
DROP FUNCTION IF EXISTS get_all_users_with_admin_info(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_all_users_with_admin_info();
DROP FUNCTION IF EXISTS get_categories_by_type(TEXT);
DROP FUNCTION IF EXISTS get_categories_by_type_safe(TEXT);
DROP FUNCTION IF EXISTS get_form_stats(UUID);
DROP FUNCTION IF EXISTS get_form_stats_accurate(UUID);

-- 2. CREATE get_all_users_with_admin_info FUNCTION
CREATE FUNCTION get_all_users_with_admin_info()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    can_create_quiz BOOLEAN,
    is_active BOOLEAN,
    is_private BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_super_admin BOOLEAN,
    is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    ) THEN
        -- Also check auth.users as fallback for super admin
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
                OR auth.users.email = 'qurbanov@gmail.com')
        ) THEN
            RAISE EXCEPTION 'Access denied. Admin privileges required.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.full_name, 'Anonymous') as full_name,
        COALESCE(u.role, 'student') as role,
        COALESCE(u.can_create_quiz, false) as can_create_quiz,
        -- Determine if user is active (signed in within last 30 days or recently created)
        CASE 
            WHEN au.last_sign_in_at IS NULL AND u.created_at > NOW() - INTERVAL '7 days' THEN true
            WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN true
            ELSE false
        END as is_active,
        COALESCE(u.is_private, false) as is_private,
        u.created_at,
        u.updated_at,
        (COALESCE(u.role, 'student') = 'super_admin')::BOOLEAN as is_super_admin,
        (COALESCE(u.role, 'student') IN ('admin', 'super_admin'))::BOOLEAN as is_admin
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    ORDER BY u.created_at DESC
    LIMIT 100;
END;
$$;

-- 3. CREATE get_categories_by_type FUNCTION
CREATE FUNCTION get_categories_by_type(p_category_type TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    ) THEN
        -- Also check auth.users as fallback
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
                OR auth.users.email = 'qurbanov@gmail.com')
        ) THEN
            RAISE EXCEPTION 'Access denied. Admin privileges required.';
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.type,
        c.description,
        c.created_at,
        c.updated_at
    FROM categories c
    WHERE c.type = p_category_type
    ORDER BY c.name ASC;
END;
$$;

-- 4. CREATE get_form_stats FUNCTION
CREATE FUNCTION get_form_stats(p_form_id UUID)
RETURNS TABLE (
    total_likes BIGINT,
    total_views BIGINT,
    user_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        (
            SELECT COUNT(*) 
            FROM form_likes fl 
            WHERE fl.form_id = p_form_id
        ) as total_likes,
        (
            SELECT COALESCE(f.view_count, 0) 
            FROM forms f 
            WHERE f.id = p_form_id
        ) as total_views,
        (
            CASE 
                WHEN v_user_id IS NULL THEN false
                ELSE EXISTS (
                    SELECT 1 
                    FROM form_likes fl 
                    WHERE fl.form_id = p_form_id 
                    AND fl.user_id = v_user_id
                )
            END
        ) as user_liked;
END;
$$;

-- 5. GRANT NECESSARY PERMISSIONS
GRANT EXECUTE ON FUNCTION get_all_users_with_admin_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_type(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_stats(UUID) TO anon;

RAISE NOTICE 'Final admin panel fixes applied successfully';
