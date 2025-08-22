-- Fix Admin Functions and PostgREST Issues - Corrected
-- Date: 2025-08-09
-- Fixes: Drop existing functions first, then recreate properly

-- 1. DROP EXISTING FUNCTIONS THAT NEED MODIFICATION
DROP FUNCTION IF EXISTS get_all_users_with_admin_info(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_all_users_with_admin_info();
DROP FUNCTION IF EXISTS vote_on_qa_question(UUID, INTEGER);
DROP FUNCTION IF EXISTS vote_on_qa_answer(UUID, INTEGER);

-- 2. FIX QA_VOTES TABLE - Ensure proper structure for voting system
CREATE TABLE IF NOT EXISTS qa_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing constraints and indexes if they exist
DROP INDEX IF EXISTS idx_qa_votes_user_question;
DROP INDEX IF EXISTS idx_qa_votes_user_answer;
DROP INDEX IF EXISTS idx_qa_votes_question;
DROP INDEX IF EXISTS idx_qa_votes_answer;

-- Add unique constraints to prevent duplicate votes
DO $$
BEGIN
    -- Add unique constraint for question votes
    BEGIN
        ALTER TABLE qa_votes ADD CONSTRAINT unique_question_vote UNIQUE(user_id, question_id);
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists
            NULL;
    END;
    
    -- Add unique constraint for answer votes  
    BEGIN
        ALTER TABLE qa_votes ADD CONSTRAINT unique_answer_vote UNIQUE(user_id, answer_id);
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists
            NULL;
    END;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_question ON qa_votes(user_id, question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_answer ON qa_votes(user_id, answer_id) WHERE answer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_question ON qa_votes(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_votes_answer ON qa_votes(answer_id) WHERE answer_id IS NOT NULL;

-- 3. CREATE CORRECTED get_all_users_with_admin_info FUNCTION
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

-- 4. CREATE ENHANCED VOTE HANDLING FUNCTIONS
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

-- 5. GRANT NECESSARY PERMISSIONS
GRANT EXECUTE ON FUNCTION get_all_users_with_admin_info() TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_qa_question(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_qa_answer(UUID, INTEGER) TO authenticated;

-- 6. ENSURE PROPER RLS POLICIES FOR QA_VOTES
ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow viewing votes" ON qa_votes;
DROP POLICY IF EXISTS "Allow managing own votes" ON qa_votes;

-- Allow users to view all votes (for counting)
CREATE POLICY "Allow viewing votes" ON qa_votes
    FOR SELECT TO authenticated, anon
    USING (true);

-- Allow users to manage their own votes
CREATE POLICY "Allow managing own votes" ON qa_votes
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'Admin functions and PostgREST issues migration completed successfully';
