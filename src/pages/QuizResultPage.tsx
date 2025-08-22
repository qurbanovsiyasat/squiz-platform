import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuizResult, useQuizLeaderboard } from '@/hooks/useQuiz'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/Separator'
import { 
  Trophy, 
  Medal, 
  Award,
  Clock, 
  Target, 
  Users, 
  ArrowLeft,
  Share2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import MathRenderer from '@/components/MathRenderer'
import confetti from 'canvas-confetti'

export default function QuizResultPage() {
  const { quizId, resultId } = useParams<{ quizId: string; resultId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: result, isLoading: resultLoading, error: resultError } = useQuizResult(resultId!)
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuizLeaderboard(quizId!)
  const [showReview, setShowReview] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}dəq ${secs}san`
  }

  const toggleQuestionExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const getAnswerStatus = (questionId: string, correctAnswer: string) => {
    if (!result?.answers) return { isCorrect: false, userAnswer: null }
    const userAnswer = result.answers[questionId]
    const isCorrect = userAnswer === correctAnswer
    return { isCorrect, userAnswer }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default'
    if (score >= 70) return 'secondary'
    if (score >= 50) return 'outline'
    return 'destructive'
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="font-bold text-slate-600 dark:text-slate-300">#{rank}</span>
    }
  }

  const getRankBackgroundColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600'
      case 2:
        return 'from-gray-300 to-gray-500'
      case 3:
        return 'from-amber-400 to-amber-600'
      default:
        return 'from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
    }
  }

  const handleShareResult = () => {
    const shareText = `Bu quizdə ${result?.score}% nəticə aldım! Siz də cəhd edin: ${window.location.origin}/quizzes/${quizId}`
    
    if (navigator.share) {
      navigator.share({
        title: 'Quiz Nəticəm',
        text: shareText,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success('Nəticə link kopyalandı!')
    }
  }

  const handleRetakeQuiz = () => {
    navigate(`/quizzes/${quizId}/take`)
  }

  // Trigger confetti animation for high scores
  useEffect(() => {
    if (result && result.score >= 70) {
      // Delay the confetti to allow the page to render
      const timer = setTimeout(() => {
        // Create a celebration confetti effect
        const duration = 3000 // 3 seconds
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min
        }

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          const particleCount = 50 * (timeLeft / duration)

          // Since particles fall down, start a bit higher than random
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          })
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          })
        }, 250)

        // Also trigger an initial burst
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }, 500) // Half second delay

      return () => clearTimeout(timer)
    }
  }, [result])

  if (resultLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Nəticə yüklənir...</p>
        </div>
      </div>
    )
  }

  if (resultError || !result) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="pt-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nəticə Tapılmadı</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Bu nəticə mövcud deyil və ya sizin buna giriş icazəniz yoxdur.
            </p>
            <Button onClick={() => navigate('/quizzes')}>Quiz Siyahısına Qayıt</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userRank = leaderboard?.find(entry => entry.user_id === result.user_id)?.rank || 0
  const topPerformers = leaderboard?.slice(0, 3) || []
  const top20Leaderboard = leaderboard?.slice(0, 20) || [] // Show top 20
  const incorrectAnswers = result?.quiz?.questions?.filter(q => {
    const { isCorrect } = getAnswerStatus(q.id, String(q.correct_answer))
    return !isCorrect
  }) || []
  
  // Check if user is in top 20, if not, show their position separately
  const userInTop20 = top20Leaderboard.some(entry => entry.user_id === result.user_id)
  const userEntry = !userInTop20 ? leaderboard?.find(entry => entry.user_id === result.user_id) : null

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Quiz Nəticəniz
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {result.quiz?.title}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate(`/quizzes/${quizId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quiz Ətraflı
          </Button>
        </div>
      </div>

      {/* Enhanced User Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="border-2 border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-slate-900">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              {/* Score Display with Ranking */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-6">
                  <div className={cn('text-6xl font-bold', getScoreColor(result.score))}>
                    {result.score}%
                  </div>
                  {userRank > 0 && (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {getRankIcon(userRank)}
                      </div>
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {userRank}. Sıra
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Detailed Answer Breakdown */}
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{result.correct_answers}</div>
                    <div className="text-sm text-green-600 dark:text-green-500">Doğru</div>
                  </div>
                  <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border-2 border-red-200 dark:border-red-800">
                    <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{result.total_questions - result.correct_answers}</div>
                    <div className="text-sm text-red-600 dark:text-red-500">Səhv</div>
                  </div>
                  <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <Target className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.total_questions}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-500">Ümumi</div>
                  </div>
                </div>
              </div>

              {/* Performance Message */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  {result.score >= 90 ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : result.score >= 70 ? (
                    <Target className="h-6 w-6 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  )}
                  <span className="text-lg font-medium">
                    {result.score >= 90 ? 'Əla nəticə! Təbriklər!' :
                     result.score >= 70 ? 'Yaxşı nəticə!' :
                     result.score >= 50 ? 'Orta nəticə' : 'Daha çox cəhd lazımdır'}
                  </span>
                </div>
                {userRank > 0 && (
                  <div className="bg-primary-100 dark:bg-primary-900/40 rounded-lg p-4">
                    <p className="text-primary-700 dark:text-primary-300 font-medium">
                      🎯 Siz <span className="font-bold text-lg">{leaderboard?.length || 0}</span> iştirakçı arasında <span className="font-bold text-xl text-primary-600 dark:text-primary-400">{userRank}. yerdəsiniz!</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-slate-500" />
                  <div className="text-lg font-medium">{formatTime(result.time_taken)}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Müddət</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-slate-500" />
                  <div className="text-lg font-medium">{((result.correct_answers / result.total_questions) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Düzgünlük</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button onClick={handleRetakeQuiz} className="flex-1 h-12">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Yenidən Cəhd Et
                </Button>
                <Button variant="outline" onClick={handleShareResult} className="flex-1 h-12">
                  <Share2 className="h-4 w-4 mr-2" />
                  Nəticəni Paylaş
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Question Review Section */}
      {result.quiz?.questions && result.quiz.questions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <span>Sual-Cavab İcmalı</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Səhv cavablarınızı nəzərdən keçirin və öyrənin
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowReview(!showReview)}
                >
                  {showReview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showReview ? 'Gizlət' : 'Göstər'}
                </Button>
              </div>
            </CardHeader>
            
            <AnimatePresence>
              {showReview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="pt-0">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Doğru Cavablar</h4>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.correct_answers}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Səhv Cavablar</h4>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectAnswers.length}</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Questions Review */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-900 dark:text-white">Bütün Suallar:</h4>
                      {result.quiz.questions.map((question, index) => {
                        const { isCorrect, userAnswer } = getAnswerStatus(question.id, String(question.correct_answer))
                        const isExpanded = expandedQuestions.has(question.id)
                        
                        return (
                          <div key={question.id} className={cn(
                            "border rounded-lg p-4 transition-all",
                            isCorrect 
                              ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" 
                              : "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                          )}>
                            <div 
                              className="flex items-start justify-between cursor-pointer"
                              onClick={() => toggleQuestionExpansion(question.id)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="font-medium text-slate-600 dark:text-slate-400">
                                    Sual {index + 1}:
                                  </span>
                                  {isCorrect ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  )}
                                  <Badge variant={isCorrect ? "default" : "destructive"}>
                                    {isCorrect ? "Doğru" : "Səhv"}
                                  </Badge>
                                </div>
                                <div className="text-slate-900 dark:text-white">
                                  <MathRenderer>{question.question}</MathRenderer>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    {/* User's Answer */}
                                    <div className="mb-3">
                                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Sizin cavabınız:
                                      </p>
                                      <div className={cn(
                                        "p-3 rounded border",
                                        isCorrect 
                                          ? "bg-green-100 border-green-300 dark:bg-green-900/20" 
                                          : "bg-red-100 border-red-300 dark:bg-red-900/20"
                                      )}>
                                        <MathRenderer>{userAnswer || "Cavab verilməyib"}</MathRenderer>
                                      </div>
                                    </div>

                                    {/* Correct Answer */}
                                    <div className="mb-3">
                                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Doğru cavab:
                                      </p>
                                      <div className="p-3 rounded border bg-green-100 border-green-300 dark:bg-green-900/20">
                                        <MathRenderer>{String(question.correct_answer)}</MathRenderer>
                                      </div>
                                    </div>

                                    {/* Options for multiple choice */}
                                    {question.type === 'multiple_choice' && question.options && (
                                      <div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                          Variantlar:
                                        </p>
                                        <div className="space-y-2">
                                          {question.options.map((option: string, optIndex: number) => {
                                            const optionLetter = String.fromCharCode(65 + optIndex)
                                            const isUserAnswer = userAnswer === option
                                            const isCorrectOption = option === question.correct_answer
                                            
                                            return (
                                              <div key={optIndex} className={cn(
                                                "p-3 rounded border text-sm",
                                                isCorrectOption 
                                                  ? "bg-green-100 border-green-300 dark:bg-green-900/20"
                                                  : isUserAnswer 
                                                    ? "bg-red-100 border-red-300 dark:bg-red-900/20"
                                                    : "bg-slate-50 border-slate-200 dark:bg-slate-800"
                                              )}>
                                                <span className="font-medium mr-2">{optionLetter})</span>
                                                <MathRenderer>{option}</MathRenderer>
                                                {isCorrectOption && <CheckCircle className="h-4 w-4 text-green-600 inline ml-2" />}
                                                {isUserAnswer && !isCorrectOption && <XCircle className="h-4 w-4 text-red-600 inline ml-2" />}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Explanation if available */}
                                    {question.explanation && (
                                      <div className="mt-3">
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                          İzah:
                                        </p>
                                        <div className="p-3 rounded bg-blue-50 border border-blue-200 dark:bg-blue-900/20 text-sm">
                                          <MathRenderer>{question.explanation}</MathRenderer>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Top Performerlar</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPerformers.map((performer, index) => (
                  <div
                    key={performer.user_id}
                    className={cn(
                      'relative p-4 rounded-xl text-center transition-transform hover:scale-105',
                      'bg-gradient-to-br',
                      getRankBackgroundColor(performer.rank)
                    )}
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg">
                      {getRankIcon(performer.rank)}
                    </div>
                    
                    {/* Avatar */}
                    <div className="w-16 h-16 mx-auto mb-3 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                      {performer.avatar_url ? (
                        <img 
                          src={performer.avatar_url || performer.user?.avatar_url} 
                          alt={performer.full_name || performer.user?.full_name || 'User'} 
                          className="w-16 h-16 rounded-full" 
                        />
                      ) : (
                        <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                          {(performer.full_name || performer.user?.full_name)?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    
                    {/* User Info */}
                    <h3 className={cn(
                      'font-semibold truncate',
                      performer.rank <= 3 ? 'text-white' : 'text-slate-900 dark:text-white'
                    )}>
                      {performer.full_name || performer.user?.full_name || 'Anonim İstifadəçi'}
                    </h3>
                    <div className={cn(
                      'text-2xl font-bold mt-1',
                      performer.rank <= 3 ? 'text-white' : 'text-slate-900 dark:text-white'
                    )}>
                      {performer.score}%
                    </div>
                    <div className={cn(
                      'text-sm',
                      performer.rank <= 3 ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'
                    )}>
                      {formatTime(performer.time_taken)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Full Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>Top 20 Reytinq</span>
                </div>
                <Badge variant="outline">{leaderboard?.length || 0} iştirakçı</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">Rəyləşdirmə yüklənir...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {top20Leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.user_id === user?.id
                    return (
                      <div
                        key={entry.user_id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg transition-colors',
                          isCurrentUser 
                            ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center">
                            {entry.rank <= 3 ? (
                              getRankIcon(entry.rank)
                            ) : (
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                #{entry.rank}
                              </span>
                            )}
                          </div>
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            {entry.avatar_url ? (
                              <img 
                                src={entry.avatar_url || entry.user?.avatar_url} 
                                alt={entry.full_name || entry.user?.full_name || 'User'} 
                                className="w-8 h-8 rounded-full" 
                              />
                            ) : (
                              <span className="text-white font-medium text-sm">
                                {(entry.full_name || entry.user?.full_name)?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              'font-medium',
                              isCurrentUser 
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-slate-900 dark:text-white'
                            )}>
                              {entry.full_name || entry.user?.full_name || 'Anonim İstifadəçi'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                                  (Siz)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {entry.correct_answers} / {entry.total_questions} doğru
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            'font-bold',
                            getScoreColor(entry.score)
                          )}>
                            {entry.score}%
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {formatTime(entry.time_taken)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Show user's position if they're not in top 20 */}
                  {userEntry && !userInTop20 && (
                    <>
                      <div className="my-4 text-center">
                        <Separator />
                        <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 rounded px-3 py-1 mt-2 inline-block">
                          ... və daha {leaderboard.length - 20} iştirakçı
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-primary-200 dark:border-primary-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 flex items-center justify-center">
                              <span className="font-bold text-primary-600 dark:text-primary-400">
                                #{userEntry.rank}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-blue-500 rounded-full flex items-center justify-center">
                              {userEntry.avatar_url ? (
                                <img 
                                  src={userEntry.avatar_url} 
                                  alt="Your avatar" 
                                  className="w-8 h-8 rounded-full" 
                                />
                              ) : (
                                <span className="text-white font-medium text-sm">
                                  {(userEntry.full_name)?.charAt(0) || 'S'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-primary-700 dark:text-primary-300">
                                {userEntry.full_name || 'Siz'}
                                <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                                  (Sizin nəticəniz)
                                </span>
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {userEntry.correct_answers} / {userEntry.total_questions} doğru
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              'font-bold text-lg',
                              getScoreColor(userEntry.score)
                            )}>
                              {userEntry.score}%
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {formatTime(userEntry.time_taken)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Completion Info */}
      <div className="text-center text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
        <Clock className="h-4 w-4 inline mr-2" />
        Quiz tamamlandı: {formatDateTime(result.completed_at)}
      </div>
    </div>
  )
}