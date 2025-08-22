-- Migration: create_qa_likes_views_functions
-- Created at: 1754327829

-- Migration: create_qa_likes_views_functions  
-- Created at: 1754316932
-- Create Q&A like and view functions

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
$$ LANGUAGE plpgsql SECURITY DEFINER;;