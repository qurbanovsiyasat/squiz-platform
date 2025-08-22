-- Migration: fix_ambiguous_column_references
-- Created at: 1754316900
-- Fix ambiguous column reference errors in RPC functions

-- Drop existing functions first
DROP FUNCTION IF EXISTS delete_qa_question(UUID);
DROP FUNCTION IF EXISTS delete_form(UUID);
DROP FUNCTION IF EXISTS delete_quiz(UUID);

-- Function to delete Q&A questions (admin and super admin) - FIXED
CREATE OR REPLACE FUNCTION delete_qa_question(p_question_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete associated answers first (cascade should handle this but being explicit)
    DELETE FROM qa_answers WHERE qa_answers.question_id = p_question_id;
    
    -- Delete the question
    DELETE FROM qa_questions WHERE qa_questions.id = p_question_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete question: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete forms (admin and super admin) - FIXED
CREATE OR REPLACE FUNCTION delete_form(p_form_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete associated data first
    DELETE FROM form_replies WHERE form_replies.form_id = p_form_id;
    DELETE FROM form_submissions WHERE form_submissions.form_id = p_form_id;
    DELETE FROM form_fields WHERE form_fields.form_id = p_form_id;
    DELETE FROM form_likes WHERE form_likes.form_id = p_form_id;
    
    -- Delete the form
    DELETE FROM forms WHERE forms.id = p_form_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete form: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete quizzes (super admin only) - FIXED
CREATE OR REPLACE FUNCTION delete_quiz(p_quiz_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Delete associated data first
    DELETE FROM quiz_results WHERE quiz_results.quiz_id = p_quiz_id;
    DELETE FROM questions WHERE questions.quiz_id = p_quiz_id;
    
    -- Delete the quiz
    DELETE FROM quizzes WHERE quizzes.id = p_quiz_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete quiz: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_categories_by_type function as well
DROP FUNCTION IF EXISTS get_categories_by_type(VARCHAR);

CREATE OR REPLACE FUNCTION get_categories_by_type(p_category_type VARCHAR(50))
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Validate category type
    IF p_category_type NOT IN ('quiz', 'form', 'qa') THEN
        RAISE EXCEPTION 'Invalid category type. Must be quiz, form, or qa.';
    END IF;
    
    RETURN QUERY
    SELECT c.id, c.name, c.type, c.description, c.created_at, c.updated_at
    FROM categories c
    WHERE c.type = p_category_type
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
