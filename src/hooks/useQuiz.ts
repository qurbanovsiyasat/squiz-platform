import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, Quiz, Question, QuizResult } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// Get all quizzes
export function useQuizzes(filters?: { category?: string; difficulty?: string; isPublic?: boolean }) {
  return useQuery({
    queryKey: ['quizzes', filters],
    queryFn: async () => {
      let query = supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
      }
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic)
      }

      const { data: quizzes, error } = await query
      if (error) {
        console.error('Quiz fetch error:', error)
        throw error
      }
      if (!quizzes) return []

      // Manually fetch question counts and properly calculate participant stats for each quiz
      const quizzesWithCounts = await Promise.all(
        quizzes.map(async (quiz) => {
          try {
            const { data: questions } = await supabase
              .from('questions')
              .select('id')
              .eq('quiz_id', quiz.id)
            
            const { data: results } = await supabase
              .from('quiz_results')
              .select('id, user_id')
              .eq('quiz_id', quiz.id)

            // Calculate unique participants count
            const uniqueParticipants = results ? new Set(results.map(r => r.user_id)).size : 0
            
            return {
              ...quiz,
              questions: questions || [],
              quiz_results: results || [],
              attempts_count: uniqueParticipants || quiz.attempts_count || 0, // Use calculated or fallback
              participant_count: uniqueParticipants || quiz.attempts_count || 0
            }
          } catch (error) {
            console.error(`Error fetching stats for quiz ${quiz.id}:`, error)
            // Return quiz with fallback values on error
            return {
              ...quiz,
              questions: [],
              quiz_results: [],
              attempts_count: quiz.attempts_count || 0,
              participant_count: quiz.attempts_count || 0
            }
          }
        })
      )

      return quizzesWithCounts as Quiz[]
    },
    retry: 2,
    retryDelay: 1000,
  })
}

// Get single quiz with questions
export function useQuiz(quizId: string) {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle()

      if (quizError) {
        console.error('Quiz fetch error:', quizError)
        throw quizError
      }
      if (!quiz) throw new Error('Quiz not found')

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })

      if (questionsError) {
        console.error('Questions fetch error:', questionsError)
        throw questionsError
      }

      // Parse JSON options field for each question
      const parsedQuestions = (questions || []).map(question => ({
        ...question,
        options: question.options ? 
          (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) 
          : null
      }))

      // Get quiz results to calculate statistics (with error handling)
      let uniqueParticipants = 0
      try {
        const { data: results } = await supabase
          .from('quiz_results')
          .select('id, user_id')
          .eq('quiz_id', quizId)

        // Calculate unique participants count
        uniqueParticipants = results ? new Set(results.map(r => r.user_id)).size : 0
      } catch (error) {
        console.warn('Could not fetch quiz statistics:', error)
        // Use fallback value from quiz record
        uniqueParticipants = quiz.attempts_count || 0
      }

      return { 
        ...quiz, 
        questions: parsedQuestions as Question[],
        attempts_count: uniqueParticipants || quiz.attempts_count || 0,
        participant_count: uniqueParticipants || quiz.attempts_count || 0
      }
    },
    enabled: !!quizId,
    retry: 2,
    retryDelay: 1000,
  })
}

// Get user's quiz results
export function useQuizResults(userId?: string) {
  return useQuery({
    queryKey: ['quiz-results', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId!)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return data as QuizResult[]
    },
    enabled: !!userId,
  })
}

// Get single quiz result with questions for detailed review
export function useQuizResult(resultId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['quiz-result-detailed', resultId],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz:quiz_id (
            id,
            title,
            description
          )
        `)
        .eq('id', resultId)
        .maybeSingle()

      if (error) {
        console.error('Quiz result error:', error)
        throw error
      }
      
      if (!data) {
        throw new Error('Quiz result not found')
      }
      
      // Additional security check: ensure user can only see their own results
      if (data.user_id !== user.id && user.role !== 'admin') {
        throw new Error('Access denied: You can only view your own quiz results')
      }

      // Fetch quiz questions for detailed review
      let questions = []
      try {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', data.quiz_id)
          .order('order_index', { ascending: true })

        if (questionsError) {
          console.error('Questions fetch error:', questionsError)
        } else {
          // Parse JSON options field for each question
          questions = (questionsData || []).map(question => ({
            ...question,
            options: question.options ? 
              (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) 
              : null
          }))
        }
      } catch (error) {
        console.warn('Could not fetch quiz questions:', error)
      }
      
      return {
        ...data,
        quiz: {
          ...data.quiz,
          questions
        }
      } as QuizResult & { 
        quiz: { 
          id: string; 
          title: string; 
          description: string;
          questions: Question[]
        } 
      }
    },
    enabled: !!resultId && !!user,
  })
}

// Get quiz leaderboard (first attempts only)
export function useQuizLeaderboard(quizId: string) {
  return useQuery({
    queryKey: ['quiz-leaderboard', quizId],
    queryFn: async () => {
      try {
        // Try the RPC function first
        const { data, error } = await supabase
          .rpc('get_quiz_first_attempts_leaderboard', { quiz_id: quizId })

        if (!error && data) {
          // RPC function worked, return the properly ranked data
          return data.map((item, index) => ({
            ...item,
            rank: item.rank || (index + 1),
            full_name: item.full_name || 'Anonymous User',
            avatar_url: item.avatar_url || null
          }))
        }

        console.warn('RPC function failed, using fallback:', error)
      } catch (rpcError) {
        console.warn('RPC function error:', rpcError)
      }
      
      // Fallback to manual query if RPC function doesn't exist or fails
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('quiz_results')
          .select(`
            *,
            user:user_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: true }) // Order by creation time first

        if (fallbackError) {
          console.error('Fallback leaderboard error:', fallbackError)
          return []
        }

        if (!fallbackData || fallbackData.length === 0) {
          return []
        }

        // Process fallback data to get unique users (first attempt based on created_at)
        const userFirstAttempts = new Map()
        fallbackData.forEach(result => {
          const userId = result.user_id
          if (!userFirstAttempts.has(userId)) {
            // Only store the first attempt (since we ordered by created_at ASC)
            userFirstAttempts.set(userId, result)
          }
        })

        const firstAttemptsOnly = Array.from(userFirstAttempts.values())
          .sort((a, b) => {
            // Sort by score DESC, then by time ASC
            if (b.score !== a.score) return b.score - a.score
            return a.time_taken - b.time_taken
          })
          .slice(0, 50) // Limit to top 50

        return firstAttemptsOnly.map((item, index) => ({
          ...item,
          rank: index + 1,
          full_name: item.user?.full_name || 'Anonymous User',
          avatar_url: item.user?.avatar_url || null
        }))
      } catch (fallbackError) {
        console.error('Complete leaderboard failure:', fallbackError)
        return []
      }
    },
    enabled: !!quizId,
    retry: 2,
    retryDelay: 1000,
  })
}

// Create quiz
export function useCreateQuiz() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quizData: Omit<Quiz, 'id' | 'creator_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated')

      const newQuiz = {
        ...quizData,
        creator_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('quizzes')
        .insert([newQuiz])
        .select()
        .single()

      if (error) throw error
      return data as Quiz
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz created successfully')
    },
  })
}

// Update quiz
export function useUpdateQuiz() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ quizId, updates }: { quizId: string; updates: Partial<Quiz> }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('quizzes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', quizId)
        .select()
        .single()

      if (error) throw error
      return data as Quiz
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', data.id] })
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz updated successfully')
    },
  })
}

// Update question
export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ questionId, updates }: { questionId: string; updates: Partial<Question> }) => {
      const { data, error } = await supabase
        .from('questions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', questionId)
        .select()
        .single()

      if (error) throw error
      return data as Question
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', data.quiz_id] })
      toast.success('Question updated successfully')
    },
  })
}

// Delete question
export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Question deleted successfully')
    },
  })
}

// Delete quiz
export function useDeleteQuiz() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quizId: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz deleted successfully')
    },
  })
}

// Add questions to quiz
export function useAddQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ quizId, questions }: { quizId: string; questions: Omit<Question, 'id' | 'quiz_id' | 'created_at' | 'updated_at'>[] }) => {
      const newQuestions = questions.map((q, index) => ({
        ...q,
        quiz_id: quizId,
        order_index: q.order_index || index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { data, error } = await supabase
        .from('questions')
        .insert(newQuestions)
        .select()

      if (error) throw error
      return data as Question[]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', variables.quizId] })
      toast.success('Questions added successfully')
    },
  })
}

// Complete quiz attempt
export function useCompleteQuizAttempt() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ quizId, answers, timeTaken }: { 
      quizId: string; 
      answers: Record<string, any>; 
      timeTaken?: number 
    }) => {
      if (!user) throw new Error('User not authenticated')

      // Get quiz and questions to calculate score
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle()

      if (quizError) throw quizError
      if (!quiz) throw new Error('Quiz not found')

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (questionsError) throw questionsError
      if (!questions || questions.length === 0) throw new Error('No questions found')

      // Calculate score
      let correctAnswers = 0
      const totalQuestions = questions.length
      let totalPoints = 0
      let earnedPoints = 0

      questions.forEach(question => {
        totalPoints += question.points || 1
        const userAnswer = answers[question.id]
        
        if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
          // Normalize answers for comparison
          const normalizedUserAnswer = String(userAnswer).trim().toLowerCase()
          const normalizedCorrectAnswer = String(question.correct_answer).trim().toLowerCase()
          
          if (normalizedUserAnswer === normalizedCorrectAnswer) {
            correctAnswers++
            earnedPoints += question.points || 1
          }
        }
      })

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

      // Insert quiz result
      const resultData = {
        quiz_id: quizId,
        user_id: user.id,
        score: score,
        percentage: percentage,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken: timeTaken || 0,
        answers: answers,
        completed_at: new Date().toISOString()
      }

      const { data: result, error: resultError } = await supabase
        .from('quiz_results')
        .insert([resultData])
        .select()
        .maybeSingle()

      if (resultError) throw resultError

      return {
        result_id: result?.id,
        score: score,
        percentage: percentage,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken: timeTaken || 0
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-results'] })
    },
  })
}

// Submit quiz result
export function useSubmitQuizResult() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (resultData: Omit<QuizResult, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('User not authenticated')

      const newResult = {
        ...resultData,
        user_id: user.id,
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('quiz_results')
        .insert([newResult])
        .select()
        .single()

      if (error) throw error
      return data as QuizResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-results'] })
    },
  })
}

// Get quiz categories
export function useQuizCategories() {
  return useQuery({
    queryKey: ['quiz-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_categories')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('Error fetching categories:', error)
          // Return default categories as fallback
          return [
            { id: '1', name: 'Math', description: 'Mathematics', color: '#3B82F6', is_active: true },
            { id: '2', name: 'Science', description: 'Science', color: '#10B981', is_active: true },
            { id: '3', name: 'History', description: 'History', color: '#F59E0B', is_active: true },
            { id: '4', name: 'Geography', description: 'Geography', color: '#8B5CF6', is_active: true },
            { id: '5', name: 'Literature', description: 'Literature', color: '#EF4444', is_active: true },
            { id: '6', name: 'English', description: 'English Language', color: '#06B6D4', is_active: true },
            { id: '7', name: 'Other', description: 'Other subjects', color: '#6B7280', is_active: true }
          ]
        }
        
        return data && data.length > 0 ? data : [
          { id: '1', name: 'Math', description: 'Mathematics', color: '#3B82F6', is_active: true },
          { id: '2', name: 'Science', description: 'Science', color: '#10B981', is_active: true },
          { id: '3', name: 'History', description: 'History', color: '#F59E0B', is_active: true },
          { id: '4', name: 'Geography', description: 'Geography', color: '#8B5CF6', is_active: true },
          { id: '5', name: 'Literature', description: 'Literature', color: '#EF4444', is_active: true },
          { id: '6', name: 'English', description: 'English Language', color: '#06B6D4', is_active: true },
          { id: '7', name: 'Other', description: 'Other subjects', color: '#6B7280', is_active: true }
        ]
      } catch (error) {
        console.error('Exception fetching categories:', error)
        return [
          { id: '1', name: 'Math', description: 'Mathematics', color: '#3B82F6', is_active: true },
          { id: '2', name: 'Science', description: 'Science', color: '#10B981', is_active: true },
          { id: '3', name: 'History', description: 'History', color: '#F59E0B', is_active: true },
          { id: '4', name: 'Geography', description: 'Geography', color: '#8B5CF6', is_active: true },
          { id: '5', name: 'Literature', description: 'Literature', color: '#EF4444', is_active: true },
          { id: '6', name: 'English', description: 'English Language', color: '#06B6D4', is_active: true },
          { id: '7', name: 'Other', description: 'Other subjects', color: '#6B7280', is_active: true }
        ]
      }
    },
    staleTime: 0, // No stale time - always fresh data for categories
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  })
}

// Upload quiz file
export function useUploadQuizFile() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ file, quizId, questionId }: { file: File; quizId?: string; questionId?: string }) => {
      if (!user) throw new Error('User not authenticated')

      // For now, just return a mock response
      // In a real app, you'd implement file upload to Supabase Storage
      return { url: URL.createObjectURL(file) }
    },
  })
}

// Increment quiz view count
export function useIncrementQuizViewCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quizId: string) => {
      // Update view count directly in the database
      const { data: quiz, error: fetchError } = await supabase
        .from('quizzes')
        .select('views')
        .eq('id', quizId)
        .maybeSingle()
        
      if (fetchError) {
        console.error('Fetch error:', fetchError)
        return
      }
      
      if (!quiz) {
        console.error('Quiz not found')
        return
      }
      
      const newViewCount = (quiz.views || 0) + 1
      
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({ views: newViewCount })
        .eq('id', quizId)
        
      if (updateError) {
        console.error('Update error:', updateError)
      }
      
      return { success: true, new_view_count: newViewCount }
    },
    onSuccess: (_, quizId) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] })
    }
  })
}

// Verify quiz access (check if access code is correct)
export function useVerifyQuizAccess() {
  return useMutation({
    mutationFn: async ({ quizId, accessCode }: { quizId: string; accessCode?: string }) => {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('access_code, is_public')
        .eq('id', quizId)
        .maybeSingle()

      if (error) throw error
      if (!quiz) throw new Error('Quiz not found')

      // If quiz is public, access is always granted
      if (quiz.is_public) return { access: true }

      // If quiz has access code, verify it
      if (quiz.access_code && quiz.access_code !== accessCode) {
        throw new Error('Invalid access code')
      }

      return { access: true }
    },
  })
}

// Generate quiz questions with AI
export function useGenerateQuestions() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ topic, difficulty, count, questionType }: { 
      topic: string
      difficulty: string
      count: number
      questionType: string
    }) => {
      if (!user) throw new Error('User not authenticated')

      // For now, return mock questions since we don't have AI service
      const mockQuestions = Array.from({ length: count }, (_, i) => ({
        id: `mock-${Date.now()}-${i}`,
        question_text: `Sample ${questionType} question about ${topic} (${difficulty})`,
        question_type: questionType,
        options: questionType === 'multiple_choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
        correct_answer: questionType === 'multiple_choice' ? 'Option A' : 'Sample answer',
        explanation: 'This is a sample explanation',
        points: 1,
        order_index: i + 1
      }))

      return mockQuestions
    },
    onSuccess: () => {
      toast.success('Questions generated successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to generate questions')
    }
  })
}


