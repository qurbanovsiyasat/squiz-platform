-- Migration: create_qa_search_functions
-- Created at: 1754316920
-- Create search functions for Q&A questions

-- Function to search Q&A questions with advanced filtering and sorting
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

-- Function to get single Q&A question with details
CREATE OR REPLACE FUNCTION get_qa_question_with_details(p_question_id UUID)
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
    WHERE q.id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment question view count
CREATE OR REPLACE FUNCTION increment_qa_question_views(p_question_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE qa_questions 
    SET views = COALESCE(views, 0) + 1 
    WHERE id = p_question_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
