import { supabase } from '@/lib/supabase'

// Get all categories from database
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) throw error
  return data
}

// Update quiz view count
export const incrementViewCount = async (quizId: string) => {
  const { error } = await supabase
    .rpc('increment_view_count', {
      table_name: 'quizzes',
      record_id: quizId
    })
  
  if (error) throw error
}

// Verify quiz access code
export const verifyQuizAccess = async (quizId: string, accessCode: string) => {
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('access_code, is_public')
    .eq('id', quizId)
    .single()

  if (error) throw error

  if (quiz.is_public) {
    return { success: true }
  }

  if (quiz.access_code !== accessCode) {
    throw new Error('Invalid access code')
  }

  return { success: true }
}

// Get quiz statistics
export const getQuizStatistics = async (quizId: string) => {
  const { data, error } = await supabase
    .rpc('get_quiz_statistics', { quiz_id: quizId })
  
  if (error) throw error
  return data
}
