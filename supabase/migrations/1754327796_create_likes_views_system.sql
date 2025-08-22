-- Migration: create_likes_views_system
-- Created at: 1754327796

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
ALTER TABLE quiz_views ENABLE ROW LEVEL SECURITY;;