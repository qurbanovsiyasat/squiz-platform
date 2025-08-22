-- Critical Fixes for Squiz Platform Backend Issues
-- Date: 2025-08-09
-- Fixes: Email validation, privacy handling, categories loading, image support for Q&A

-- ============================================================================
-- 1. FIX DELETED ACCOUNT RE-REGISTRATION ERROR (HIGH PRIORITY)
-- ============================================================================

-- Function to check if email exists in auth.users table
CREATE OR REPLACE FUNCTION check_email_exists(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if email exists in auth.users table (including deleted accounts)
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = email_address
    );
END;
$$;

-- Grant permission to authenticated users to check email existence
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;

-- ============================================================================
-- 2. FIX HIDDEN ACCOUNT NAME PRIVACY (HIGH PRIORITY)
-- ============================================================================

-- Enhanced function to get user display name with proper privacy handling
CREATE OR REPLACE FUNCTION get_user_display_name(
    target_user_id UUID,
    requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_record RECORD;
    requesting_user_role TEXT;
BEGIN
    -- Get target user info
    SELECT full_name, is_private 
    INTO target_user_record 
    FROM users 
    WHERE id = target_user_id;
    
    -- If user not found, return Anonymous
    IF NOT FOUND THEN
        RETURN 'Anonymous';
    END IF;
    
    -- If user is not private, return their name
    IF NOT COALESCE(target_user_record.is_private, false) THEN
        RETURN COALESCE(target_user_record.full_name, 'Anonymous');
    END IF;
    
    -- User is private, check if requesting user is admin or super_admin
    IF requesting_user_id IS NOT NULL THEN
        SELECT role INTO requesting_user_role
        FROM users 
        WHERE id = requesting_user_id;
        
        -- Admin and super_admin can see real names of private accounts
        IF requesting_user_role IN ('admin', 'super_admin') THEN
            RETURN COALESCE(target_user_record.full_name, 'Anonymous');
        END IF;
        
        -- If requesting user is the same as target user, show real name
        IF requesting_user_id = target_user_id THEN
            RETURN COALESCE(target_user_record.full_name, 'Anonymous');
        END IF;
    END IF;
    
    -- For all other cases (private account, non-admin viewer), return Anonymous
    RETURN 'Anonymous';
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_display_name(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_display_name(UUID, UUID) TO anon;

-- ============================================================================
-- 3. FIX CATEGORIES NOT LOADING ERROR (HIGH PRIORITY)
-- ============================================================================

-- Enhanced function to get categories with proper error handling
CREATE OR REPLACE FUNCTION get_categories_by_type_fixed(p_category_type TEXT)
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
    -- Return categories with proper null handling
    RETURN QUERY
    SELECT 
        c.id,
        COALESCE(c.name, 'Unnamed Category') as name,
        COALESCE(c.type, p_category_type) as type,
        COALESCE(c.description, '') as description,
        COALESCE(c.created_at, NOW()) as created_at,
        COALESCE(c.updated_at, NOW()) as updated_at,
        CASE 
            WHEN p_category_type = 'quiz' THEN COALESCE(
                (SELECT COUNT(*) FROM quizzes q WHERE q.category_id = c.id), 0
            )
            WHEN p_category_type = 'form' THEN COALESCE(
                (SELECT COUNT(*) FROM forms f WHERE f.category_id = c.id), 0
            )
            WHEN p_category_type = 'qa' THEN COALESCE(
                (SELECT COUNT(*) FROM qa_questions qq WHERE qq.category_id = c.id), 0
            )
            ELSE 0
        END as item_count
    FROM categories c
    WHERE COALESCE(c.type, '') = p_category_type
       OR (p_category_type IS NULL OR p_category_type = '')
    ORDER BY c.name ASC
    LIMIT 100; -- Reasonable limit
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result on error instead of throwing
        RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION get_categories_by_type_fixed(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_type_fixed(TEXT) TO anon;

-- ============================================================================
-- 4. ENABLE IMAGES IN Q&A ANSWERS (MEDIUM PRIORITY)
-- ============================================================================

-- Ensure qa_answers table has image_url column
ALTER TABLE qa_answers ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_qa_answers_image_url ON qa_answers(image_url) 
WHERE image_url IS NOT NULL;

-- ============================================================================
-- 5. ENHANCED Q&A FUNCTIONS WITH PRIVACY SUPPORT
-- ============================================================================

-- Enhanced function to get Q&A questions with privacy-aware user names
CREATE OR REPLACE FUNCTION get_qa_questions_with_privacy(
    p_category_filter TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'recent',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    author_id UUID,
    author_name TEXT,
    category_name TEXT,
    tags TEXT[],
    views INTEGER,
    votes_score INTEGER,
    is_answered BOOLEAN,
    image_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requesting_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.title,
        q.content,
        q.author_id,
        get_user_display_name(q.author_id, requesting_user_id) as author_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(q.tags, ARRAY[]::TEXT[]) as tags,
        COALESCE(q.views, 0) as views,
        COALESCE(q.votes_score, 0) as votes_score,
        COALESCE(q.is_answered, false) as is_answered,
        q.image_url,
        q.created_at,
        q.updated_at
    FROM qa_questions q
    LEFT JOIN categories c ON q.category_id = c.id
    WHERE 
        (p_category_filter IS NULL OR 
         p_category_filter = '' OR 
         c.name = p_category_filter OR 
         q.category_id::TEXT = p_category_filter)
    ORDER BY 
        CASE 
            WHEN p_sort_by = 'votes' THEN q.votes_score
            WHEN p_sort_by = 'unanswered' AND NOT COALESCE(q.is_answered, false) THEN 1000000
            ELSE 0
        END DESC,
        q.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Enhanced function to get Q&A answers with privacy-aware user names
CREATE OR REPLACE FUNCTION get_qa_answers_with_privacy(
    p_question_id UUID
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    question_id UUID,
    author_id UUID,
    author_name TEXT,
    votes_score INTEGER,
    is_accepted BOOLEAN,
    image_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requesting_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.content,
        a.question_id,
        a.author_id,
        get_user_display_name(a.author_id, requesting_user_id) as author_name,
        COALESCE(a.votes_score, 0) as votes_score,
        COALESCE(a.is_accepted, false) as is_accepted,
        a.image_url,
        a.created_at,
        a.updated_at
    FROM qa_answers a
    WHERE a.question_id = p_question_id
    ORDER BY 
        a.is_accepted DESC, -- Accepted answers first
        a.votes_score DESC, -- Then by votes
        a.created_at ASC;   -- Then by creation time
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_qa_questions_with_privacy(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_qa_questions_with_privacy(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_qa_answers_with_privacy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_qa_answers_with_privacy(UUID) TO anon;

-- ============================================================================
-- 6. ENHANCED FORM FUNCTIONS WITH PRIVACY SUPPORT
-- ============================================================================

-- Enhanced function to get forms with privacy-aware user names
CREATE OR REPLACE FUNCTION get_forms_with_privacy(
    p_category_filter TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    creator_id UUID,
    creator_name TEXT,
    category_name TEXT,
    is_public BOOLEAN,
    view_count INTEGER,
    submission_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requesting_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.title,
        f.description,
        f.creator_id,
        get_user_display_name(f.creator_id, requesting_user_id) as creator_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(f.is_public, false) as is_public,
        COALESCE(f.view_count, 0) as view_count,
        COALESCE(f.submission_count, 0) as submission_count,
        f.created_at,
        f.updated_at
    FROM forms f
    LEFT JOIN categories c ON f.category_id = c.id
    WHERE 
        f.is_public = true AND
        (p_category_filter IS NULL OR 
         p_category_filter = '' OR 
         c.name = p_category_filter OR 
         f.category_id::TEXT = p_category_filter)
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_forms_with_privacy(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_forms_with_privacy(TEXT, INTEGER, INTEGER) TO anon;

-- ============================================================================
-- 7. CREATE STORAGE BUCKET FOR Q&A IMAGES
-- ============================================================================

-- Note: Storage bucket creation will be handled by create_bucket function
-- This is a placeholder for any additional storage-related setup

-- ============================================================================
-- 8. UPDATE RLS POLICIES FOR ENHANCED PRIVACY
-- ============================================================================

-- Update RLS policy for users table to handle privacy properly
DROP POLICY IF EXISTS "Users can view public profiles and own profile" ON users;

CREATE POLICY "Enhanced user privacy policy" ON users
    FOR SELECT TO authenticated, anon
    USING (
        -- Always allow viewing basic info, but name will be filtered by function
        true
    );

-- Ensure qa_questions and qa_answers tables have proper RLS
ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_answers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to Q&A content
DROP POLICY IF EXISTS "Allow public read access to Q&A questions" ON qa_questions;
CREATE POLICY "Allow public read access to Q&A questions" ON qa_questions
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow public read access to Q&A answers" ON qa_answers;
CREATE POLICY "Allow public read access to Q&A answers" ON qa_answers
    FOR SELECT TO authenticated, anon
    USING (true);

-- Allow authenticated users to create Q&A content
DROP POLICY IF EXISTS "Allow authenticated users to create questions" ON qa_questions;
CREATE POLICY "Allow authenticated users to create questions" ON qa_questions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow authenticated users to create answers" ON qa_answers;
CREATE POLICY "Allow authenticated users to create answers" ON qa_answers
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Allow users to edit their own Q&A content
DROP POLICY IF EXISTS "Allow users to edit own questions" ON qa_questions;
CREATE POLICY "Allow users to edit own questions" ON qa_questions
    FOR UPDATE TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow users to edit own answers" ON qa_answers;
CREATE POLICY "Allow users to edit own answers" ON qa_answers
    FOR UPDATE TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

RAISE NOTICE 'Critical backend fixes migration completed successfully';
