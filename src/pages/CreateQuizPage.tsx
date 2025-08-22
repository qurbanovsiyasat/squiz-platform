import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase, uploadImage } from '@/lib/supabase'
import { CategorySelect } from '@/components/admin/CategorySelect'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import MathInput from '@/components/MathInput'
import MathRenderer from '@/components/MathRenderer'
import { MathEditor } from '@/components/ui/MathEditor'
import { MathRenderer as NewMathRenderer } from '@/components/ui/MathRenderer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { Switch } from '@/components/ui/Switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'react-hot-toast'
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Upload, 
  FileText, 
  Clock, 
  Users, 
  Lock,
  Globe,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  BookOpen,
  Calculator,
  ImageIcon,
  Hash
} from 'lucide-react'
import { generateAccessCode } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'text' | 'math'
  options?: string[]
  correct_answer: string
  explanation?: string
  points: number
  image_url?: string
  math_expression?: string
}



function CreateQuizContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Quiz basic info
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [isPublic, setIsPublic] = useState(true)
  const [accessCode, setAccessCode] = useState('')
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  // Current question editing
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'text' | 'math'>('multiple_choice')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [points, setPoints] = useState(1)
  const [questionImage, setQuestionImage] = useState<string | null>(null)
  const [mathExpression, setMathExpression] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Math input components
  const [mathNumerator, setMathNumerator] = useState('')
  const [mathDenominator, setMathDenominator] = useState('')
  const [showMathPreview, setShowMathPreview] = useState(false)

  useEffect(() => {
    // Generate access code for private quizzes
    setAccessCode(generateAccessCode())
  }, [])

  const handleImageUpload = async (file: File) => {
    if (!file) return
    
    if (file.size > 20971520) {
      toast.error('Fayl ölçüsü 20MB-dan çox ola bilməz')
      return
    }

    setUploadingImage(true)
    try {
      const imageUrl = await uploadImage(file, 'quiz-questions')
      setQuestionImage(imageUrl)
      toast.success('Şəkil uğurla yükləndi')
    } catch (error: any) {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Şəkil yüklənmədi')
    } finally {
      setUploadingImage(false)
    }
  }

  const updateMathExpression = () => {
    if (mathNumerator && mathDenominator) {
      const fraction = `\\frac{${mathNumerator}}{${mathDenominator}}`
      setMathExpression(fraction)
      setShowMathPreview(true)
    } else if (mathExpression) {
      setShowMathPreview(true)
    }
  }

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      if (correctAnswer === options[index]) {
        setCorrectAnswer('')
      }
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const saveCurrentQuestion = () => {
    if (!questionText.trim()) {
      toast.error('Sual mətni daxil edilməlidir')
      return false
    }
    
    if (questionType === 'multiple_choice' && options.filter(opt => opt.trim()).length < 2) {
      toast.error('Ən azı 2 variant olmalıdır')
      return false
    }
    
    if (!correctAnswer.trim()) {
      toast.error('Düzgün cavab seçilməlidir')
      return false
    }

    const questionData: Question = {
      id: questions[currentQuestionIndex]?.id || `temp-${Date.now()}`,
      question_text: questionText,
      question_type: questionType,
      options: questionType === 'multiple_choice' ? options.filter(opt => opt.trim()) : undefined,
      correct_answer: correctAnswer,
      explanation: explanation || undefined,
      points: points,
      image_url: questionImage || undefined,
      math_expression: questionType === 'math' ? mathExpression : undefined
    }

    const newQuestions = [...questions]
    if (currentQuestionIndex < questions.length) {
      newQuestions[currentQuestionIndex] = questionData
    } else {
      newQuestions.push(questionData)
    }
    
    setQuestions(newQuestions)
    return true
  }

  const addNewQuestion = () => {
    if (saveCurrentQuestion()) {
      // Reset form for new question
      setQuestionText('')
      setQuestionType('multiple_choice')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setExplanation('')
      setPoints(1)
      setQuestionImage(null)
      setMathExpression('')
      setMathNumerator('')
      setMathDenominator('')
      setShowMathPreview(false)
      
      setCurrentQuestionIndex(questions.length)
      setCurrentStep(2) // Stay on questions step
    }
  }

  const loadQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      const question = questions[index]
      setQuestionText(question.question_text)
      setQuestionType(question.question_type)
      setOptions(question.options || ['', '', '', ''])
      setCorrectAnswer(question.correct_answer)
      setExplanation(question.explanation || '')
      setPoints(question.points)
      setQuestionImage(question.image_url || null)
      setMathExpression(question.math_expression || '')
      
      // Parse math expression if it's a fraction
      if (question.math_expression && question.math_expression.includes('\\frac')) {
        const fractionMatch = question.math_expression.match(/\\frac\{([^}]+)\}\{([^}]+)\}/)
        if (fractionMatch) {
          setMathNumerator(fractionMatch[1])
          setMathDenominator(fractionMatch[2])
        }
        setShowMathPreview(true)
      }
      
      setCurrentQuestionIndex(index)
    }
  }

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index)
    setQuestions(newQuestions)
    
    if (currentQuestionIndex >= newQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, newQuestions.length - 1))
    }
    
    if (newQuestions.length > 0) {
      loadQuestion(Math.min(currentQuestionIndex, newQuestions.length - 1))
    } else {
      // Reset to empty question form
      setQuestionText('')
      setQuestionType('multiple_choice')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setExplanation('')
      setPoints(1)
      setQuestionImage(null)
      setMathExpression('')
      setCurrentQuestionIndex(0)
    }
  }

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate basic info
      if (!quizTitle.trim()) {
        toast.error('Test adı daxil edilməlidir')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Save current question and move to preview
      if (questionText.trim() && saveCurrentQuestion()) {
        setCurrentStep(3)
      } else if (questions.length === 0) {
        toast.error('Ən azı 1 sual əlavə edilməlidir')
      } else {
        setCurrentStep(3)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveQuiz = async () => {
    if (!user) {
      toast.error('Daxil olmaq tələb olunur')
      return
    }

    if (questions.length === 0) {
      toast.error('Ən azı 1 sual əlavə edilməlidir')
      return
    }

    setLoading(true)
    try {
      // Create quiz
      const quizData = {
        title: quizTitle,
        description: quizDescription || null,
        creator_id: user.id,
        category_id: (selectedCategory && selectedCategory !== '' && selectedCategory !== '__none__') ? selectedCategory : null,
        difficulty: difficulty,
        time_limit: timeLimit,
        max_attempts: maxAttempts,
        is_public: isPublic,
        access_code: !isPublic ? accessCode : null,
        settings: {
          show_correct_answers: true,
          randomize_questions: false,
          randomize_options: false
        }
      }

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([quizData])
        .select()
        .maybeSingle()

      if (quizError) throw quizError
      if (!quiz) throw new Error('Quiz yaradılmadı')

      // Create questions
      const questionsData = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        points: q.points,
        order_index: index + 1,
        image_url: q.image_url,
        math_expression: q.math_expression
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData)

      if (questionsError) throw questionsError

      toast.success('Test uğurla yaradıldı!')
      navigate(`/quizzes/${quiz.id}`)
    } catch (error: any) {
      console.error('Error creating quiz:', error)
      toast.error(error.message || 'Test yaradılmadı')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
            ${
              currentStep === step
                ? 'bg-purple-600 text-white'
                : currentStep > step
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }
          `}>
            {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
          </div>
          {step < 3 && (
            <div className={`w-16 h-1 mx-2 ${
              currentStep > step ? 'bg-green-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderBasicInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <span>Test Məlumatları</span>
        </CardTitle>
        <CardDescription>
          Testin əsas məlumatlarını daxil edin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">{t('quiz.title')} *</Label>
              <Input
                id="title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Test adını daxil edin"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">{t('quiz.description')}</Label>
              <Textarea
                id="description"
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Test haqqında qısa məlumat"
                rows={3}
              />
            </div>
            
            <CategorySelect
              type="quiz"
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              placeholder="Kateqoriya seçin (istəyə bağlı)"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="difficulty">{t('quiz.difficulty')}</Label>
              <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('quiz.easy')}</SelectItem>
                  <SelectItem value="medium">{t('quiz.medium')}</SelectItem>
                  <SelectItem value="hard">{t('quiz.hard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="time-limit">{t('quiz.timeLimit')} (dəqiqə)</Label>
              <Input
                id="time-limit"
                type="number"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Məhdudiyyət yoxdur"
                min={1}
                max={300}
              />
            </div>
            
            <div>
              <Label htmlFor="max-attempts">Maksimum cəhd</Label>
              <Input
                id="max-attempts"
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="public-switch">Test açıqlığı</Label>
              <p className="text-sm text-gray-500">
                Açıq testlər hərkəs tərəfindən görülə bilər
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className={`h-4 w-4 ${isPublic ? 'text-green-600' : 'text-gray-400'}`} />
              <Switch
                id="public-switch"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Lock className={`h-4 w-4 ${!isPublic ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </div>
          
          {!isPublic && (
            <div>
              <Label htmlFor="access-code">{t('quiz.accessCode')}</Label>
              <div className="flex space-x-2">
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Giriş kodu"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAccessCode(generateAccessCode())}
                >
                  Yenile
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderQuestionEditor = () => (
    <div className="space-y-6">
      {/* Questions Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suallar ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      currentQuestionIndex === index
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => loadQuestion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">
                        Sual {index + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteQuestion(index)
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {question.question_text}
                    </p>
                  </div>
                ))}
                
                <Button
                  onClick={addNewQuestion}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Yeni sual
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Question Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Sual {currentQuestionIndex + 1}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  {questionType === 'math' ? (
                    <div className="space-y-2">
                      <Label>{`${t('quiz.questionText')} *`}</Label>
                      <MathEditor
                        value={questionText}
                        onChange={(latex, isValid) => {
                          setQuestionText(latex)
                        }}
                        placeholder="Enter mathematical question using the visual editor or LaTeX..."
                        className="w-full"
                        showPreview={true}
                      />
                    </div>
                  ) : (
                    <MathInput
                      label={`${t('quiz.questionText')} *`}
                      value={questionText}
                      onChange={setQuestionText}
                      placeholder="Sual mətnini daxil edin (LaTeX dəstəyi ilə riyazi ifadələr üçün)"
                      className="w-full"
                    />
                  )}
                </div>
                
                <div>
                  <Label htmlFor="question-type">{t('quiz.questionType')}</Label>
                  <Select value={questionType} onValueChange={(value: any) => setQuestionType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">{t('quiz.multipleChoice')}</SelectItem>
                      <SelectItem value="true_false">{t('quiz.trueFalse')}</SelectItem>
                      <SelectItem value="text">{t('quiz.textInput')}</SelectItem>
                      <SelectItem value="math">{t('quiz.mathInput')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Image Upload */}
              <div>
                <Label>Şəkil (əgər varsa)</Label>
                {questionImage ? (
                  <div className="mt-2">
                    <img src={questionImage} alt="Question" className="max-w-sm rounded-lg border" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestionImage(null)}
                      className="mt-2"
                    >
                      Şəkli sil
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label htmlFor="question-image" className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        {uploadingImage ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                            <span className="ml-2 text-sm">Yüklənir...</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">Şəkil yükləyin</p>
                          </>
                        )}
                      </div>
                    </label>
                    <input
                      id="question-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      className="sr-only"
                    />
                  </div>
                )}
              </div>
              
              {/* Math Expression for math questions */}
              {questionType === 'math' && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <Label className="flex items-center space-x-2 mb-3">
                      <Calculator className="h-4 w-4" />
                      <span>Riyazi ifadə</span>
                    </Label>
                    
                    <Tabs defaultValue="fraction" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="fraction">Kəsr</TabsTrigger>
                        <TabsTrigger value="latex">LaTeX</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="fraction" className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="numerator">Suret</Label>
                            <Input
                              id="numerator"
                              value={mathNumerator}
                              onChange={(e) => setMathNumerator(e.target.value)}
                              placeholder="Suret"
                            />
                          </div>
                          <div>
                            <Label htmlFor="denominator">Məxrəc</Label>
                            <Input
                              id="denominator"
                              value={mathDenominator}
                              onChange={(e) => setMathDenominator(e.target.value)}
                              placeholder="Məxrəc"
                            />
                          </div>
                        </div>
                        <Button type="button" onClick={updateMathExpression} size="sm">
                          Yenilə
                        </Button>
                      </TabsContent>
                      
                      <TabsContent value="latex" className="space-y-3">
                        <div>
                          <Label htmlFor="math-expression">LaTeX ifadəsi</Label>
                          <Input
                            id="math-expression"
                            value={mathExpression}
                            onChange={(e) => setMathExpression(e.target.value)}
                            placeholder="\\frac{a}{b} vəya x^2 + y^2"
                          />
                        </div>
                        <Button type="button" onClick={() => setShowMathPreview(true)} size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Öniz göstər
                        </Button>
                      </TabsContent>
                    </Tabs>
                    
                    {showMathPreview && mathExpression && (
                      <div className="mt-4 p-3 bg-white border rounded">
                        <Label className="text-xs text-gray-600">Öniz:</Label>
                        <div className="text-center py-2">
                          <BlockMath math={mathExpression} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Options for multiple choice */}
              {questionType === 'multiple_choice' && (
                <div>
                  <Label>{t('quiz.options')} *</Label>
                  <div className="space-y-2 mt-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={correctAnswer === option}
                          onChange={() => setCorrectAnswer(option)}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Variant ${index + 1}`}
                          className="flex-1"
                        />
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {options.length < 6 && (
                      <Button type="button" variant="outline" size="sm" onClick={addOption}>
                        <Plus className="h-4 w-4 mr-1" />
                        Variant əlavə et
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* True/False options */}
              {questionType === 'true_false' && (
                <div>
                  <Label>{t('quiz.correctAnswer')} *</Label>
                  <div className="flex space-x-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="true-false"
                        value="true"
                        checked={correctAnswer === 'true'}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Doğru</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="true-false"
                        value="false"
                        checked={correctAnswer === 'false'}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Yanlış</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Text/Math answer */}
              {(questionType === 'text' || questionType === 'math') && (
                <div>
                  {questionType === 'math' ? (
                    <div className="space-y-2">
                      <Label>{`${t('quiz.correctAnswer')} *`}</Label>
                      <MathEditor
                        value={correctAnswer}
                        onChange={(latex, isValid) => {
                          setCorrectAnswer(latex)
                        }}
                        placeholder="Enter the correct mathematical answer using LaTeX..."
                        className="w-full"
                        compact={true}
                        showPreview={true}
                      />
                    </div>
                  ) : (
                    <MathInput
                      label={`${t('quiz.correctAnswer')} *`}
                      value={correctAnswer}
                      onChange={setCorrectAnswer}
                      placeholder="Düzgün cavabı daxil edin"
                      className="w-full"
                    />
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {questionType === 'math' ? (
                    <div className="space-y-2">
                      <Label>{t('quiz.explanation')}</Label>
                      <MathEditor
                        value={explanation}
                        onChange={(latex, isValid) => {
                          setExplanation(latex)
                        }}
                        placeholder="Enter explanation with mathematical expressions..."
                        className="w-full"
                        compact={true}
                        showPreview={true}
                      />
                    </div>
                  ) : (
                    <MathInput
                      label={t('quiz.explanation')}
                      value={explanation}
                      onChange={setExplanation}
                      placeholder="Cavabın izаhı - riyazi ifadələr dəstəklənir (əgər varsa)"
                      className="w-full"
                    />
                  )}
                </div>
                
                <div>
                  <Label htmlFor="points">{t('quiz.points')}</Label>
                  <Input
                    id="points"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderPreview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Test Öniz Göstərişi</span>
        </CardTitle>
        <CardDescription>
          Testə son nəzər saldıqdan sonra yadda saxlayın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quiz Info */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">{quizTitle}</h3>
          {quizDescription && (
            <p className="text-gray-600 mb-3">{quizDescription}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{difficulty}</Badge>
            {selectedCategory && <Badge variant="outline">{selectedCategory}</Badge>}
            {timeLimit && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{timeLimit} dəqiqə</span>
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{maxAttempts} cəhd</span>
            </Badge>
            {!isPublic && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>Məxfi</span>
              </Badge>
            )}
          </div>
        </div>
        
        {/* Questions Preview */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Suallar ({questions.length})</h4>
          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-purple-600">Sual {index + 1}</span>
                <Badge variant="outline">{question.points} bal</Badge>
              </div>
              
              <div className="font-medium mb-2">
                <MathRenderer>{question.question_text}</MathRenderer>
              </div>
              
              {question.image_url && (
                <img 
                  src={question.image_url} 
                  alt="Question" 
                  className="max-w-xs rounded border mb-2" 
                />
              )}
              
              {question.math_expression && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                  <div className="text-center">
                    <BlockMath math={question.math_expression} />
                  </div>
                </div>
              )}
              
              {question.question_type === 'multiple_choice' && question.options && (
                <div className="space-y-1">
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex} 
                      className={`p-2 rounded text-sm ${
                        option === question.correct_answer 
                          ? 'bg-green-100 border border-green-300' 
                          : 'bg-gray-50'
                      }`}
                    >
                      {option === question.correct_answer && '✓ '}{option}
                    </div>
                  ))}
                </div>
              )}
              
              {question.question_type === 'true_false' && (
                <div className="text-sm">
                  <span className="font-medium">Düzgün cavab: </span>
                  {question.correct_answer === 'true' ? 'Doğru' : 'Yanlış'}
                </div>
              )}
              
              {(question.question_type === 'text' || question.question_type === 'math') && (
                <div className="text-sm">
                  <span className="font-medium">Düzgün cavab: </span>
                  <MathRenderer inline>{question.correct_answer}</MathRenderer>
                </div>
              )}
              
              {question.explanation && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">İzahat: </span>
                  <MathRenderer inline>{question.explanation}</MathRenderer>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('quiz.createQuiz')}</h1>
          <p className="text-gray-600">Yeni test yaradmaq üçün aşağıdakı addımları yeridən keirin</p>
        </div>

        {renderStepIndicator()}

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && renderBasicInfo()}
          {currentStep === 2 && renderQuestionEditor()}
          {currentStep === 3 && renderPreview()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Əvvəlki addım
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate('/quizzes')}>
              Ləğv et
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={nextStep}>
                Növbəti addım
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={saveQuiz} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Yadda saxlanır...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Test yarad
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateQuizPage() {
  return (
    <ErrorBoundary>
      <CreateQuizContent />
    </ErrorBoundary>
  )
}
