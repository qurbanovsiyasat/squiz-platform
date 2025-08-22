import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface UserStatistics {
  quizzesCreated: number
  quizzesTaken: number
  questionsAsked: number
  totalScore: number
  successRate: number
  avgQuizScore: number
  totalTimeSpent: number
  favoriteCategory: string
  weeklyActivity: Array<{ day: string; activity: number }>
  recentResults: Array<{
    id: string
    quizTitle: string
    score: number
    totalQuestions: number
    completedAt: string
  }>
}

export interface PlatformStatistics {
  totalUsers: number
  totalQuizzes: number
  totalQuestions: number
  totalAttempts: number
  activeUsers: number
  newUsersThisWeek: number
  popularCategories: Array<{ name: string; count: number }>
  userGrowth: Array<{ date: string; count: number }>
  quizActivity: Array<{ date: string; quizzes: number; attempts: number }>
}

export function useUserStatistics(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery({
    queryKey: ['user-statistics', targetUserId],
    queryFn: async (): Promise<UserStatistics> => {
      if (!targetUserId) throw new Error('User ID required')

      // Get quizzes created by user
      const { data: quizzesCreated, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('creator_id', targetUserId)

      if (quizzesError) throw quizzesError

      // Get quiz attempts by user
      const { data: quizAttempts, error: attemptsError } = await supabase
        .from('quiz_results')
        .select('id, quiz_id, score, total_questions, completed_at')
        .eq('user_id', targetUserId)
        .order('completed_at', { ascending: false })

      if (attemptsError) throw attemptsError

      // Get questions asked by user
      const { data: questionsAsked, error: questionsError } = await supabase
        .from('qa_questions')
        .select('id')
        .eq('author_id', targetUserId)

      if (questionsError) throw questionsError

      // Get recent quiz results with quiz titles (only if user has quiz attempts)
      let recentResults: any[] = []
      if (quizAttempts && quizAttempts.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('quiz_results')
          .select(`
            id,
            score,
            total_questions,
            completed_at,
            quizzes(title)
          `)
          .eq('user_id', targetUserId)
          .order('completed_at', { ascending: false })
          .limit(5)

        if (resultsError) {
          console.warn('Error fetching recent results:', resultsError)
          // Don't throw error, just use empty array
        } else {
          recentResults = results || []
        }
      }

      // Calculate statistics
      const totalScore = quizAttempts?.reduce((sum, attempt) => sum + attempt.score, 0) || 0
      const totalQuestions = quizAttempts?.reduce((sum, attempt) => sum + attempt.total_questions, 0) || 0
      const successRate = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
      const avgQuizScore = quizAttempts?.length > 0 ? Math.round(totalScore / quizAttempts.length) : 0

      // Generate weekly activity (mock for now - could be improved with actual activity tracking)
      const weeklyActivity = [
        { day: 'Mon', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Tue', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Wed', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Thu', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Fri', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Sat', activity: Math.floor(Math.random() * 10) + 1 },
        { day: 'Sun', activity: Math.floor(Math.random() * 10) + 1 }
      ]

      return {
        quizzesCreated: quizzesCreated?.length || 0,
        quizzesTaken: quizAttempts?.length || 0,
        questionsAsked: questionsAsked?.length || 0,
        totalScore,
        successRate,
        avgQuizScore,
        totalTimeSpent: Math.floor(Math.random() * 1000) + 100, // Mock - implement time tracking
        favoriteCategory: 'Riyaziyyat', // Mock - calculate from user activity
        weeklyActivity,
        recentResults: recentResults.map(result => ({
          id: result.id,
          quizTitle: (result.quizzes as any)?.title || 'Unknown Quiz',
          score: result.score,
          totalQuestions: result.total_questions,
          completedAt: result.completed_at
        }))
      }
    },
    enabled: !!targetUserId
  })
}

export function usePlatformStatistics() {
  return useQuery({
    queryKey: ['platform-statistics'],
    queryFn: async (): Promise<PlatformStatistics> => {
      // Get total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Get total quizzes
      const { count: totalQuizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })

      if (quizzesError) throw quizzesError

      // Get total questions
      const { count: totalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })

      if (questionsError) throw questionsError

      // Get total quiz attempts
      const { count: totalAttempts, error: attemptsError } = await supabase
        .from('quiz_results')
        .select('*', { count: 'exact', head: true })

      if (attemptsError) throw attemptsError

      // Get active users (users who signed in within last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { count: activeUsers, error: activeUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', sevenDaysAgo.toISOString())

      if (activeUsersError) throw activeUsersError

      // Get new users this week
      const { count: newUsersThisWeek, error: newUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      if (newUsersError) throw newUsersError

      // Get popular categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('quizzes')
        .select('category')
        .not('category', 'is', null)

      if (categoryError) throw categoryError

      // Count category usage
      const categoryCount = categoryData?.reduce((acc, quiz) => {
        acc[quiz.category] = (acc[quiz.category] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const popularCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Generate mock growth data (could be improved with actual tracking)
      const userGrowth = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 5) + 1
        }
      })

      const quizActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          quizzes: Math.floor(Math.random() * 3) + 1,
          attempts: Math.floor(Math.random() * 10) + 5
        }
      })

      return {
        totalUsers: totalUsers || 0,
        totalQuizzes: totalQuizzes || 0,
        totalQuestions: totalQuestions || 0,
        totalAttempts: totalAttempts || 0,
        activeUsers: activeUsers || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        popularCategories,
        userGrowth,
        quizActivity
      }
    }
  })
}

export function useQuizStatistics(quizId: string) {
  return useQuery({
    queryKey: ['quiz-statistics', quizId],
    queryFn: async () => {
      // Get quiz attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_results')
        .select('score, total_questions, completed_at, user_id')
        .eq('quiz_id', quizId)

      if (attemptsError) throw attemptsError

      // Calculate statistics
      const totalAttempts = attempts?.length || 0
      const avgScore = attempts?.length > 0 
        ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length
        : 0
      
      const successRate = attempts?.length > 0
        ? attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions), 0) / attempts.length * 100
        : 0

      const uniqueUsers = new Set(attempts?.map(attempt => attempt.user_id) || []).size

      return {
        totalAttempts,
        uniqueUsers,
        avgScore: Math.round(avgScore * 10) / 10,
        successRate: Math.round(successRate)
      }
    },
    enabled: !!quizId
  })
}