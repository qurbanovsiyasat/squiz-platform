-- Create Q&A Votes and Views System
-- Date: 2025-08-08
-- Purpose: Create missing tables and functions for Q&A voting and view tracking

-- 1. Create qa_votes table for tracking user votes on questions and answers
CREATE TABLE IF NOT EXISTS qa_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT vote_target_check CHECK (
        (question_id IS NOT NULL AND answer_id IS NULL) OR 
        (question_id IS NULL AND answer_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_question_vote UNIQUE (user_id, question_id),
    CONSTRAINT unique_user_answer_vote UNIQUE (user_id, answer_id)
);

-- 2. Create qa_views table for tracking unique views per user per question
CREATE TABLE IF NOT EXISTS qa_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one view per user per question
    CONSTRAINT unique_user_question_view UNIQUE (user_id, question_id)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_id ON qa_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_votes_question_id ON qa_votes(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_votes_answer_id ON qa_votes(answer_id);
CREATE INDEX IF NOT EXISTS idx_qa_views_user_id ON qa_views(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_views_question_id ON qa_views(question_id);

-- 4. Enable RLS on the new tables
ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_views ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for qa_votes
CREATE POLICY "Users can view all votes" ON qa_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON qa_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON qa_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON qa_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for qa_views
CREATE POLICY "Users can view all question views" ON qa_views
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own views" ON qa_views
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 7. Create function to handle voting with proper score updates
CREATE OR REPLACE FUNCTION handle_qa_vote(
    p_user_id UUID,
    p_question_id UUID DEFAULT NULL,
    p_answer_id UUID DEFAULT NULL,
    p_vote_type INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_vote INTEGER;
    vote_change INTEGER;
    new_score INTEGER;
    result JSONB;
BEGIN
    -- Validate input
    IF p_vote_type NOT IN (-1, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid vote type');
    END IF;
    
    IF (p_question_id IS NULL AND p_answer_id IS NULL) OR 
       (p_question_id IS NOT NULL AND p_answer_id IS NOT NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Must specify either question_id or answer_id');
    END IF;
    
    -- Check for existing vote
    IF p_question_id IS NOT NULL THEN
        SELECT vote_type INTO existing_vote 
        FROM qa_votes 
        WHERE user_id = p_user_id AND question_id = p_question_id;
    ELSE
        SELECT vote_type INTO existing_vote 
        FROM qa_votes 
        WHERE user_id = p_user_id AND answer_id = p_answer_id;
    END IF;
    
    -- Calculate vote change
    IF existing_vote IS NULL THEN
        vote_change := p_vote_type;
    ELSIF existing_vote = p_vote_type THEN
        -- Same vote, remove it
        vote_change := -p_vote_type;
        p_vote_type := NULL; -- Will delete the vote
    ELSE
        -- Different vote, change it
        vote_change := p_vote_type * 2; -- from -1 to 1 or vice versa
    END IF;
    
    -- Update or insert vote
    IF p_vote_type IS NULL THEN
        -- Delete vote
        IF p_question_id IS NOT NULL THEN
            DELETE FROM qa_votes WHERE user_id = p_user_id AND question_id = p_question_id;
        ELSE
            DELETE FROM qa_votes WHERE user_id = p_user_id AND answer_id = p_answer_id;
        END IF;
    ELSE
        -- Insert or update vote
        INSERT INTO qa_votes (user_id, question_id, answer_id, vote_type)
        VALUES (p_user_id, p_question_id, p_answer_id, p_vote_type)
        ON CONFLICT (user_id, COALESCE(question_id, '00000000-0000-0000-0000-000000000000'::UUID), 
                    COALESCE(answer_id, '00000000-0000-0000-0000-000000000000'::UUID))
        DO UPDATE SET vote_type = p_vote_type, updated_at = NOW();
    END IF;
    
    -- Update score in the target table
    IF p_question_id IS NOT NULL THEN
        UPDATE qa_questions 
        SET votes_score = GREATEST(0, COALESCE(votes_score, 0) + vote_change),
            updated_at = NOW()
        WHERE id = p_question_id
        RETURNING votes_score INTO new_score;
    ELSE
        UPDATE qa_answers 
        SET votes_score = GREATEST(0, COALESCE(votes_score, 0) + vote_change),
            updated_at = NOW()
        WHERE id = p_answer_id
        RETURNING votes_score INTO new_score;
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'new_score', new_score,
        'user_vote', p_vote_type,
        'vote_change', vote_change
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- 8. Create function to increment question views (only once per user)
CREATE OR REPLACE FUNCTION increment_question_view(
    p_question_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If user is logged in, check if they've already viewed this question
    IF p_user_id IS NOT NULL THEN
        INSERT INTO qa_views (user_id, question_id)
        VALUES (p_user_id, p_question_id)
        ON CONFLICT (user_id, question_id) DO NOTHING;
        
        -- Only increment if this was a new view
        IF FOUND THEN
            UPDATE qa_questions 
            SET views = COALESCE(views, 0) + 1,
                updated_at = NOW()
            WHERE id = p_question_id;
            RETURN true;
        END IF;
    ELSE
        -- For anonymous users, always increment
        UPDATE qa_questions 
        SET views = COALESCE(views, 0) + 1,
            updated_at = NOW()
        WHERE id = p_question_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- 9. Create function to search Q&A questions with enhanced features
CREATE OR REPLACE FUNCTION search_qa_questions(
    search_query TEXT DEFAULT '',
    category_filter UUID DEFAULT NULL,
    sort_by TEXT DEFAULT 'recent',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    author_id UUID,
    tags TEXT[],
    views INTEGER,
    votes_score INTEGER,
    is_answered BOOLEAN,
    accepted_answer_id UUID,
    category_name TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    author_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.title,
        q.content,
        q.author_id,
        q.tags,
        COALESCE(q.views, 0) as views,
        COALESCE(q.votes_score, 0) as votes_score,
        COALESCE(q.is_answered, false) as is_answered,
        q.accepted_answer_id,
        c.name as category_name,
        q.image_url,
        q.created_at,
        q.updated_at,
        COALESCE(u.full_name, 'Anonymous') as author_name
    FROM qa_questions q
    LEFT JOIN categories c ON q.category_id = c.id
    LEFT JOIN auth.users u ON q.author_id = u.id
    WHERE 
        (search_query = '' OR 
         q.title ILIKE '%' || search_query || '%' OR 
         q.content ILIKE '%' || search_query || '%' OR
         EXISTS (SELECT 1 FROM unnest(q.tags) tag WHERE tag ILIKE '%' || search_query || '%'))
    AND (category_filter IS NULL OR q.category_id = category_filter)
    ORDER BY 
        CASE 
            WHEN sort_by = 'votes' THEN q.votes_score
            WHEN sort_by = 'views' THEN q.views
            ELSE 0
        END DESC,
        CASE 
            WHEN sort_by = 'unanswered' AND NOT q.is_answered THEN 1
            WHEN sort_by = 'unanswered' AND q.is_answered THEN 2
            ELSE 0
        END,
        q.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- 10. Grant necessary permissions
GRANT ALL ON qa_votes TO authenticated;
GRANT ALL ON qa_views TO authenticated;
GRANT EXECUTE ON FUNCTION handle_qa_vote TO authenticated;
GRANT EXECUTE ON FUNCTION increment_question_view TO authenticated;
GRANT EXECUTE ON FUNCTION search_qa_questions TO authenticated;

-- 11. Create function to get user role info for AdminContext
CREATE OR REPLACE FUNCTION get_user_role_info(user_id UUID)
RETURNS TABLE(
    role TEXT,
    is_admin BOOLEAN,
    is_super_admin BOOLEAN,
    can_create_quiz BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_email TEXT;
BEGIN
    -- Get user role and email
    SELECT 
        COALESCE(raw_user_meta_data->>'role', 'student'),
        email
    INTO user_role, user_email
    FROM auth.users 
    WHERE id = user_id;
    
    -- Special handling for known super admin emails
    IF user_email = ANY(ARRAY['qurbanov@gmail.com']) THEN
        user_role := 'super_admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        user_role as role,
        (user_role IN ('admin', 'super_admin'))::BOOLEAN as is_admin,
        (user_role = 'super_admin')::BOOLEAN as is_super_admin,
        (user_role IN ('admin', 'super_admin', 'teacher'))::BOOLEAN as can_create_quiz;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_role_info TO authenticated;
