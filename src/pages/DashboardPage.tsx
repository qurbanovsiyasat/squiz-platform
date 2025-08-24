import React, { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserStatistics } from '@/hooks/useStatistics'
import { useQuizCreatePermission } from '@/hooks/useQuizCreatePermission'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard, StatCardSkeleton } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  PlusCircle, 
  MessageSquare, 
  Trophy, 
  TrendingUp,
  ArrowRight,
  // Sparkles,
  Clock,
  Target,
  Zap,
  Star,
  Users,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface RecentQuiz {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions: number
  participants: number
  createdAt: string
}

interface ActivityItem {
  id: string
  type: 'quiz_completed' | 'question_asked' | 'quiz_created'
  title: string
  score?: string
  time: string
}

export default function DashboardPage() {
  const defaultDashboardPrefs = {
    showRecentQuizzes: true,
    showMyStats: true,
    showForumFeed: true
  }

  const { user } = useAuth()
  const { t } = useLanguage()
  const { checkPermissionAndNavigate } = useQuizCreatePermission()
  const { data: stats, isLoading: statsLoading, error: statsError } = useUserStatistics()

  // Fixed query following Supabase best practices
  const { data: recentQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['recent-quizzes'],
    queryFn: async () => {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('id, title, difficulty, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (error) throw error
      if (!quizzes) return []
      
      // Manually fetch question and result counts
      const quizzesWithCounts = await Promise.all(
        quizzes.map(async (quiz) => {
          const { data: questions } = await supabase
            .from('questions')
            .select('id')
            .eq('quiz_id', quiz.id)
          
          const { data: results } = await supabase
            .from('quiz_results')
            .select('id')
            .eq('quiz_id', quiz.id)

          return {
            id: quiz.id,
            title: quiz.title,
            difficulty: quiz.difficulty || 'medium',
            questions: questions?.length || 0,
            participants: results?.length || 0,
            createdAt: quiz.created_at
          }
        })
      )
      
      return quizzesWithCounts
    }
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      // Get recent quiz completions - fixed to avoid joins
      const { data: completions, error: completionsError } = await supabase
        .from('quiz_results')
        .select('id, score, total_questions, completed_at, quiz_id')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(2)
      
      if (completionsError) console.error('Error fetching completions:', completionsError)
      
      // Get recent questions asked
      const { data: questions, error: questionsError } = await supabase
        .from('qa_questions')
        .select('id, title, created_at, votes:qa_votes(count)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (questionsError) console.error('Error fetching questions:', questionsError)
      
      const activities: ActivityItem[] = []
      
      // Manually fetch quiz titles for completions
      if (completions && completions.length > 0) {
        const quizIds = completions.map(c => c.quiz_id)
        const { data: quizTitles } = await supabase
          .from('quizzes')
          .select('id, title')
          .in('id', quizIds)
        
        // Add quiz completions with fetched titles
        completions.forEach(completion => {
          const quiz = quizTitles?.find(q => q.id === completion.quiz_id)
          activities.push({
            id: `completion-${completion.id}`,
            type: 'quiz_completed',
            title: `${quiz?.title || 'Quiz'} testini tamamladınız`,
            score: `${completion.score}/${completion.total_questions}`,
            time: completion.completed_at
          })
        })
      }
      
      // Add questions
      questions?.forEach(question => {
        activities.push({
          id: `question-${question.id}`,
          type: 'question_asked',
          title: `"${question.title}" sualını verdiniz`,
          score: `${question.votes?.length || 0} səs`,
          time: question.created_at
        })
      })
      
      // Sort by time
      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 3)
    },
    enabled: !!user?.id
  })

  const getWelcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Sabahınız xeyir!'
    if (hour < 17) return 'Günortanız xeyir!'
    return 'Axşamınız xeyir!'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success-green/10 text-success-green border-success-green/20'
      case 'medium': return 'bg-warning-yellow/10 text-warning-yellow border-warning-yellow/20'
      case 'hard': return 'bg-error-red/10 text-error-red border-error-red/20'
      default: return 'bg-medium-grey/10 text-medium-grey border-medium-grey/20'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Asan'
      case 'medium': return 'Orta'
      case 'hard': return 'Çətin'
      default: return difficulty
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz_completed': return <Trophy className="h-4 w-4 text-success-green" />
      case 'question_asked': return <MessageSquare className="h-4 w-4 text-vibrant-blue" />
      case 'quiz_created': return <PlusCircle className="h-4 w-4 text-purple-600" />
      default: return <Clock className="h-4 w-4 text-medium-grey" />
    }
  }



  const displayName = user?.is_private ? 'Abituriyent' : (user?.full_name || user?.email?.split('@')[0] || 'İstifadəçi')

  return (
    <div className="min-h-screen bg-soft-grey p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="flex items-center space-x-4">
            {/* <div className="w-16 h-16 bg-gradient-to-br from-vibrant-blue to-purple-600 rounded-design-system flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-pure-white" />
            </div> */}
            <div>
              <p className="text-ui-label text-medium-grey">{getWelcomeMessage()}</p>
              <h1 className="text-page-title">{displayName}</h1>
              <p className="text-body mt-1">{t('dashboard.whatLearn')}</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={checkPermissionAndNavigate} className="btn-primary space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>{t('dashboard.createQuiz')}</span>
            </Button>
            <Button variant="outline" asChild className="btn-secondary space-x-2">
              <Link to="/quizzes">
                <BookOpen className="h-4 w-4" />
                <span>{t('dashboard.browseQuizzes')}</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="btn-secondary space-x-2">
              <Link to="/qa/create">
                <MessageSquare className="h-4 w-4" />
                <span>{t('dashboard.askQuestion')}</span>
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {statsLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          ) : statsError ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center">
                <p className="text-error-red">Statistika məlumatları yüklənə bilmədi</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <StatCard
                title="Quiz Yaradıldı"
                value={stats?.quizzesCreated || 0}
                icon={PlusCircle}
                iconColor="text-purple-600"
                gradient="gradient-purple"
                delay={0.1}
              />
              <StatCard
                title="Quiz İcra Edildi"
                value={stats?.quizzesTaken || 0}
                icon={BookOpen}
                iconColor="text-vibrant-blue"
                gradient="gradient-primary"
                delay={0.2}
              />
              <StatCard
                title="Sual Verildi"
                value={stats?.questionsAsked || 0}
                icon={MessageSquare}
                iconColor="text-success-green"
                gradient="gradient-success"
                delay={0.3}
              />
              <StatCard
                title="Ümumi Bal"
                value={stats?.totalScore || 0}
                icon={Trophy}
                iconColor="text-warning-yellow"
                gradient="gradient-warning"
                delay={0.4}
              />
              <StatCard
                title="Uğur Nisbəti"
                value={`${stats?.successRate || 0}%`}
                icon={TrendingUp}
                iconColor="text-emerald-600"
                gradient="gradient-success"
                delay={0.5}
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Quizzes */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="card-modern">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2 text-section-title">
                      <BookOpen className="h-5 w-5 text-vibrant-blue" />
                      <span>Populyar Quizlər</span>
                    </CardTitle>
                    <CardDescription className="text-body mt-1">
                      Son dövrdə populyar və yeni quizlər
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="btn-tertiary">
                    <Link to="/quizzes" className="flex items-center space-x-1">
                      <span>Hamısını gör</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quizzesLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-4 border border-light-grey rounded-design-system animate-pulse">
                      <div className="h-4 bg-light-grey rounded mb-2"></div>
                      <div className="h-3 bg-light-grey rounded w-2/3"></div>
                    </div>
                  ))
                ) : recentQuizzes && recentQuizzes.length > 0 ? (
                  recentQuizzes.map((quiz, index) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-4 border border-light-grey rounded-design-system hover:border-vibrant-blue/30 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Link 
                        to={`/quizzes/${quiz.id}`} 
                        className="font-semibold text-dark-charcoal group-hover:text-vibrant-blue transition-colors flex-1"
                      >
                        {quiz.title}
                      </Link>
                      <Badge className={`${getDifficultyColor(quiz.difficulty)} border`}>
                        {getDifficultyText(quiz.difficulty)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-caption text-medium-grey">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{quiz.questions} sual</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{quiz.participants} iştirakçı</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatRelativeTime(quiz.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-body text-medium-grey">Hələ heç bir quiz yoxdur</p>
                    <Button onClick={checkPermissionAndNavigate} className="btn-primary mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      İlk Quizinizi Yaradın
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity & Progress */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Recent Activity */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-section-title">
                  <Zap className="h-5 w-5 text-warning-yellow" />
                  <span>Son Fəaliyyət</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-button animate-pulse">
                      <div className="w-6 h-6 bg-light-grey rounded"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-light-grey rounded mb-1"></div>
                        <div className="h-2 bg-light-grey rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-button hover:bg-soft-grey transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ui-label text-dark-charcoal">{activity.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        {activity.score && (
                          <span className="text-caption text-success-green font-medium">
                            {activity.score}
                          </span>
                        )}
                        <span className="text-caption text-medium-grey">
                          {formatRelativeTime(activity.time)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-body text-medium-grey">Hələ heç bir fəaliyyət yoxdur</p>
                    <p className="text-caption text-medium-grey mt-1">Quiz həll edin və ya sual verin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Card */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-section-title">
                  <Target className="h-5 w-5 text-success-green" />
                  <span>Tərəqqi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-ui-label">
                    <span>Bu həftə fəaliyyət</span>
                    <span className="text-vibrant-blue">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-ui-label">
                    <span>Quiz tamamlama</span>
                    <span className="text-success-green">{stats?.successRate || 0}%</span>
                  </div>
                  <Progress value={stats?.successRate || 0} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-ui-label">
                    <span>Aylıq hədəf</span>
                    <span className="text-warning-yellow">60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                
                <div className="pt-2 border-t border-light-grey">
                  <Button variant="outline" size="sm" className="w-full btn-secondary">
                    <Star className="h-4 w-4 mr-2" />
                    Statistikalar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}