-- Migration: fix_all_rpc_functions
-- Created at: 1754338000
-- Comprehensive fix for all RPC function issues

-- ===============================
-- 1. Fix get_categories_by_type function
-- ===============================

-- Drop all possible versions
DROP FUNCTION IF EXISTS get_categories_by_type(VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(VARCHAR(50));
DROP FUNCTION IF EXISTS get_categories_by_type(category_type VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(category_type VARCHAR(50));
DROP FUNCTION IF EXISTS get_categories_by_type(p_category_type VARCHAR);
DROP FUNCTION IF EXISTS get_categories_by_type(p_category_type VARCHAR(50));

-- Create the correct version
CREATE OR REPLACE FUNCTION get_categories_by_type(p_category_type VARCHAR(50))
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
    IF p_category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa.';
    END IF;
    
    RETURN QUERY
    SELECT c.id, c.name, c.type, c.description, c.created_at, c.updated_at
    FROM categories c
    WHERE c.type = p_category_type
    ORDER BY c.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 2. Fix search_qa_questions function
-- ===============================

-- Drop all versions
DROP FUNCTION IF EXISTS search_qa_questions(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS search_qa_questions(text, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS search_qa_questions(varchar, uuid, varchar, integer, integer);

-- Create correct version
CREATE OR REPLACE FUNCTION search_qa_questions(
    search_query TEXT DEFAULT '',
    category_filter UUID DEFAULT NULL,
    sort_by TEXT DEFAULT 'recent',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    content TEXT,
    author_id UUID,
    author_name VARCHAR(255),
    tags TEXT[],
    views INTEGER,
    votes_score INTEGER,
    is_answered BOOLEAN,
    accepted_answer_id UUID,
    category_id UUID,
    category_name VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.title,
        q.content,
        q.author_id,
        COALESCE(u.full_name, 'Anonymous') as author_name,
        q.tags,
        COALESCE(q.views, 0) as views,
        COALESCE(q.votes_score, 0) as votes_score,
        COALESCE(q.is_answered, false) as is_answered,
        q.accepted_answer_id,
        q.category_id,
        c.name as category_name,
        q.image_url,
        q.created_at,
        q.updated_at
    FROM qa_questions q
    LEFT JOIN users u ON q.author_id = u.id
    LEFT JOIN categories c ON q.category_id = c.id
    WHERE 
        (search_query = '' OR 
         q.title ILIKE '%' || search_query || '%' OR 
         q.content ILIKE '%' || search_query || '%' OR
         EXISTS (SELECT 1 FROM unnest(q.tags) tag WHERE tag ILIKE '%' || search_query || '%'))
        AND (category_filter IS NULL OR q.category_id = category_filter)
    ORDER BY 
        CASE 
            WHEN sort_by = 'recent' THEN q.created_at
            WHEN sort_by = 'updated' THEN q.updated_at
            ELSE q.created_at
        END DESC,
        CASE 
            WHEN sort_by = 'votes' THEN q.votes_score
            ELSE 0
        END DESC,
        CASE 
            WHEN sort_by = 'unanswered' THEN (NOT q.is_answered)::INTEGER
            ELSE 0
        END DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 3. Fix get_forms_with_stats function
-- ===============================

-- Drop existing versions
DROP FUNCTION IF EXISTS get_forms_with_stats();

-- Create correct version
CREATE OR REPLACE FUNCTION get_forms_with_stats()
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    creator_id UUID,
    creator_full_name VARCHAR(255),
    settings JSONB,
    is_public BOOLEAN,
    access_code VARCHAR(50),
    category_id UUID,
    category VARCHAR(255),
    likes_count INTEGER,
    views_count INTEGER,
    submission_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.title,
        f.description,
        f.creator_id,
        COALESCE(u.full_name, 'Anonymous') as creator_full_name,
        f.settings,
        f.is_public,
        f.access_code,
        f.category_id,
        c.name as category,
        COALESCE(like_counts.count, 0)::INTEGER as likes_count,
        COALESCE(view_counts.count, 0)::INTEGER as views_count,
        COALESCE(submission_counts.count, 0)::INTEGER as submission_count,
        f.created_at,
        f.updated_at
    FROM forms f
    LEFT JOIN users u ON f.creator_id = u.id
    LEFT JOIN categories c ON f.category_id = c.id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_likes
        GROUP BY form_id
    ) like_counts ON f.id = like_counts.form_id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_views
        GROUP BY form_id
    ) view_counts ON f.id = view_counts.form_id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_submissions
        GROUP BY form_id
    ) submission_counts ON f.id = submission_counts.form_id
    WHERE f.is_public = true OR f.creator_id = auth.uid()
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 4. Fix get_form_with_stats function
-- ===============================

-- Drop existing versions
DROP FUNCTION IF EXISTS get_form_with_stats(UUID);
DROP FUNCTION IF EXISTS get_form_with_details(UUID);

-- Create correct version
CREATE OR REPLACE FUNCTION get_form_with_stats(p_form_id UUID)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    creator_id UUID,
    creator_full_name VARCHAR(255),
    settings JSONB,
    is_public BOOLEAN,
    access_code VARCHAR(50),
    category_id UUID,
    category VARCHAR(255),
    likes_count INTEGER,
    views_count INTEGER,
    submission_count INTEGER,
    user_liked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_has_liked BOOLEAN := FALSE;
BEGIN
    -- Check if current user liked this form
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM form_likes 
            WHERE form_id = p_form_id AND user_id = auth.uid()
        ) INTO user_has_liked;
    END IF;

    RETURN QUERY
    SELECT 
        f.id,
        f.title,
        f.description,
        f.creator_id,
        COALESCE(u.full_name, 'Anonymous') as creator_full_name,
        f.settings,
        f.is_public,
        f.access_code,
        f.category_id,
        c.name as category,
        COALESCE(like_counts.count, 0)::INTEGER as likes_count,
        COALESCE(view_counts.count, 0)::INTEGER as views_count,
        COALESCE(submission_counts.count, 0)::INTEGER as submission_count,
        user_has_liked as user_liked,
        f.created_at,
        f.updated_at
    FROM forms f
    LEFT JOIN users u ON f.creator_id = u.id
    LEFT JOIN categories c ON f.category_id = c.id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_likes
        GROUP BY form_id
    ) like_counts ON f.id = like_counts.form_id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_views
        GROUP BY form_id
    ) view_counts ON f.id = view_counts.form_id
    LEFT JOIN (
        SELECT form_id, COUNT(*) as count
        FROM form_submissions
        GROUP BY form_id
    ) submission_counts ON f.id = submission_counts.form_id
    WHERE f.id = p_form_id 
    AND (f.is_public = true OR f.creator_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 5. Ensure all required tables exist with proper structure
-- ===============================

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('quiz', 'form', 'qa')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Insert default categories if they don't exist
INSERT INTO categories (name, type, description) VALUES
-- Q&A Categories
('Riyaziyyat', 'qa', 'Riyaziyyat mövzularında suallar'),
('Fizika', 'qa', 'Fizika mövzularında suallar'),
('Kimya', 'qa', 'Kimya mövzularında suallar'),
('İnformatika', 'qa', 'İnformatika və proqramlaşdırma sualları'),
('Biologiya', 'qa', 'Biologiya mövzularında suallar'),
('Ümumi', 'qa', 'Ümumi suallar'),
-- Form Categories  
('Qeydiyyat Formaları', 'form', 'Qeydiyyat və müraciət formaları'),
('Sorğu Formaları', 'form', 'Rəy və sorğu formaları'),
('Test Formaları', 'form', 'Test və qiymətləndirmə formaları'),
('Əlaqə Formaları', 'form', 'Əlaqə və dəstək formaları'),
('Qiymətləndirmə', 'form', 'Qiymətləndirmə formaları'),
('Müsabiqə', 'form', 'Müsabiqə formaları'),
-- Quiz Categories
('Riyaziyyat Testləri', 'quiz', 'Riyaziyyat üzrə test sualları'),
('Fizika Testləri', 'quiz', 'Fizika üzrə test sualları'), 
('Kimya Testləri', 'quiz', 'Kimya üzrə test sualları'),
('İnformatika Testləri', 'quiz', 'İnformatika üzrə test sualları'),
('Biologiya Testləri', 'quiz', 'Biologiya üzrə test sualları'),
('Ümumi Bilik', 'quiz', 'Ümumi bilik testləri')
ON CONFLICT (name, type) DO NOTHING;

-- ===============================
-- 6. Grant proper permissions
-- ===============================

-- Grant execute permissions to all functions
GRANT EXECUTE ON FUNCTION get_categories_by_type(VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_by_type(VARCHAR(50)) TO anon;
GRANT EXECUTE ON FUNCTION search_qa_questions(TEXT, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_qa_questions(TEXT, UUID, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_forms_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_forms_with_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_form_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_with_stats(UUID) TO anon;

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );
