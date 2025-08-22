-- Comprehensive Security & Bug Fixes Migration
-- Date: 2025-08-22
-- Fixes: RLS policies, admin system, category functions, privacy controls

-- ============================================================================
-- 1. ENABLE RLS ON ALL CRITICAL TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. COMPREHENSIVE RLS POLICIES
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Public read access to user profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Public read access to user profiles" ON users
    FOR SELECT TO authenticated, anon
    USING (true); -- Privacy is handled by functions, not RLS

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Categories policies - Public read, admin write
DROP POLICY IF EXISTS "Public read access to categories" ON categories;
DROP POLICY IF EXISTS "Admin users can manage categories" ON categories;

CREATE POLICY "Public read access to categories" ON categories
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Admin users can manage categories" ON categories
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- Forms policies
DROP POLICY IF EXISTS "Public read access to public forms" ON forms;
DROP POLICY IF EXISTS "Users can manage own forms" ON forms;

CREATE POLICY "Public read access to public forms" ON forms
    FOR SELECT TO authenticated, anon
    USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can manage own forms" ON forms
    FOR ALL TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Quizzes policies
DROP POLICY IF EXISTS "Public read access to public quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can manage own quizzes" ON quizzes;

CREATE POLICY "Public read access to public quizzes" ON quizzes
    FOR SELECT TO authenticated, anon
    USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Quiz creators can manage own quizzes" ON quizzes
    FOR ALL TO authenticated
    USING (
        creator_id = auth.uid() AND
        auth.uid() IN (
            SELECT id FROM users 
            WHERE can_create_quiz = true OR role IN ('admin', 'super_admin', 'teacher')
        )
    )
    WITH CHECK (
        creator_id = auth.uid() AND
        auth.uid() IN (
            SELECT id FROM users 
            WHERE can_create_quiz = true OR role IN ('admin', 'super_admin', 'teacher')
        )
    );

-- Q&A policies
DROP POLICY IF EXISTS "Public read access to qa_questions" ON qa_questions;
DROP POLICY IF EXISTS "Authenticated users can manage own qa_questions" ON qa_questions;

CREATE POLICY "Public read access to qa_questions" ON qa_questions
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Authenticated users can manage own qa_questions" ON qa_questions
    FOR ALL TO authenticated
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Public read access to qa_answers" ON qa_answers;
DROP POLICY IF EXISTS "Authenticated users can manage own qa_answers" ON qa_answers;

CREATE POLICY "Public read access to qa_answers" ON qa_answers
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Authenticated users can manage own qa_answers" ON qa_answers
    FOR ALL TO authenticated
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Likes/Views policies
DROP POLICY IF EXISTS "Users can manage own likes" ON form_likes;
DROP POLICY IF EXISTS "Users can manage own views" ON form_views;

CREATE POLICY "Users can manage own likes" ON form_likes
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own views" ON form_views
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. ROLE-BASED FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role IN ('admin', 'super_admin')
    );
END;
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_user_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'super_admin'
    );
END;
$$;

-- Function to assign role (super admin only)
CREATE OR REPLACE FUNCTION assign_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is super admin
    IF NOT is_user_super_admin() THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Unauthorized: Super admin access required');
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'teacher', 'admin', 'super_admin') THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Invalid role');
    END IF;
    
    -- Prevent removing super admin role from yourself
    IF target_user_id = auth.uid() AND new_role != 'super_admin' THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Cannot remove super admin role from yourself');
    END IF;
    
    -- Update user role
    UPDATE users 
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'User not found');
    END IF;
    
    RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Role updated successfully');
END;
$$;

-- Function to grant quiz permission
CREATE OR REPLACE FUNCTION grant_quiz_permission(
    target_user_id UUID,
    can_create BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_user_admin() THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Unauthorized: Admin access required');
    END IF;
    
    -- Update user permission
    UPDATE users 
    SET can_create_quiz = can_create, updated_at = NOW()
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'User not found');
    END IF;
    
    RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Quiz permission updated successfully');
END;
$$;

-- ============================================================================
-- 4. FIXED CATEGORY FUNCTIONS
-- ============================================================================

-- Get categories by type (fixed version)
CREATE OR REPLACE FUNCTION get_categories_by_type(p_type TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    item_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        COALESCE(c.name, 'Unnamed Category') as name,
        COALESCE(c.type, p_type) as type,
        COALESCE(c.description, '') as description,
        COALESCE(c.created_at, NOW()) as created_at,
        COALESCE(c.updated_at, NOW()) as updated_at,
        CASE 
            WHEN p_type = 'quiz' THEN COALESCE(
                (SELECT COUNT(*) FROM quizzes q WHERE q.category_id = c.id), 0
            )
            WHEN p_type = 'form' THEN COALESCE(
                (SELECT COUNT(*) FROM forms f WHERE f.category_id = c.id), 0
            )
            WHEN p_type = 'qa' THEN COALESCE(
                (SELECT COUNT(*) FROM qa_questions qq WHERE qq.category_id = c.id), 0
            )
            ELSE 0
        END as item_count
    FROM categories c
    WHERE (p_type IS NULL OR p_type = '' OR c.type = p_type)
    ORDER BY c.name ASC;
END;
$$;

-- Fixed delete category function
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
    -- Check admin permission
    IF NOT is_user_admin() THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Unauthorized: Admin access required');
    END IF;
    
    -- Get category info
    SELECT type INTO category_type FROM categories WHERE id = category_id;
    
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Category not found');
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
    
    -- Handle items if they exist
    IF items_count > 0 THEN
        IF reassign_to_default THEN
            -- Find or create default category
            SELECT id INTO default_category_id 
            FROM categories 
            WHERE type = category_type AND name = 'General'
            LIMIT 1;
            
            IF default_category_id IS NULL THEN
                INSERT INTO categories (name, type, description, created_at, updated_at)
                VALUES ('General', category_type, 'Default category', NOW(), NOW())
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
        ELSIF NOT force_delete THEN
            RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Category has items. Use force delete or enable reassignment.');
        END IF;
    END IF;
    
    -- Delete the category
    DELETE FROM categories WHERE id = category_id;
    
    RETURN JSON_BUILD_OBJECT(
        'success', true, 
        'message', 'Category deleted successfully',
        'items_reassigned', items_count
    );
END;
$$;

-- ============================================================================
-- 5. PRIVACY FUNCTIONS
-- ============================================================================

-- Get display name with privacy handling
CREATE OR REPLACE FUNCTION get_display_name(
    target_user_id UUID,
    requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user RECORD;
    requesting_role TEXT;
BEGIN
    -- Get target user info
    SELECT full_name, is_private, role
    INTO target_user 
    FROM users 
    WHERE id = target_user_id;
    
    -- If user not found, return Anonymous
    IF NOT FOUND THEN
        RETURN 'Anonymous';
    END IF;
    
    -- If user is not private, return their name
    IF NOT COALESCE(target_user.is_private, false) THEN
        RETURN COALESCE(target_user.full_name, 'Anonymous');
    END IF;
    
    -- User is private, check permissions
    IF requesting_user_id IS NOT NULL THEN
        -- Same user can see their own name
        IF requesting_user_id = target_user_id THEN
            RETURN COALESCE(target_user.full_name, 'Anonymous');
        END IF;
        
        -- Admin can see private names
        SELECT role INTO requesting_role
        FROM users 
        WHERE id = requesting_user_id;
        
        IF requesting_role IN ('admin', 'super_admin') THEN
            RETURN COALESCE(target_user.full_name, 'Anonymous');
        END IF;
    END IF;
    
    -- For all other cases (private account, non-admin viewer), show generic name
    RETURN 'Abituriyent';
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_quiz_permission(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_type(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_category(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_display_name(UUID, UUID) TO authenticated, anon;

RAISE NOTICE 'Comprehensive security and bug fixes migration completed successfully!';
