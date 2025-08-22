-- Fix Admin Role Assignment Functions Migration
-- Date: 2025-08-07
-- Fixes: Create missing admin role assignment functions and fix permissions

-- 1. Create assign_admin_role function
CREATE OR REPLACE FUNCTION assign_admin_role(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_email TEXT;
    current_user_role TEXT;
    result JSONB;
BEGIN
    -- Check if current user is super admin
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Special handling for known super admin emails
    IF NOT (current_user_role = 'super_admin' OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = ANY(ARRAY['qurbanov@gmail.com'])
    )) THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Access denied. Only super admin can assign admin roles.'
        );
        RETURN result;
    END IF;
    
    -- Get target user email
    SELECT email INTO target_user_email
    FROM auth.users
    WHERE id = user_id;
    
    IF target_user_email IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found.'
        );
        RETURN result;
    END IF;
    
    -- Update user role to admin
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    WHERE id = user_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', format('Successfully assigned admin role to %s', target_user_email),
            'user_id', user_id
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to update user role.'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', format('Error assigning admin role: %s', SQLERRM)
        );
        RETURN result;
END;
$$;

-- 2. Create remove_admin_role function
CREATE OR REPLACE FUNCTION remove_admin_role(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_email TEXT;
    target_user_role TEXT;
    current_user_role TEXT;
    result JSONB;
BEGIN
    -- Check if current user is super admin
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Special handling for known super admin emails
    IF NOT (current_user_role = 'super_admin' OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = ANY(ARRAY['qurbanov@gmail.com'])
    )) THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Access denied. Only super admin can remove admin roles.'
        );
        RETURN result;
    END IF;
    
    -- Get target user info
    SELECT email, COALESCE(raw_user_meta_data->>'role', 'student')
    INTO target_user_email, target_user_role
    FROM auth.users
    WHERE id = user_id;
    
    IF target_user_email IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found.'
        );
        RETURN result;
    END IF;
    
    -- Prevent removing super admin role
    IF target_user_role = 'super_admin' THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Cannot remove super admin role.'
        );
        RETURN result;
    END IF;
    
    -- Update user role to student (default)
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'student')
    WHERE id = user_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', format('Successfully removed admin role from %s', target_user_email),
            'user_id', user_id
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to update user role.'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', format('Error removing admin role: %s', SQLERRM)
        );
        RETURN result;
END;
$$;

-- 3. Create toggle_quiz_permission function
CREATE OR REPLACE FUNCTION toggle_quiz_permission(user_id UUID, can_create BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_email TEXT;
    target_user_role TEXT;
    current_user_role TEXT;
    new_role TEXT;
    result JSONB;
BEGIN
    -- Check if current user is super admin
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Special handling for known super admin emails
    IF NOT (current_user_role = 'super_admin' OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = ANY(ARRAY['qurbanov@gmail.com'])
    )) THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Access denied. Only super admin can toggle quiz permissions.'
        );
        RETURN result;
    END IF;
    
    -- Get target user info
    SELECT email, COALESCE(raw_user_meta_data->>'role', 'student')
    INTO target_user_email, target_user_role
    FROM auth.users
    WHERE id = user_id;
    
    IF target_user_email IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found.'
        );
        RETURN result;
    END IF;
    
    -- Don't change super admin or admin roles
    IF target_user_role IN ('super_admin', 'admin') THEN
        result := jsonb_build_object(
            'success', true,
            'message', format('User %s already has quiz creation permissions', target_user_email),
            'user_id', user_id
        );
        RETURN result;
    END IF;
    
    -- Set role based on can_create flag
    IF can_create THEN
        new_role := 'teacher';
    ELSE
        new_role := 'student';
    END IF;
    
    -- Update user role
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
    WHERE id = user_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', format('Successfully updated quiz permissions for %s', target_user_email),
            'user_id', user_id,
            'new_role', new_role,
            'can_create_quiz', can_create
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to update user permissions.'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', format('Error updating quiz permissions: %s', SQLERRM)
        );
        RETURN result;
END;
$$;

-- 4. Create get_all_users function for admin panel
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_admin BOOLEAN,
    is_super_admin BOOLEAN,
    can_create_quiz BOOLEAN,
    is_private BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if current user is admin or super admin
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Special handling for known super admin emails
    IF NOT (current_user_role IN ('admin', 'super_admin') OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = ANY(ARRAY['qurbanov@gmail.com'])
    )) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', 'Anonymous') as full_name,
        COALESCE(au.raw_user_meta_data->>'role', 'student') as role,
        (COALESCE(au.raw_user_meta_data->>'role', 'student') IN ('admin', 'super_admin'))::BOOLEAN as is_admin,
        (COALESCE(au.raw_user_meta_data->>'role', 'student') = 'super_admin')::BOOLEAN as is_super_admin,
        (COALESCE(au.raw_user_meta_data->>'role', 'student') IN ('admin', 'super_admin', 'teacher'))::BOOLEAN as can_create_quiz,
        COALESCE((au.raw_user_meta_data->>'is_private')::boolean, false) as is_private,
        au.created_at
    FROM auth.users au
    ORDER BY au.created_at DESC;
END;
$$;

-- 5. Create delete_user function
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_email TEXT;
    target_user_role TEXT;
    current_user_role TEXT;
    result JSONB;
BEGIN
    -- Check if current user is super admin
    SELECT COALESCE(raw_user_meta_data->>'role', 'student') 
    INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Special handling for known super admin emails
    IF NOT (current_user_role = 'super_admin' OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = ANY(ARRAY['qurbanov@gmail.com'])
    )) THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Access denied. Only super admin can delete users.'
        );
        RETURN result;
    END IF;
    
    -- Get target user info
    SELECT email, COALESCE(raw_user_meta_data->>'role', 'student')
    INTO target_user_email, target_user_role
    FROM auth.users
    WHERE id = user_id;
    
    IF target_user_email IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found.'
        );
        RETURN result;
    END IF;
    
    -- Prevent deleting super admin
    IF target_user_role = 'super_admin' THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Cannot delete super admin user.'
        );
        RETURN result;
    END IF;
    
    -- Delete user (cascade will handle related records)
    DELETE FROM auth.users WHERE id = user_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', format('Successfully deleted user %s', target_user_email),
            'user_id', user_id
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to delete user.'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', format('Error deleting user: %s', SQLERRM)
        );
        RETURN result;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION assign_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_quiz_permission(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

-- Also grant to anon for public access where needed
GRANT EXECUTE ON FUNCTION get_all_users() TO anon;

RAISE NOTICE 'Admin role assignment functions created and permissions granted';
