-- Migration: Fix forms table relationship and prepare for admin removal
-- Created at: 1754647900

-- 1. Fix forms table creator_id relationship
-- First, ensure the forms table has proper foreign key constraint
ALTER TABLE forms 
DROP CONSTRAINT IF EXISTS forms_creator_id_fkey;

-- Add proper foreign key constraint
ALTER TABLE forms 
ADD CONSTRAINT forms_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Update forms functions to handle relationship properly
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
        COALESCE(u.full_name, u.email, 'Anonymous') as creator_full_name,
        f.settings,
        f.is_public,
        f.access_code,
        f.category_id,
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(like_counts.count, 0)::INTEGER as likes_count,
        COALESCE(view_counts.count, 0)::INTEGER as views_count,
        COALESCE(submission_counts.count, 0)::INTEGER as submission_count,
        f.created_at,
        f.updated_at
    FROM forms f
    LEFT JOIN users u ON f.creator_id = u.id
    LEFT JOIN categories c ON f.category_id = c.id AND c.type = 'form'
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

-- 3. Update single form function
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
        COALESCE(u.full_name, u.email, 'Anonymous') as creator_full_name,
        f.settings,
        f.is_public,
        f.access_code,
        f.category_id,
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(like_counts.count, 0)::INTEGER as likes_count,
        COALESCE(view_counts.count, 0)::INTEGER as views_count,
        COALESCE(submission_counts.count, 0)::INTEGER as submission_count,
        user_has_liked as user_liked,
        f.created_at,
        f.updated_at
    FROM forms f
    LEFT JOIN users u ON f.creator_id = u.id
    LEFT JOIN categories c ON f.category_id = c.id AND c.type = 'form'
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

-- 4. Ensure proper RLS policies for forms
DROP POLICY IF EXISTS "Users can view public forms or their own forms" ON forms;
CREATE POLICY "Users can view public forms or their own forms" 
ON forms FOR SELECT 
USING (is_public = true OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own forms" ON forms;
CREATE POLICY "Users can insert their own forms" 
ON forms FOR INSERT 
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own forms" ON forms;
CREATE POLICY "Users can update their own forms" 
ON forms FOR UPDATE 
USING (creator_id = auth.uid()) 
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own forms" ON forms;
CREATE POLICY "Users can delete their own forms" 
ON forms FOR DELETE 
USING (creator_id = auth.uid());

-- 5. Remove admin-related functions (disable admin role assignment)
DROP FUNCTION IF EXISTS assign_admin_role(UUID);
DROP FUNCTION IF EXISTS remove_admin_role(UUID);
DROP FUNCTION IF EXISTS get_all_users_admin();

-- 6. Create simple user stats function for non-admin use
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID DEFAULT NULL)
RETURNS TABLE(
    user_id UUID,
    quiz_count BIGINT,
    form_count BIGINT,
    qa_count BIGINT,
    total_score BIGINT
) AS $$
BEGIN
    -- Use provided user_id or current auth user
    user_uuid := COALESCE(user_uuid, auth.uid());
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        user_uuid as user_id,
        COALESCE(quiz_stats.count, 0) as quiz_count,
        COALESCE(form_stats.count, 0) as form_count,
        COALESCE(qa_stats.count, 0) as qa_count,
        COALESCE(quiz_stats.total_score, 0) as total_score
    FROM (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN is_public THEN 1 ELSE 0 END), 0) as total_score
        FROM quizzes 
        WHERE creator_id = user_uuid
    ) quiz_stats
    CROSS JOIN (
        SELECT COUNT(*) as count
        FROM forms 
        WHERE creator_id = user_uuid
    ) form_stats
    CROSS JOIN (
        SELECT COUNT(*) as count
        FROM qa_questions 
        WHERE author_id = user_uuid
    ) qa_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_forms_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
