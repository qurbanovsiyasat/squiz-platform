-- Create function to get quiz leaderboard with first attempts only
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
  completed_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
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
      u.full_name,
      u.avatar_url
    FROM quiz_results qr
    LEFT JOIN auth.users u ON qr.user_id = u.id
    WHERE qr.quiz_id = get_quiz_first_attempts_leaderboard.quiz_id
    ORDER BY qr.user_id, qr.created_at ASC
  )
  SELECT 
    fa.id,
    fa.quiz_id,
    fa.user_id,
    fa.score,
    fa.time_taken,
    fa.created_at,
    fa.full_name,
    fa.avatar_url,
    fa.answers,
    fa.completed_at
  FROM first_attempts fa
  ORDER BY fa.score DESC, fa.time_taken ASC
  LIMIT 50;
END;
$$;
