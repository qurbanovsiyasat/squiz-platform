-- Fix Admin Role Functions Migration
-- Date: 2025-08-07
-- Fixes: Missing admin role checking functions for proper admin panel access

-- 1. Create is_admin function that's referenced in other places
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists and has admin or super_admin role
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id 
        AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    );
END;
$$;

-- 2. Create get_user_role_info function that AdminContext calls
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
    -- Get the user's role from auth.users metadata
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO user_role
    FROM auth.users 
    WHERE id = user_id;
    
    -- If no role found, default to student
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

-- 3. Create function to update user role (for super admin use)
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only super admin can update roles
    IF NOT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Only super admin can update user roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'teacher', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Update the user's role in metadata
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- 4. Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id 
        AND raw_user_meta_data->>'role' = 'super_admin'
    );
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;

-- Also grant to anon for public access where needed
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_role_info(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO anon;

-- 6. Ensure auth.users has proper structure
-- Note: auth.users is managed by Supabase, but we can verify structure
DO $$
BEGIN
    -- Verify that raw_user_meta_data column exists (it should by default)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'raw_user_meta_data'
    ) THEN
        RAISE NOTICE 'Warning: raw_user_meta_data column not found in auth.users';
    END IF;
END $$;
