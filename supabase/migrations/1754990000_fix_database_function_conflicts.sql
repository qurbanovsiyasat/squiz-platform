-- Migration: fix_database_function_conflicts
-- Fix conflicting function signatures for get_form_stats and record_form_view

-- Drop conflicting functions first
DROP FUNCTION IF EXISTS get_form_stats(UUID);
DROP FUNCTION IF EXISTS record_form_view(UUID);
DROP FUNCTION IF EXISTS record_form_view(UUID, INET, TEXT);

-- Create consistent get_form_stats function with proper return types
CREATE OR REPLACE FUNCTION get_form_stats(p_form_id UUID)
RETURNS TABLE(
    total_likes BIGINT,
    total_views BIGINT,
    user_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    like_count BIGINT;
    view_count BIGINT;
    user_has_liked BOOLEAN := FALSE;
BEGIN
    -- Get likes count
    SELECT COUNT(*) INTO like_count 
    FROM form_likes 
    WHERE form_id = p_form_id;
    
    -- Get views count from the forms table (more reliable)
    SELECT COALESCE(f.view_count, 0) INTO view_count
    FROM forms f 
    WHERE f.id = p_form_id;
    
    -- If no view count in forms table, count from form_views
    IF view_count = 0 THEN
        SELECT COUNT(*) INTO view_count
        FROM form_views 
        WHERE form_id = p_form_id;
    END IF;
    
    -- Check if current user liked this form
    IF v_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM form_likes 
            WHERE form_id = p_form_id AND user_id = v_user_id
        ) INTO user_has_liked;
    END IF;
    
    RETURN QUERY SELECT like_count, view_count, user_has_liked;
END;
$$;

-- Create simplified record_form_view function
CREATE OR REPLACE FUNCTION record_form_view(p_form_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    new_view_count BIGINT;
BEGIN
    -- Only increment view count if user is authenticated
    IF v_user_id IS NOT NULL THEN
        -- Try to insert a new view record (ignore if already exists)
        INSERT INTO form_views (form_id, user_id, created_at)
        VALUES (p_form_id, v_user_id, NOW())
        ON CONFLICT (form_id, user_id) DO NOTHING;
        
        -- Update the view count in the forms table
        UPDATE forms 
        SET view_count = (
            SELECT COUNT(*) FROM form_views WHERE form_id = p_form_id
        )
        WHERE id = p_form_id;
    END IF;
    
    -- Return current view count
    SELECT COALESCE(view_count, 0) INTO new_view_count
    FROM forms 
    WHERE id = p_form_id;
    
    RETURN new_view_count;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION get_form_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_stats(UUID) TO anon;
GRANT EXECUTE ON FUNCTION record_form_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_form_view(UUID) TO anon;

-- Ensure form_views table exists with proper structure
CREATE TABLE IF NOT EXISTS form_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, user_id)
);

-- Ensure form_likes table exists with proper structure
CREATE TABLE IF NOT EXISTS form_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, user_id)
);

-- Enable RLS on tables
ALTER TABLE form_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for form_views
DROP POLICY IF EXISTS "Anyone can view form view counts" ON form_views;
CREATE POLICY "Anyone can view form view counts" ON form_views
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create form views" ON form_views;
CREATE POLICY "Users can create form views" ON form_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for form_likes
DROP POLICY IF EXISTS "Anyone can view form likes" ON form_likes;
CREATE POLICY "Anyone can view form likes" ON form_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own form likes" ON form_likes;
CREATE POLICY "Users can manage their own form likes" ON form_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
