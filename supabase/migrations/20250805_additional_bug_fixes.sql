-- Additional Bug Fixes Migration
-- Date: 2025-08-05
-- Fixes: Additional improvements for mobile, file uploads, and real-time updates

-- 1. Update file upload size limits in edge functions/configurations
-- This would typically be done in Supabase dashboard, but we'll note it here
-- File upload limit should be increased to 30MB for images and PDFs

-- 2. Ensure view counting works properly with unique constraints
CREATE OR REPLACE FUNCTION record_view_safely(content_type TEXT, content_id UUID, user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    view_key TEXT;
BEGIN
    -- Create a unique key for this view
    view_key := content_type || '_' || content_id::TEXT || '_' || COALESCE(user_id::TEXT, session_user);
    
    -- Try to insert a view record, ignore if already exists for this session
    BEGIN
        INSERT INTO content_views (content_type, content_id, viewer_id, view_key, created_at)
        VALUES (content_type, content_id, user_id, view_key, NOW())
        ON CONFLICT (view_key) DO NOTHING;
        
        -- If we successfully inserted a new view, update the counter
        IF FOUND THEN
            CASE content_type
                WHEN 'quiz' THEN
                    UPDATE quizzes SET views = COALESCE(views, 0) + 1 WHERE id = content_id;
                WHEN 'form' THEN
                    UPDATE forms SET view_count = COALESCE(view_count, 0) + 1 WHERE id = content_id;
                WHEN 'qa_question' THEN
                    UPDATE qa_questions SET views = COALESCE(views, 0) + 1 WHERE id = content_id;
            END CASE;
            RETURN TRUE;
        END IF;
        
        RETURN FALSE;
    EXCEPTION
        WHEN unique_violation THEN
            -- View already recorded, return false
            RETURN FALSE;
    END;
END;
$$;

-- 3. Create content_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    viewer_id UUID,
    view_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_views_type_id ON content_views(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_viewer ON content_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_content_views_key ON content_views(view_key);

-- 4. Improve quiz leaderboard function for better performance and accuracy
CREATE OR REPLACE FUNCTION get_quiz_first_attempts_leaderboard_v2(quiz_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  quiz_id UUID,
  user_id UUID,
  score INTEGER,
  time_taken INTEGER,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  avatar_url TEXT,
  answers JSONB,
  completed_at TIMESTAMPTZ,
  correct_answers INTEGER,
  total_questions INTEGER,
  rank INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH first_attempts AS (
    SELECT DISTINCT ON (qr.user_id) 
      qr.id,
      qr.quiz_id,
      qr.user_id,
      qr.score,
      qr.time_taken,
      qr.created_at,
      qr.answers,
      qr.completed_at,
      qr.correct_answers,
      qr.total_questions,
      COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'Anonymous User') as full_name,
      u.raw_user_meta_data->>'avatar_url' as avatar_url
    FROM quiz_results qr
    LEFT JOIN auth.users u ON qr.user_id = u.id
    WHERE qr.quiz_id = get_quiz_first_attempts_leaderboard_v2.quiz_id
    ORDER BY qr.user_id, qr.created_at ASC
  ),
  ranked_attempts AS (
    SELECT 
      fa.*,
      ROW_NUMBER() OVER (ORDER BY fa.score DESC, fa.time_taken ASC, fa.created_at ASC) as rank
    FROM first_attempts fa
  )
  SELECT 
    ra.id,
    ra.quiz_id,
    ra.user_id,
    ra.score,
    ra.time_taken,
    ra.created_at,
    ra.full_name,
    ra.avatar_url,
    ra.answers,
    ra.completed_at,
    ra.correct_answers,
    ra.total_questions,
    ra.rank::INTEGER
  FROM ranked_attempts ra
  ORDER BY ra.rank
  LIMIT limit_count;
END;
$$;

-- 5. Ensure categories table exists and has proper structure
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    category_type TEXT DEFAULT 'quiz',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure quiz_categories table exists too (for compatibility)
CREATE TABLE IF NOT EXISTS quiz_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Improve RLS policies for better form access
DROP POLICY IF EXISTS "Enhanced public read access for forms" ON forms;
CREATE POLICY "Enhanced public read access for forms" ON forms
  FOR SELECT USING (
    is_public = true 
    OR creator_id = auth.uid()
    OR auth.role() = 'authenticated'
  );

-- 7. Add function to clean up old view records (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_view_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete view records older than 7 days
    DELETE FROM content_views 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_view_safely(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_view_safely(TEXT, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_quiz_first_attempts_leaderboard_v2(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_first_attempts_leaderboard_v2(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_view_records() TO authenticated;

-- Enable RLS on new tables
ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE role = 'admin' OR email IN (
    'admin@example.com'
  )
));

CREATE POLICY "Anyone can read quiz categories" ON quiz_categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage quiz categories" ON quiz_categories FOR ALL USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE role = 'admin' OR email IN (
    'admin@example.com'
  )
));

CREATE POLICY "Anyone can read content views" ON content_views FOR SELECT USING (true);
CREATE POLICY "Users can insert their own views" ON content_views FOR INSERT WITH CHECK (
  viewer_id = auth.uid() OR viewer_id IS NULL
);
