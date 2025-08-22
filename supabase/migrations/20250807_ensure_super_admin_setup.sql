-- Ensure Super Admin Setup Migration
-- Date: 2025-08-07
-- Fixes: Ensure super admin users have proper role assignment in the database

-- Function to ensure super admin role for specific users
CREATE OR REPLACE FUNCTION ensure_super_admin_roles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    super_admin_emails TEXT[] := ARRAY['qurbanov@gmail.com'];
    admin_email TEXT;
    user_id UUID;
BEGIN
    -- Loop through super admin emails and update their roles
    FOREACH admin_email IN ARRAY super_admin_emails LOOP
        -- Find user by email
        SELECT id INTO user_id
        FROM auth.users
        WHERE email = admin_email;
        
        IF user_id IS NOT NULL THEN
            -- Update the user's role in metadata
            UPDATE auth.users 
            SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin')
            WHERE id = user_id;
            
            RAISE NOTICE 'Updated super admin role for user: %', admin_email;
        ELSE
            RAISE NOTICE 'User not found for email: %', admin_email;
        END IF;
    END LOOP;
END;
$$;

-- Execute the function to set up super admin roles
SELECT ensure_super_admin_roles();

-- Create a trigger to automatically assign super admin role on user creation for specific emails
CREATE OR REPLACE FUNCTION auto_assign_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    super_admin_emails TEXT[] := ARRAY['qurbanov@gmail.com'];
BEGIN
    -- Check if the new user's email is in the super admin list
    IF NEW.email = ANY(super_admin_emails) THEN
        NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin');
        RAISE NOTICE 'Auto-assigned super admin role to: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_assign_super_admin ON auth.users;

-- Create trigger on user insert/update
CREATE TRIGGER trigger_auto_assign_super_admin
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_super_admin_role();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION ensure_super_admin_roles() TO postgres;
GRANT EXECUTE ON FUNCTION auto_assign_super_admin_role() TO postgres;

-- Verify the setup by checking current super admin users
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'super_admin'
   OR email = ANY(ARRAY['qurbanov@gmail.com']);
