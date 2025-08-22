-- Comprehensive Bug Fixes Migration
-- Date: 2025-08-05
-- Fixes: Quiz results visibility, ranking system, statistics, form access, Q&A module

-- 1. Ensure quiz_results table has proper columns and indexes
DO $$ 
BEGIN
    -- Add any missing columns to quiz_results if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_results' AND column_name = 'correct_answers') THEN
        ALTER TABLE quiz_results ADD COLUMN correct_answers INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_results' AND column_name = 'total_questions') THEN
        ALTER TABLE quiz_results ADD COLUMN total_questions INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Improve the quiz first attempts leaderboard function
CREATE OR REPLACE FUNCTION get_quiz_first_attempts_leaderboard(quiz_id UUID)
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
    WHERE qr.quiz_id = get_quiz_first_attempts_leaderboard.quiz_id
    ORDER BY qr.user_id, qr.created_at ASC
  ),
  ranked_attempts AS (
    SELECT 
      fa.*,
      ROW_NUMBER() OVER (ORDER BY fa.score DESC, fa.time_taken ASC) as rank
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
  LIMIT 50;
END;
$$;

-- 3. Create function to get quiz statistics
CREATE OR REPLACE FUNCTION get_quiz_statistics(quiz_id UUID)
RETURNS TABLE (
  total_attempts INTEGER,
  unique_participants INTEGER,
  average_score DECIMAL,
  highest_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_attempts,
    COUNT(DISTINCT user_id)::INTEGER as unique_participants,
    ROUND(AVG(score), 2) as average_score,
    MAX(score)::INTEGER as highest_score
  FROM quiz_results qr
  WHERE qr.quiz_id = get_quiz_statistics.quiz_id;
END;
$$;

-- 4. Ensure proper RLS policies for quiz_results
DROP POLICY IF EXISTS "Users can view their own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Users can insert their own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Public read access for quiz results" ON quiz_results;

-- Create more permissive policies for quiz results
CREATE POLICY "Users can view quiz results" ON quiz_results
  FOR SELECT USING (true);

CREATE POLICY "Users can insert quiz results" ON quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz results" ON quiz_results
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Ensure proper RLS policies for qa_questions 
DROP POLICY IF EXISTS "Public read access for QA questions" ON qa_questions;
CREATE POLICY "Public read access for QA questions" ON qa_questions
  FOR SELECT USING (true);

-- 6. Ensure proper RLS policies for forms
DROP POLICY IF EXISTS "Public read access for public forms" ON forms;
CREATE POLICY "Public read access for forms" ON forms
  FOR SELECT USING (is_public = true OR creator_id = auth.uid());

-- 7. Create trigger to automatically update quiz statistics
CREATE OR REPLACE FUNCTION update_quiz_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the quiz's participant count when a new result is added
    UPDATE quizzes 
    SET attempts_count = (
        SELECT COUNT(DISTINCT user_id) 
        FROM quiz_results 
        WHERE quiz_id = NEW.quiz_id
    )
    WHERE id = NEW.quiz_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS quiz_stats_update_trigger ON quiz_results;
CREATE TRIGGER quiz_stats_update_trigger
    AFTER INSERT ON quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_stats();

-- 8. Ensure views column exists and is properly initialized for quizzes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'views') THEN
        ALTER TABLE quizzes ADD COLUMN views INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'attempts_count') THEN
        ALTER TABLE quizzes ADD COLUMN attempts_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 9. Update existing quizzes with proper statistics
UPDATE quizzes 
SET attempts_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM quiz_results 
    WHERE quiz_id = quizzes.id
)
WHERE attempts_count IS NULL OR attempts_count = 0;

-- 10. Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_user_created 
ON quiz_results(user_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_quiz_score 
ON quiz_results(quiz_id, score DESC, time_taken ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_quiz_user 
ON quiz_results(quiz_id, user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_quiz_first_attempts_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_first_attempts_leaderboard(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_quiz_statistics(UUID) TO anon;
