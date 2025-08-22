-- Migration: create_likes_views_system
-- Created at: 1754316930
-- Create comprehensive like and view tracking system

-- Create form_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, user_id)
);

-- Create form_views table for tracking unique views
CREATE TABLE IF NOT EXISTS form_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, user_id)
);

-- Create qa_likes table for Q&A questions and answers
CREATE TABLE IF NOT EXISTS qa_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT qa_likes_single_target CHECK (
        (question_id IS NOT NULL AND answer_id IS NULL) OR 
        (question_id IS NULL AND answer_id IS NOT NULL)
    ),
    UNIQUE(question_id, user_id),
    UNIQUE(answer_id, user_id)
);

-- Create qa_views table for tracking question views
CREATE TABLE IF NOT EXISTS qa_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- Create quiz_likes table
CREATE TABLE IF NOT EXISTS quiz_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

-- Create quiz_views table
CREATE TABLE IF NOT EXISTS quiz_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_likes_form_id ON form_likes(form_id);
CREATE INDEX IF NOT EXISTS idx_form_likes_user_id ON form_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_form_views_form_id ON form_views(form_id);
CREATE INDEX IF NOT EXISTS idx_form_views_user_id ON form_views(user_id);

CREATE INDEX IF NOT EXISTS idx_qa_likes_question_id ON qa_likes(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_likes_answer_id ON qa_likes(answer_id);
CREATE INDEX IF NOT EXISTS idx_qa_likes_user_id ON qa_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_views_question_id ON qa_views(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_views_user_id ON qa_views(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_likes_quiz_id ON quiz_likes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_likes_user_id ON quiz_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_views_quiz_id ON quiz_views(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_views_user_id ON quiz_views(user_id);

-- Enable RLS
ALTER TABLE form_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_likes
CREATE POLICY "Anyone can view form likes" ON form_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own form likes" ON form_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for form_views
CREATE POLICY "Anyone can view form view counts" ON form_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create form views" ON form_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for qa_likes
CREATE POLICY "Anyone can view qa likes" ON qa_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own qa likes" ON qa_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for qa_views
CREATE POLICY "Anyone can view qa view counts" ON qa_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create qa views" ON qa_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_likes
CREATE POLICY "Anyone can view quiz likes" ON quiz_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own quiz likes" ON quiz_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_views
CREATE POLICY "Anyone can view quiz view counts" ON quiz_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create quiz views" ON quiz_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to toggle form like
CREATE OR REPLACE FUNCTION toggle_form_like(p_form_id UUID)
RETURNS TABLE(liked BOOLEAN, total_likes INTEGER) AS $$
DECLARE
    user_liked BOOLEAN;
    like_count INTEGER;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user already liked this form
    SELECT EXISTS(
        SELECT 1 FROM form_likes 
        WHERE form_id = p_form_id AND user_id = auth.uid()
    ) INTO user_liked;
    
    IF user_liked THEN
        -- Remove like
        DELETE FROM form_likes 
        WHERE form_id = p_form_id AND user_id = auth.uid();
        user_liked := FALSE;
    ELSE
        -- Add like
        INSERT INTO form_likes (form_id, user_id) 
        VALUES (p_form_id, auth.uid())
        ON CONFLICT (form_id, user_id) DO NOTHING;
        user_liked := TRUE;
    END IF;
    
    -- Get total likes count
    SELECT COUNT(*) INTO like_count 
    FROM form_likes 
    WHERE form_id = p_form_id;
    
    RETURN QUERY SELECT user_liked, like_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record form view
CREATE OR REPLACE FUNCTION record_form_view(
    p_form_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Insert view record (or ignore if already exists for this user)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO form_views (form_id, user_id, ip_address, user_agent)
        VALUES (p_form_id, auth.uid(), p_ip_address, p_user_agent)
        ON CONFLICT (form_id, user_id) DO NOTHING;
    END IF;
    
    -- Get total unique views count
    SELECT COUNT(*) INTO view_count 
    FROM form_views 
    WHERE form_id = p_form_id;
    
    RETURN view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get form stats (likes and views)
CREATE OR REPLACE FUNCTION get_form_stats(p_form_id UUID)
RETURNS TABLE(
    total_likes INTEGER,
    total_views INTEGER,
    user_liked BOOLEAN
) AS $$
DECLARE
    like_count INTEGER;
    view_count INTEGER;
    user_has_liked BOOLEAN := FALSE;
BEGIN
    -- Get likes count
    SELECT COUNT(*) INTO like_count 
    FROM form_likes 
    WHERE form_id = p_form_id;
    
    -- Get views count
    SELECT COUNT(*) INTO view_count 
    FROM form_views 
    WHERE form_id = p_form_id;
    
    -- Check if current user liked this form
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM form_likes 
            WHERE form_id = p_form_id AND user_id = auth.uid()
        ) INTO user_has_liked;
    END IF;
    
    RETURN QUERY SELECT like_count, view_count, user_has_liked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle Q&A question like
CREATE OR REPLACE FUNCTION toggle_qa_question_like(p_question_id UUID)
RETURNS TABLE(liked BOOLEAN, total_likes INTEGER) AS $$
DECLARE
    user_liked BOOLEAN;
    like_count INTEGER;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user already liked this question
    SELECT EXISTS(
        SELECT 1 FROM qa_likes 
        WHERE question_id = p_question_id AND user_id = auth.uid()
    ) INTO user_liked;
    
    IF user_liked THEN
        -- Remove like
        DELETE FROM qa_likes 
        WHERE question_id = p_question_id AND user_id = auth.uid();
        user_liked := FALSE;
    ELSE
        -- Add like
        INSERT INTO qa_likes (question_id, user_id) 
        VALUES (p_question_id, auth.uid())
        ON CONFLICT (question_id, user_id) DO NOTHING;
        user_liked := TRUE;
    END IF;
    
    -- Get total likes count
    SELECT COUNT(*) INTO like_count 
    FROM qa_likes 
    WHERE question_id = p_question_id;
    
    RETURN QUERY SELECT user_liked, like_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record Q&A question view
CREATE OR REPLACE FUNCTION record_qa_view(
    p_question_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Insert view record (or ignore if already exists for this user)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO qa_views (question_id, user_id, ip_address, user_agent)
        VALUES (p_question_id, auth.uid(), p_ip_address, p_user_agent)
        ON CONFLICT (question_id, user_id) DO NOTHING;
    END IF;
    
    -- Get total unique views count
    SELECT COUNT(*) INTO view_count 
    FROM qa_views 
    WHERE question_id = p_question_id;
    
    RETURN view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
