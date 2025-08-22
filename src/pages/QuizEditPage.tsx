import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useQuiz, useUpdateQuiz, useUpdateQuestion, useDeleteQuestion, useAddQuestions, useUploadQuizFile, useQuizCategories } from '@/hooks/useQuiz'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Trash2, Plus, ImageIcon, Loader2, AlertTriangle } from 'lucide-react'
import { generateAccessCode } from '@/lib/utils'
import { Question } from '@/lib/supabase'
import MathRenderer from '@/components/MathRenderer'
import MathInput from '@/components/MathInput'
import ImageUploadCrop from '@/components/ImageUploadCrop'
import { MathEditor } from '@/components/ui/MathEditor'
import { MathRenderer as NewMathRenderer } from '@/components/ui/MathRenderer'

// Zod Schemas
const questionSchema = z.object({
  id: z.string(),
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['multiple_choice', 'true_false', 'text', 'math']),
  options: z.array(z.string()).default([]),
  correct_answer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().optional(),
  points: z.number().min(1, 'Points must be at least 1').default(1),
  image_url: z.string().optional()
})

const quizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  time_limit: z.number().min(0).default(0),
  max_attempts: z.number().min(1).default(1),
  is_public: z.boolean().default(true),
  access_code: z.string().optional(),
  hero_image_url: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required')
})

type QuizFormData = z.infer<typeof quizSchema>
type QuestionFormData = z.infer<typeof questionSchema>

export default function QuizEditPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: quiz, isLoading: quizLoading, error: quizError } = useQuiz(id!)
  const updateQuizMutation = useUpdateQuiz()
  const updateQuestionMutation = useUpdateQuestion()
  const deleteQuestionMutation = useDeleteQuestion()
  const addQuestionsMutation = useAddQuestions()
  const uploadFileMutation = useUploadQuizFile()
  const { data: categoriesData, isLoading: categoriesLoading } = useQuizCategories()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [heroImageUrl, setHeroImageUrl] = useState<string>('')

  // Access control
  const canEdit = user && quiz && (user.role === 'admin' || user.id === quiz.creator_id)

  // Form setup
  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      difficulty: 'medium',
      time_limit: 0,
      max_attempts: 1,
      is_public: true,
      access_code: '',
      questions: []
    }
  })

  const { fields: questions, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'questions'
  })

  // Auto-adjust currentQuestionIndex if it's out of bounds
  React.useEffect(() => {
    if (questions.length > 0 && (currentQuestionIndex >= questions.length || currentQuestionIndex < 0)) {
      setCurrentQuestionIndex(0)
    }
  }, [questions.length, currentQuestionIndex])

  // Load quiz data into form
  useEffect(() => {
    if (quiz && quiz.questions) {
      form.reset({
        title: quiz.title,
        description: quiz.description || '',
        category: quiz.category || '',
        difficulty: quiz.difficulty,
        time_limit: quiz.time_limit || 0,
        max_attempts: quiz.max_attempts,
        is_public: quiz.is_public,
        access_code: quiz.access_code || '',
        hero_image_url: quiz.hero_image_url || '',
        questions: quiz.questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          points: q.points,
          image_url: q.image_url || ''
        }))
      })
      
      // Set hero image URL
      setHeroImageUrl(quiz.hero_image_url || '')
    }
  }, [quiz, form])

  if (quizLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (quizError || !quiz) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="pt-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Quiz Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This quiz does not exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => navigate('/quizzes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Use categories from database, with fallback to default categories
  const categories = categoriesData?.map(cat => cat.name) || ['Math', 'History', 'Geography', 'Literature', 'Science', 'English', 'Other']
  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ]

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="pt-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You don't have permission to edit this quiz.
            </p>
            <Button onClick={() => navigate(`/quizzes/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'text', label: 'Text Answer' },
    { value: 'math', label: 'Math Expression' }
  ]

  const addNewQuestion = () => {
    const newQuestion: QuestionFormData = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', '', ''], // Support up to 5 options
      correct_answer: '',
      explanation: '',
      points: 1
    }
    append(newQuestion)
    setCurrentQuestionIndex(questions.length)
  }

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    const currentQuestions = form.getValues('questions')
    const updatedQuestion = { ...currentQuestions[index], [field]: value }
    
    // Handle special logic for question type changes
    if (field === 'question_type') {
      if (value === 'true_false') {
        updatedQuestion.options = ['True', 'False']
        updatedQuestion.correct_answer = ''
      } else if (value === 'multiple_choice') {
        updatedQuestion.options = ['', '', '', '']
        updatedQuestion.correct_answer = ''
      } else if (value === 'text' || value === 'math') {
        updatedQuestion.options = []
        updatedQuestion.correct_answer = ''
      }
    }
    
    update(index, updatedQuestion)
  }

  const deleteQuestion = async (index: number) => {
    const question = questions[index]
    
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return
    }
    
    if (question.id.startsWith('new-')) {
      // New question, just remove from form
      remove(index)
      toast.success('Question removed')
    } else {
      // Existing question, delete from database
      try {
        await deleteQuestionMutation.mutateAsync(question.id)
        remove(index)
        toast.success('Question deleted successfully')
      } catch (error) {
        toast.error('Failed to delete question')
        return
      }
    }
    
    // Adjust current question index if needed
    if (currentQuestionIndex >= questions.length - 1) {
      setCurrentQuestionIndex(Math.max(0, questions.length - 2))
    } else if (currentQuestionIndex > index) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleImageUpload = async (questionIndex: number, file: File) => {
    try {
      const imageUrl = await uploadFileMutation.mutateAsync({
        file,
        questionId: questions[questionIndex].id
      })
      updateQuestion(questionIndex, 'image_url', imageUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error('Image upload failed')
    }
  }

  const handleSubmit = form.handleSubmit(async (data: QuizFormData) => {
    setIsSubmitting(true)
    try {
      // Update quiz basic info
      const quizUpdates = {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        time_limit: data.time_limit,
        max_attempts: data.max_attempts,
        is_public: data.is_public,
        access_code: data.is_public ? undefined : (data.access_code || generateAccessCode()),
        hero_image_url: heroImageUrl
      }
      
      await updateQuizMutation.mutateAsync({
        quizId: id!,
        updates: quizUpdates
      })

      // Handle questions
      const newQuestions = data.questions.filter(q => q.id.startsWith('new-'))
      const existingQuestions = data.questions.filter(q => !q.id.startsWith('new-'))

      // Update existing questions
      for (const question of existingQuestions) {
        const updates = {
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.question_type === 'multiple_choice' ? 
            question.options.filter(opt => opt.trim()) : undefined,
          correct_answer: question.correct_answer,
          explanation: question.explanation || '',
          points: question.points,
          image_url: question.image_url
        }
        
        await updateQuestionMutation.mutateAsync({
          questionId: question.id,
          updates
        })
      }

      // Add new questions
      if (newQuestions.length > 0) {
        const formattedNewQuestions = newQuestions.map((q, index) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.question_type === 'multiple_choice' ? 
            q.options.filter(opt => opt.trim()) : undefined,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          points: q.points,
          order_index: (existingQuestions.length + index + 1),
          image_url: q.image_url
        }))
        
        await addQuestionsMutation.mutateAsync({
          quizId: id!,
          questions: formattedNewQuestions
        })
      }

      toast.success('Quiz updated successfully!')
      navigate(`/quizzes/${id}`)
    } catch (error) {
      console.error('Quiz update error:', error)
      toast.error('Failed to update quiz')
    } finally {
      setIsSubmitting(false)
    }
  })

  // Ensure we have valid questions and current index
  const currentQuestion = questions && questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length 
    ? questions[currentQuestionIndex] 
    : null

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate(`/quizzes/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quiz
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Edit Quiz</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Make changes to your quiz and questions
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || updateQuizMutation.isPending}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quiz Info */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
            <CardDescription>Basic quiz details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div>
                    <Input
                      id="title"
                      placeholder="Enter quiz title"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder="Brief description of the quiz"
                    rows={3}
                    {...field}
                  />
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Controller
                  name="difficulty"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || 'medium'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map(diff => (
                          <SelectItem key={diff.value} value={diff.value}>
                            {diff.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Controller
                  name="time_limit"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="timeLimit"
                      type="number"
                      placeholder="0 = unlimited"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Controller
                  name="max_attempts"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="maxAttempts"
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={form.watch('is_public')}
                onCheckedChange={(checked) => form.setValue('is_public', !!checked)}
              />
              <Label htmlFor="isPublic">Public access</Label>
            </div>
            
            {!form.watch('is_public') && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  {...form.register('access_code')}
                  placeholder="Leave empty to auto-generate"
                />
              </div>
            )}
            
            <div className="space-y-4">
              <Label className="text-base font-medium">Quiz Hero Image</Label>
              <p className="text-sm text-slate-500 mb-4">
                Upload a hero image for your quiz to make it more engaging
              </p>
              <ImageUploadCrop
                onImageUploaded={setHeroImageUrl}
                onImageRemoved={() => setHeroImageUrl('')}
                existingImageUrl={heroImageUrl}
                maxSizeInMB={5}
                aspectRatio={16 / 9}
                cropWidth={800}
                cropHeight={450}
                allowCrop={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Questions List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions ({questions.length})</CardTitle>
                  <CardDescription>Manage quiz questions</CardDescription>
                </div>
                <Button onClick={addNewQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length > 0 ? (
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentQuestionIndex === index
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            Q{index + 1}: {question.question_text || 'Untitled Question'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {questionTypes.find(t => t.value === question.question_type)?.label}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteQuestion(index)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">No questions added yet</p>
                  <Button onClick={addNewQuestion} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Editor */}
          {currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Question {currentQuestionIndex + 1}</CardTitle>
                <CardDescription>Configure question details and answers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Text */}
                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  {currentQuestion.question_type === 'math' ? (
                    <MathEditor
                      value={currentQuestion.question_text}
                      onChange={(latex, isValid) => {
                        updateQuestion(currentQuestionIndex, 'question_text', latex)
                      }}
                      placeholder="Enter mathematical question using the visual editor or LaTeX..."
                      className="w-full"
                      showPreview={true}
                    />
                  ) : (
                    <Textarea
                      value={currentQuestion.question_text}
                      onChange={(e) => updateQuestion(currentQuestionIndex, 'question_text', e.target.value)}
                      placeholder="Enter your question"
                      rows={3}
                    />
                  )}
                </div>

                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={currentQuestion.question_type}
                    onValueChange={(value: any) => {
                      updateQuestion(currentQuestionIndex, 'question_type', value)
                      // Reset options and correct answer when type changes
                      if (value === 'true_false') {
                        updateQuestion(currentQuestionIndex, 'options', ['True', 'False'])
                        updateQuestion(currentQuestionIndex, 'correct_answer', '')
                      } else if (value === 'multiple_choice') {
                        updateQuestion(currentQuestionIndex, 'options', ['', '', '', '', ''])
                        updateQuestion(currentQuestionIndex, 'correct_answer', '')
                      } else {
                        updateQuestion(currentQuestionIndex, 'options', [])
                        updateQuestion(currentQuestionIndex, 'correct_answer', '')
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Multiple Choice Options */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Answer Options</Label>
                    <div className="space-y-3">
                      {[0, 1, 2, 3, 4].map((optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-sm font-medium">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <Input
                            value={currentQuestion.options[optionIndex] || ''}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options]
                              newOptions[optionIndex] = e.target.value
                              updateQuestion(currentQuestionIndex, 'options', newOptions)
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True/False Options */}
                {currentQuestion.question_type === 'true_false' && (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <RadioGroup
                      value={currentQuestion.correct_answer}
                      onValueChange={(value) => updateQuestion(currentQuestionIndex, 'correct_answer', value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="True" id="true" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="False" id="false" />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Text Answer */}
                {currentQuestion.question_type === 'text' && (
                  <div className="space-y-2">
                    <Label>Sample Answer (for reference)</Label>
                    <Input
                      value={currentQuestion.correct_answer}
                      onChange={(e) => updateQuestion(currentQuestionIndex, 'correct_answer', e.target.value)}
                      placeholder="Enter a sample correct answer"
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      For text questions, any non-empty answer will be accepted during quiz taking.
                    </p>
                  </div>
                )}

                {/* Math Expression */}
                {currentQuestion.question_type === 'math' && (
                  <div className="space-y-2">
                    <Label>Correct Math Expression</Label>
                    <MathEditor
                      value={currentQuestion.correct_answer}
                      onChange={(latex, isValid) => {
                        updateQuestion(currentQuestionIndex, 'correct_answer', latex)
                      }}
                      placeholder="Enter the correct mathematical expression using LaTeX..."
                      compact={true}
                      showPreview={true}
                    />
                  </div>
                )}

                {/* Multiple Choice Correct Answer */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Select
                      value={currentQuestion.correct_answer}
                      onValueChange={(value) => updateQuestion(currentQuestionIndex, 'correct_answer', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select the correct option" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentQuestion && Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, index) => (
                          option.trim() && (
                            <SelectItem key={index} value={option}>
                              {String.fromCharCode(65 + index)}: {option}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Points */}
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentQuestion.points}
                    onChange={(e) => updateQuestion(currentQuestionIndex, 'points', Number(e.target.value))}
                  />
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label>Explanation (Optional)</Label>
                  <Textarea
                    value={currentQuestion.explanation}
                    onChange={(e) => updateQuestion(currentQuestionIndex, 'explanation', e.target.value)}
                    placeholder="Explain the correct answer"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
