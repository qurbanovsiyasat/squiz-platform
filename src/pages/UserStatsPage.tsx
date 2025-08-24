import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStats } from '@/hooks/useUserStats'
import { useQuizResults } from '@/hooks/useQuiz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Target, 
  Award, 
  Clock, 
  BookOpen, 
  Users, 
  Star,
  Trophy,
  Calendar,
  BarChart3
} from 'lucide-react'
import { formatDate, getScoreColor } from '@/lib/utils'

export default function UserStatsPage() {
  const { user } = useAuth()
  const { data: userStats, isLoading: statsLoading } = useUserStats()
  const { data: quizResults = [], isLoading: resultsLoading } = useQuizResults(user?.id)

  if (statsLoading || resultsLoading) {
    return (
      <PageWrapper title="İstatistikalar" description="Şəxsi nəticələriniz və tərəqqi">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    )
  }

  const stats = {
    totalQuizzes: quizResults.length,
    averageScore: quizResults.length > 0 
      ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length)
      : 0,
    bestScore: quizResults.length > 0 
      ? Math.max(...quizResults.map(result => result.score))
      : 0,
    totalTimeSpent: quizResults.reduce((sum, result) => sum + (result.time_taken || 0), 0),
    perfectScores: quizResults.filter(result => result.score === 100).length,
    lastWeekQuizzes: quizResults.filter(result => {
      const resultDate = new Date(result.completed_at)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      return resultDate >= oneWeekAgo
    }).length
  }

  const recentResults = quizResults
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, 10)

  const scoreDistribution = {
    excellent: quizResults.filter(r => r.score >= 90).length,
    good: quizResults.filter(r => r.score >= 70 && r.score < 90).length,
    average: quizResults.filter(r => r.score >= 60 && r.score < 70).length,
    poor: quizResults.filter(r => r.score < 60).length
  }

  return (
    <PageWrapper title="İstatistikalar" description="Şəxsi nəticələriniz və tərəqqi">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Ümumi Quiz Sayı
                    </p>
                    <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Orta Bal
                    </p>
                    <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                      {stats.averageScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Ən Yaxşı Nəticə
                    </p>
                    <p className={`text-2xl font-bold ${getScoreColor(stats.bestScore)}`}>
                      {stats.bestScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Mükəmməl Nəticələr
                    </p>
                    <p className="text-2xl font-bold">{stats.perfectScores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performans</TabsTrigger>
            <TabsTrigger value="recent">Son Nəticələr</TabsTrigger>
            <TabsTrigger value="distribution">Bal Paylanması</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Həfətlik Aktivlik</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Son Həftə Quiz Sayı
                      </span>
                      <span className="font-medium">{stats.lastWeekQuizzes}</span>
                    </div>
                    <Progress 
                      value={Math.min((stats.lastWeekQuizzes / 10) * 100, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-slate-500">
                      Məqsəd: həftədə 10 quiz
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Vaxt Statistikası</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Ümumi Vaxt
                      </span>
                      <span className="font-medium">
                        {Math.round(stats.totalTimeSpent / 60)} dəq
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Orta Vaxt
                      </span>
                      <span className="font-medium">
                        {stats.totalQuizzes > 0 
                          ? Math.round(stats.totalTimeSpent / stats.totalQuizzes / 60) 
                          : 0} dəq
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Son Quiz Nəticələri</CardTitle>
              </CardHeader>
              <CardContent>
                {recentResults.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    Hələ Quiz tamamlamamisınız
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">Quiz #{result.quiz_id.slice(-8)}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(result.completed_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {result.correct_answers}/{result.total_questions}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nəticə Paylanması</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Mükəmməl (90-100%)</span>
                      </div>
                      <span className="font-medium">{scoreDistribution.excellent}</span>
                    </div>
                    <Progress 
                      value={stats.totalQuizzes > 0 ? (scoreDistribution.excellent / stats.totalQuizzes) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span>Yaxşı (70-89%)</span>
                      </div>
                      <span className="font-medium">{scoreDistribution.good}</span>
                    </div>
                    <Progress 
                      value={stats.totalQuizzes > 0 ? (scoreDistribution.good / stats.totalQuizzes) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span>Orta (60-69%)</span>
                      </div>
                      <span className="font-medium">{scoreDistribution.average}</span>
                    </div>
                    <Progress 
                      value={stats.totalQuizzes > 0 ? (scoreDistribution.average / stats.totalQuizzes) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>Zəif (0-59%)</span>
                      </div>
                      <span className="font-medium">{scoreDistribution.poor}</span>
                    </div>
                    <Progress 
                      value={stats.totalQuizzes > 0 ? (scoreDistribution.poor / stats.totalQuizzes) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
