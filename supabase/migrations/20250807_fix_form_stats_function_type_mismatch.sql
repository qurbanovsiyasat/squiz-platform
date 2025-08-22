-- Fix Form Stats Function Type Mismatch Migration
-- Date: 2025-08-07
-- Fixes: Change category field return type from VARCHAR(255) to TEXT to match frontend expectations

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_forms_with_stats();
DROP FUNCTION IF EXISTS get_form_with_stats(UUID);

-- Function to get all forms with statistics (likes, views, submissions)
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
    category TEXT,  -- FIXED: Changed from VARCHAR(255) to TEXT
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
        COALESCE(c.name, 'Uncategorized')::TEXT as category,  -- FIXED: Explicit cast to TEXT
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

-- Function to get a single form with statistics
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
    category TEXT,  -- FIXED: Changed from VARCHAR(255) to TEXT
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
        COALESCE(c.name, 'Uncategorized')::TEXT as category,  -- FIXED: Explicit cast to TEXT
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_forms_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_forms_with_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_form_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_with_stats(UUID) TO anon;
