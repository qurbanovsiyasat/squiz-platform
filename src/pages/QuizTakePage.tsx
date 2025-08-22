import { useState, useEffect } from 'react'
// ReferenceError: x is not defined hatası için dosyanın başında veya fonksiyonlarda tanımsız x değişkeni olup olmadığını kontrol ettim. Kodun hiçbir yerinde x değişkeni kullanılmıyor. Eğer bir yerde yanlışlıkla x kullandıysanız, onu kaldırdım.
import { useParams, useNavigate } from 'react-router-dom'
import { useQuiz, useCompleteQuizAttempt } from '@/hooks/useQuiz'
import { useAuth } from '@/contexts/AuthContext'
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

  // Debug logging for quiz questions
  console.log('QuizTake Debug:', { 
    quiz, 
    currentQuestion, 
    currentQuestionIndex, 
    totalQuestions,
    options: currentQuestion?.options 
  })

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
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Are you sure you want to submit?`
      )
      if (!confirmSubmit) return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await completeQuizMutation.mutateAsync({
        quizId: quiz.id,
        answers,
        timeTaken: timeElapsed
      })
      
      console.log('Quiz completion result:', result)
      
      if (!result) {
        throw new Error('Failed to complete quiz')
      }
      
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
          <RadioGroup 
            value={currentAnswer || ''} 
            onValueChange={handleAnswerChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 rounded-xl border-2 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-black transition-all duration-200 cursor-pointer group">
                <RadioGroupItem value={option} id={`option-${index}`} className="shrink-0" />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer text-base leading-relaxed group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors"
                >
                  {currentQuestion?.question_type === 'math' ? (
                    <NewMathRenderer latex={option} inline={true} />
                  ) : (
                    <MixedContentRenderer content={option} />
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )
      
      case 'true_false':
        return (
          <RadioGroup 
            value={currentAnswer || ''} 
            onValueChange={handleAnswerChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-3 p-4 rounded-xl border-2 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group">
              <RadioGroupItem value="True" id="true" className="shrink-0" />
              <Label htmlFor="true" className="flex-1 cursor-pointer text-base font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">✓ Doğru</Label>
            </div>
            <div className="flex items-center space-x-3 p-4 rounded-xl border-2 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group">
              <RadioGroupItem value="False" id="false" className="shrink-0" />
              <Label htmlFor="false" className="flex-1 cursor-pointer text-base font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">✗ Yanlış</Label>
            </div>
          </RadioGroup>
        )
      
      case 'text':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <Type className="h-4 w-4" />
              <span>Text Answer</span>
            </div>
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
              <Input
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your answer..."
                className="text-base min-h-[44px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              />
              <p className="text-xs text-slate-500 mt-2">
                Type your answer in the text field above
              </p>
            </div>
          </div>
        )
      
      case 'math':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <Calculator className="h-4 w-4" />
              <span>Mathematical Expression</span>
            </div>
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
              <MathInput
                value={currentAnswer || ''}
                onChange={handleAnswerChange}
                placeholder="Enter mathematical expression using LaTeX..."
                className="bg-white dark:bg-slate-900"
              />
              <p className="text-xs text-slate-500 mt-2">
                Use LaTeX syntax for mathematical expressions (e.g., \frac{"{1}"}{"{2}"}, x^2, \sqrt{"{x}"})
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
            <CardTitle>Access Code Required</CardTitle>
            <CardDescription>
              This quiz requires an access code to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="access-code">Access Code</Label>
              <Input
                id="access-code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code"
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
                Cancel
              </Button>
              <Button 
                onClick={handleAccessCodeSubmit}
                disabled={!accessCode.trim()}
                className="flex-1"
              >
                Start Quiz
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
                <span className="font-medium">Questions:</span> {totalQuestions}
              </div>
              <div>
                <span className="font-medium">Difficulty:</span>
                <Badge variant="outline" className="ml-2">
                  {quiz.difficulty}
                </Badge>
              </div>
              {quiz.time_limit && (
                <div className="col-span-2">
                  <span className="font-medium">Time Limit:</span> {quiz.time_limit} minutes
                </div>
              )}
            </div>
            <Button onClick={startQuiz} className="w-full" size="lg">
              Start Quiz
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
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              {quiz.time_limit && (
                <Badge variant="outline" className="text-xs">
                  Limit: {quiz.time_limit}m
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
              <CardTitle className="text-base sm:text-lg leading-relaxed">
                {currentQuestion?.question_type === 'math' ? (
                  <NewMathRenderer latex={currentQuestion?.question_text || ''} displayMode={false} />
                ) : (
                  <MixedContentRenderer content={currentQuestion?.question_text || ''} />
                )}
              </CardTitle>
              {currentQuestion?.image_url && (
                <div className="mt-3 sm:mt-4">
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question illustration" 
                    className="max-w-full h-auto rounded-lg"
                  />
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
