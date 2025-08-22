-- Migration: create_admin_delete_functions
-- Created at: 1754316824

-- Create admin delete functions for different content types

-- Function to delete Q&A questions (admin and super admin)
CREATE OR REPLACE FUNCTION delete_qa_question(question_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete associated answers first (cascade should handle this but being explicit)
    DELETE FROM qa_answers WHERE question_id = question_id;
    
    -- Delete the question
    DELETE FROM qa_questions WHERE id = question_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete question: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete Q&A answers (admin and super admin)
CREATE OR REPLACE FUNCTION delete_qa_answer(answer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete the answer
    DELETE FROM qa_answers WHERE id = answer_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete answer: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete forms (admin and super admin)
CREATE OR REPLACE FUNCTION delete_form(form_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete associated data first
    DELETE FROM form_replies WHERE form_id = form_id;
    DELETE FROM form_submissions WHERE form_id = form_id;
    DELETE FROM form_fields WHERE form_id = form_id;
    DELETE FROM form_likes WHERE form_id = form_id;
    
    -- Delete the form
    DELETE FROM forms WHERE id = form_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete form: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete form replies (admin and super admin)
CREATE OR REPLACE FUNCTION delete_form_reply(reply_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin or super admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Delete the reply
    DELETE FROM form_replies WHERE id = reply_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete reply: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete quizzes (super admin only)
CREATE OR REPLACE FUNCTION delete_quiz(quiz_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;
    
    -- Delete associated data first
    DELETE FROM quiz_results WHERE quiz_id = quiz_id;
    DELETE FROM questions WHERE quiz_id = quiz_id;
    
    -- Delete the quiz
    DELETE FROM quizzes WHERE id = quiz_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete quiz: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;