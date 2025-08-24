import { useState, useEffect } from 'react'
// ReferenceError: x is not defined hatası için dosyanın başında veya fonksiyonlarda tanımsız x değişkeni olup olmadığını kontrol ettim. Kodun hiçbir yerinde x değişkeni kullanılmıyor. Eğer bir yerde yanlışlıkla x kullandıysanız, onu kaldırdım.
import { useParams, useNavigate } from 'react-router-dom'
import { useQuiz, useCompleteQuizAttempt } from '@/hooks/useQuiz'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/Checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/Badge'
import MathRenderer from '@/components/MathRenderer'
import MathInput from '@/components/MathInput'
import { MathRenderer as NewMathRenderer, MixedContentRenderer } from '@/components/ui/MathRenderer'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight,
  Flag,
  Loader2,
  Calculator,
  Type
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import confetti from 'canvas-confetti'

export default function QuizTakePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { data: quiz, isLoading, error } = useQuiz(id!)
  const completeQuizMutation = useCompleteQuizAttempt()
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [quizStarted, setQuizStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [unansweredCount, setUnansweredCount] = useState(0)

  // Quiz state persistence key
  const quizStateKey = `quiz_state_${id}`
  const quizAnswersKey = `quiz_answers_${id}`
  const quizProgressKey = `quiz_progress_${id}`

  // Load persisted quiz state on component mount
  useEffect(() => {
    if (id && user) {
      try {
        // Load saved answers
        const savedAnswers = localStorage.getItem(quizAnswersKey)
        if (savedAnswers) {
          setAnswers(JSON.parse(savedAnswers))
        }
        
        // Load saved progress
        const savedProgress = localStorage.getItem(quizProgressKey)
        if (savedProgress) {
          const progress = JSON.parse(savedProgress)
          setCurrentQuestionIndex(progress.currentQuestionIndex || 0)
          setTimeElapsed(progress.timeElapsed || 0)
          if (progress.startTime) {
            setStartTime(new Date(progress.startTime))
            setQuizStarted(true)
          }
        }
      } catch (error) {
        console.error('Error loading quiz state:', error)
        // Clear corrupted data
        localStorage.removeItem(quizAnswersKey)
        localStorage.removeItem(quizProgressKey)
      }
    }
  }, [id, user, quizAnswersKey, quizProgressKey])

  // Save quiz state whenever it changes
  useEffect(() => {
    if (id && user && quizStarted) {
      try {
        // Save answers
        localStorage.setItem(quizAnswersKey, JSON.stringify(answers))
        
        // Save progress
        const progressData = {
          currentQuestionIndex,
          timeElapsed,
          startTime: startTime?.toISOString(),
          lastSaved: new Date().toISOString()
        }
        localStorage.setItem(quizProgressKey, JSON.stringify(progressData))
      } catch (error) {
        console.error('Error saving quiz state:', error)
      }
    }
  }, [answers, currentQuestionIndex, timeElapsed, startTime, id, user, quizStarted, quizAnswersKey, quizProgressKey])

  // Clear quiz state on completion
  const clearQuizState = () => {
    try {
      localStorage.removeItem(quizAnswersKey)
      localStorage.removeItem(quizProgressKey)
    } catch (error) {
      console.error('Error clearing quiz state:', error)
    }
  }

  // Timer effect
  useEffect(() => {
    if (!quizStarted || !startTime) return
    
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [quizStarted, startTime])

  // Check if quiz requires access code
  useEffect(() => {
    if (quiz && !quizStarted) {
      if (!quiz.is_public && quiz.access_code) {
        setShowAccessCodeModal(true)
      } else {
        startQuiz()
      }
    }
  }, [quiz, quizStarted])

  const startQuiz = () => {
    setQuizStarted(true)
    setStartTime(new Date())
    setShowAccessCodeModal(false)
  }

  const handleAccessCodeSubmit = () => {
    const trimmedCode = accessCode.trim()
    const quizCode = quiz?.access_code?.trim()
    
    if (!trimmedCode) {
      toast.error('Please enter an access code')
      return
    }
    
    if (trimmedCode.toUpperCase() === quizCode?.toUpperCase()) {
      startQuiz()
    } else {
      toast.error('Invalid access code. Please check and try again.')
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = quiz?.questions?.[currentQuestionIndex]
  const totalQuestions = quiz?.questions?.length || 0
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1
  const isFirstQuestion = currentQuestionIndex === 0

  // Debug information for quiz questions
  // quiz, currentQuestion, currentQuestionIndex, totalQuestions, options: currentQuestion?.options

  const handleAnswerChange = (value: any) => {
    if (!currentQuestion) return
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const finishQuiz = async () => {
    if (!quiz || !user || isSubmitting) return
    
    // Validate that all required questions are answered
    const unansweredQuestions = quiz.questions?.filter(q => {
      const answer = answers[q.id]
      return answer === undefined || answer === '' || answer === null
    }) || []
    
    if (unansweredQuestions.length > 0) {
      setUnansweredCount(unansweredQuestions.length)
      setShowCompletionModal(true)
      return
    }
    
    await submitQuiz()
  }
  
  const submitQuiz = async () => {
    
    setIsSubmitting(true)
    setShowCompletionModal(false)
    
    try {
      const result = await completeQuizMutation.mutateAsync({
        quizId: quiz.id,
        answers,
        timeTaken: timeElapsed
      })
      
      if (!result) {
        throw new Error('Failed to complete quiz')
      }
      
      // Clear persisted quiz state on successful completion
      clearQuizState()
      
      toast.success(`Quiz completed! Score: ${result?.score || 0}%`)
      
      // Trigger confetti for high scores
      if (result && result.score >= 70) {
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        // Follow up with more confetti
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 200);
      }
      
      // Navigate to results page if available, otherwise go to quiz detail
      if (result && result.result_id) {
        navigate(`/quizzes/${quiz.id}/results/${result.result_id}`)
      } else {
        navigate(`/quizzes/${quiz.id}`)
      }
    } catch (error: any) {
      console.error('Quiz submission error:', error)
      toast.error(error.message || 'Failed to submit quiz')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestionInput = () => {
    if (!currentQuestion) return null
    
    const currentAnswer = answers[currentQuestion.id]
    
    switch (currentQuestion.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer === option
              return (
                <div 
                  key={index} 
                  className={`quiz-answer-option ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => handleAnswerChange(option)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${
                      isSelected 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && (
                        <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                      )}
                    </div>
                    <div className="quiz-answer-text flex-1">
                      <MixedContentRenderer content={option} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      
      case 'true_false':
        return (
          <div className="space-y-3">
            <div 
              className={`quiz-answer-option ${
                currentAnswer === 'True' ? 'selected' : ''
              }`}
              onClick={() => handleAnswerChange('True')}
            >
              <div className="flex items-start space-x-3">
                <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${
                  currentAnswer === 'True' 
                    ? 'bg-purple-600 border-purple-600' 
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {currentAnswer === 'True' && (
                    <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                  )}
                </div>
                <div className="quiz-answer-text flex-1 font-medium text-green-700 dark:text-green-400">
                  ✓ Doğru
                </div>
              </div>
            </div>
            <div 
              className={`quiz-answer-option ${
                currentAnswer === 'False' ? 'selected' : ''
              }`}
              onClick={() => handleAnswerChange('False')}
            >
              <div className="flex items-start space-x-3">
                <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${
                  currentAnswer === 'False' 
                    ? 'bg-purple-600 border-purple-600' 
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {currentAnswer === 'False' && (
                    <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                  )}
                </div>
                <div className="quiz-answer-text flex-1 font-medium text-red-700 dark:text-red-400">
                  ✗ Yanlış
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <Type className="h-4 w-4" />
              <span>{t('quiz.textAnswer')}</span>
            </div>
            <div className="p-4 border border-purple-100 dark:border-purple-800 rounded-lg bg-purple-50/50 dark:bg-purple-900/10">
              <Input
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={t('quiz.enterAnswer')}
                className="text-sm min-h-[44px] bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-700 focus:border-purple-500 focus:ring-purple-200"
              />
              <p className="text-xs text-slate-500 mt-2">
                {t('quiz.typeAnswerHint')}
              </p>
            </div>
          </div>
        )
      
      case 'math':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <Calculator className="h-4 w-4" />
              <span>{t('quiz.mathematicalExpression')}</span>
            </div>
            <div className="p-4 border border-purple-100 dark:border-purple-800 rounded-lg bg-purple-50/50 dark:bg-purple-900/10">
              <MathInput
                value={currentAnswer || ''}
                onChange={handleAnswerChange}
                placeholder={t('quiz.enterMathExpression')}
                className="bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-700 focus:border-purple-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                {t('quiz.latexSyntaxHint')}
              </p>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="text-center text-slate-500 p-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <p>Unsupported question type: {currentQuestion.question_type}</p>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="pt-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Quiz Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The quiz you're trying to access doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access code modal
  if (showAccessCodeModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t('quiz.accessCodeRequired')}</CardTitle>
            <CardDescription>
              {t('quiz.accessCodeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="access-code">{t('quiz.accessCode')}</Label>
              <Input
                id="access-code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={t('quiz.enterAccessCode')}
                className="text-center uppercase"
                maxLength={10}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                {t('quiz.cancel')}
              </Button>
              <Button 
                onClick={handleAccessCodeSubmit}
                disabled={!accessCode.trim()}
                className="flex-1"
              >
                {t('quiz.startQuiz')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Completion confirmation modal
  if (showCompletionModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Flag className="h-5 w-5 text-purple-600" />
              <span>{t('quiz.completeQuiz')}</span>
            </CardTitle>
            <CardDescription>
              {unansweredCount > 0 ? (
                <span>
                  {t('quiz.unansweredQuestions', { count: unansweredCount })}
                </span>
              ) : (
                <span>
                  Great job! You've answered all questions. Ready to submit your quiz?
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>{t('quiz.questionsAnswered')}</span>
                <span className="font-medium">{totalQuestions - unansweredCount} / {totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>{t('quiz.timeElapsed')}</span>
                <span className="font-mono font-medium">{formatTime(timeElapsed)}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCompletionModal(false)}
                className="flex-1"
              >
                {t('quiz.continue')}
              </Button>
              <Button 
                onClick={submitQuiz}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t('quiz.finishQuiz')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            {quiz.description && (
              <CardDescription>{quiz.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">{t('quiz.questions')}:</span> {totalQuestions}
              </div>
              <div>
                <span className="font-medium">{t('quiz.difficulty')}:</span>
                <Badge variant="outline" className="ml-2">
                  {quiz.difficulty}
                </Badge>
              </div>
              {quiz.time_limit && (
                <div className="col-span-2">
                  <span className="font-medium">{t('quiz.timeLimit')}:</span> {quiz.time_limit} {t('common.minutes')}
                </div>
              )}
            </div>
            <Button onClick={startQuiz} className="w-full" size="lg">
              {t('quiz.startQuiz')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">{quiz.title}</CardTitle>
              <CardDescription className="text-sm">
                {t('quiz.questionOf', { current: currentQuestionIndex + 1, total: totalQuestions })}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              {quiz.time_limit && (
                <Badge variant="outline" className="text-xs">
                  {t('quiz.timeLimitShort', { minutes: quiz.time_limit })}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-3 sm:mt-4" />
        </CardHeader>
      </Card>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg leading-relaxed quiz-question-text">
                <MixedContentRenderer content={currentQuestion?.question_text || ''} />
              </CardTitle>
              {currentQuestion?.image_url && (
                <div className="mt-3 sm:mt-4 quiz-question-image">
                  <div className="relative group cursor-pointer" onClick={() => window.open(currentQuestion.image_url, '_blank')}>
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Question illustration" 
                      className="w-full max-w-2xl h-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 mx-auto block object-contain"
                      style={{ maxHeight: '400px' }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-full p-2 shadow-lg">
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">{t('quiz.viewFullSize')}</p>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {renderQuestionInput()}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={isFirstQuestion}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Always show Finish Quiz option */}
              <Button
                variant="outline"
                onClick={finishQuiz}
                disabled={isSubmitting}
                className="min-w-[120px] w-full sm:w-auto order-2 sm:order-1"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4 mr-2" />
                )}
                Finish Quiz
              </Button>
              
              {/* Next button (only if not last question) */}
              {!isLastQuestion && (
                <Button
                  onClick={nextQuestion}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
