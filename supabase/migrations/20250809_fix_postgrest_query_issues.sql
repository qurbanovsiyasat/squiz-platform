-- Fix PostgREST Query Issues and Admin Panel Data Loading
-- Date: 2025-08-09
-- Fixes: Invalid PostgREST query syntax, qa_votes queries, admin panel data loading

-- 1. FIX QA_VOTES TABLE - Ensure proper structure for voting system
CREATE TABLE IF NOT EXISTS qa_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can only vote once per question OR answer
    CONSTRAINT unique_question_vote UNIQUE(user_id, question_id),
    CONSTRAINT unique_answer_vote UNIQUE(user_id, answer_id),
    -- Ensure vote is either for question OR answer, not both
    CONSTRAINT vote_target_check CHECK (
        (question_id IS NOT NULL AND answer_id IS NULL) OR 
        (question_id IS NULL AND answer_id IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_question ON qa_votes(user_id, question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_answer ON qa_votes(user_id, answer_id) WHERE answer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_question ON qa_votes(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_answer ON qa_votes(answer_id) WHERE answer_id IS NOT NULL;

-- 2. ENHANCED get_all_users_with_admin_info FUNCTION with better error handling
CREATE OR REPLACE FUNCTION get_all_users_with_admin_info()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    can_create_quiz BOOLEAN,
    is_active BOOLEAN,
    is_private BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_super_admin BOOLEAN,
    is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    ) THEN
        -- Also check auth.users as fallback for super admin
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
                OR auth.users.email = 'qurbanov@gmail.com')
        ) THEN
            RAISE EXCEPTION 'Access denied. Admin privileges required.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.full_name, 'Anonymous') as full_name,
        COALESCE(u.role, 'student') as role,
        COALESCE(u.can_create_quiz, false) as can_create_quiz,
        -- Determine if user is active (signed in within last 30 days or recently created)
        CASE 
            WHEN au.last_sign_in_at IS NULL AND u.created_at > NOW() - INTERVAL '7 days' THEN true
            WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN true
            ELSE false
        END as is_active,
        COALESCE(u.is_private, false) as is_private,
        u.created_at,
        u.updated_at,
        (COALESCE(u.role, 'student') = 'super_admin')::BOOLEAN as is_super_admin,
        (COALESCE(u.role, 'student') IN ('admin', 'super_admin'))::BOOLEAN as is_admin
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    ORDER BY u.created_at DESC
    LIMIT 100; -- Reasonable limit for admin panel
END;
$$;

-- 3. ENHANCED VOTE HANDLING FUNCTIONS with proper null handling
CREATE OR REPLACE FUNCTION vote_on_qa_question(
    p_question_id UUID,
    p_vote_type INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_existing_vote INTEGER;
    v_vote_change INTEGER := 0;
    v_new_score INTEGER;
BEGIN
    -- Check authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;
    
    -- Validate vote type
    IF p_vote_type NOT IN (-1, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid vote type');
    END IF;
    
    -- Check for existing vote (proper null handling)
    SELECT vote_type INTO v_existing_vote
    FROM qa_votes 
    WHERE user_id = v_user_id 
    AND question_id = p_question_id
    AND answer_id IS NULL;
    
    IF v_existing_vote IS NOT NULL THEN
        IF v_existing_vote = p_vote_type THEN
            -- Remove vote (toggle off)
            DELETE FROM qa_votes 
            WHERE user_id = v_user_id 
            AND question_id = p_question_id 
            AND answer_id IS NULL;
            
            v_vote_change = -p_vote_type;
        ELSE
            -- Change vote
            UPDATE qa_votes 
            SET vote_type = p_vote_type, updated_at = NOW()
            WHERE user_id = v_user_id 
            AND question_id = p_question_id 
            AND answer_id IS NULL;
            
            v_vote_change = p_vote_type * 2; -- from -1 to 1 or vice versa
        END IF;
    ELSE
        -- Add new vote
        INSERT INTO qa_votes (user_id, question_id, vote_type)
        VALUES (v_user_id, p_question_id, p_vote_type);
        
        v_vote_change = p_vote_type;
    END IF;
    
    -- Update question score
    UPDATE qa_questions 
    SET votes_score = GREATEST(0, COALESCE(votes_score, 0) + v_vote_change),
        updated_at = NOW()
    WHERE id = p_question_id
    RETURNING votes_score INTO v_new_score;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'new_score', v_new_score,
        'user_vote', CASE 
            WHEN v_existing_vote IS NOT NULL AND v_existing_vote = p_vote_type THEN NULL
            ELSE p_vote_type
        END
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;

CREATE OR REPLACE FUNCTION vote_on_qa_answer(
    p_answer_id UUID,
    p_vote_type INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_existing_vote INTEGER;
    v_vote_change INTEGER := 0;
    v_new_score INTEGER;
BEGIN
    -- Check authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;
    
    -- Validate vote type
    IF p_vote_type NOT IN (-1, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid vote type');
    END IF;
    
    -- Check for existing vote (proper null handling)
    SELECT vote_type INTO v_existing_vote
    FROM qa_votes 
    WHERE user_id = v_user_id 
    AND answer_id = p_answer_id
    AND question_id IS NULL;
    
    IF v_existing_vote IS NOT NULL THEN
        IF v_existing_vote = p_vote_type THEN
            -- Remove vote (toggle off)
            DELETE FROM qa_votes 
            WHERE user_id = v_user_id 
            AND answer_id = p_answer_id 
            AND question_id IS NULL;
            
            v_vote_change = -p_vote_type;
        ELSE
            -- Change vote
            UPDATE qa_votes 
            SET vote_type = p_vote_type, updated_at = NOW()
            WHERE user_id = v_user_id 
            AND answer_id = p_answer_id 
            AND question_id IS NULL;
            
            v_vote_change = p_vote_type * 2;
        END IF;
    ELSE
        -- Add new vote
        INSERT INTO qa_votes (user_id, answer_id, vote_type)
        VALUES (v_user_id, p_answer_id, p_vote_type);
        
        v_vote_change = p_vote_type;
    END IF;
    
    -- Update answer score
    UPDATE qa_answers 
    SET votes_score = GREATEST(0, COALESCE(votes_score, 0) + v_vote_change),
        updated_at = NOW()
    WHERE id = p_answer_id
    RETURNING votes_score INTO v_new_score;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'new_score', v_new_score,
        'user_vote', CASE 
            WHEN v_existing_vote IS NOT NULL AND v_existing_vote = p_vote_type THEN NULL
            ELSE p_vote_type
        END
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;

-- 4. IMPROVED FORM STATS FUNCTIONS with accurate counting
CREATE OR REPLACE FUNCTION get_form_stats_accurate(p_form_id UUID)
RETURNS TABLE (
    total_likes BIGINT,
    total_views BIGINT,
    total_replies BIGINT,
    user_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        (
            SELECT COUNT(*) 
            FROM form_likes fl 
            WHERE fl.form_id = p_form_id
        ) as total_likes,
        (
            SELECT COALESCE(f.view_count, 0) 
            FROM forms f 
            WHERE f.id = p_form_id
        ) as total_views,
        (
            SELECT COUNT(*) 
            FROM form_replies fr 
            WHERE fr.form_id = p_form_id
        ) as total_replies,
        (
            CASE 
                WHEN v_user_id IS NULL THEN false
                ELSE EXISTS (
                    SELECT 1 
                    FROM form_likes fl 
                    WHERE fl.form_id = p_form_id 
                    AND fl.user_id = v_user_id
                )
            END
        ) as user_liked;
END;
$$;

-- 5. ENHANCED CATEGORY MANAGEMENT
CREATE OR REPLACE FUNCTION get_categories_by_type_enhanced(p_category_type TEXT)
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
    -- Check admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.type,
        c.description,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN p_category_type = 'quiz' THEN (
                SELECT COUNT(*) FROM quizzes q WHERE q.category_id = c.id
            )
            WHEN p_category_type = 'form' THEN (
                SELECT COUNT(*) FROM forms f WHERE f.category_id = c.id
            )
            WHEN p_category_type = 'qa' THEN (
                SELECT COUNT(*) FROM qa_questions qq WHERE qq.category_id = c.id
            )
            ELSE 0
        END as item_count
    FROM categories c
    WHERE c.type = p_category_type
    ORDER BY c.name ASC;
END;
$$;

-- 6. GRANT NECESSARY PERMISSIONS
GRANT EXECUTE ON FUNCTION get_all_users_with_admin_info() TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_qa_question(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_qa_answer(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_stats_accurate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_stats_accurate(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_categories_by_type_enhanced(TEXT) TO authenticated;

-- 7. ENSURE PROPER RLS POLICIES FOR QA_VOTES
ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;

-- Allow users to view all votes (for counting)
CREATE POLICY "Allow viewing votes" ON qa_votes
    FOR SELECT TO authenticated, anon
    USING (true);

-- Allow users to manage their own votes
CREATE POLICY "Allow managing own votes" ON qa_votes
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. UPDATE SEARCH FUNCTION to handle null values properly
CREATE OR REPLACE FUNCTION search_qa_questions_enhanced(
    search_query TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'recent',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
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
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_vote INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.title,
        q.content,
        q.author_id,
        COALESCE(u.full_name, 'Anonymous') as author_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(q.tags, ARRAY[]::TEXT[]) as tags,
        COALESCE(q.views, 0) as views,
        COALESCE(q.votes_score, 0) as votes_score,
        COALESCE(q.is_answered, false) as is_answered,
        q.created_at,
        q.updated_at,
        COALESCE(qv.vote_type, 0) as user_vote
    FROM qa_questions q
    LEFT JOIN users u ON q.author_id = u.id
    LEFT JOIN categories c ON q.category_id = c.id
    LEFT JOIN qa_votes qv ON qv.question_id = q.id 
        AND qv.user_id = v_user_id 
        AND qv.answer_id IS NULL
    WHERE 
        (search_query = '' OR 
         q.title ILIKE '%' || search_query || '%' OR 
         q.content ILIKE '%' || search_query || '%')
    AND 
        (category_filter IS NULL OR 
         category_filter = '' OR 
         c.name = category_filter OR 
         q.category_id::TEXT = category_filter)
    ORDER BY 
        CASE 
            WHEN sort_by = 'votes' THEN q.votes_score
            WHEN sort_by = 'unanswered' AND NOT q.is_answered THEN 1000000 -- High priority for unanswered
            ELSE 0
        END DESC,
        q.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_qa_questions_enhanced(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_qa_questions_enhanced(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon;

RAISE NOTICE 'PostgREST query issues migration completed successfully';
