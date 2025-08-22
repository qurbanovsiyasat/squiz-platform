import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { 
  useQAQuestion, 
  useQAAnswers, 
  useCreateQAAnswer, 
  useVoteQAQuestion,
  useVoteQAAnswer,
  useUserVote,
  useIncrementQuestionViews,
  useAcceptAnswer,
  QAAnswer
} from '@/hooks/useQA'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import MathInput from '@/components/MathInput'
import MathRenderer from '@/components/MathRenderer'
import AutoLangText from '@/components/AutoLangText'
import ImageUploadCrop from '@/components/ImageUploadCrop'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { motion } from 'framer-motion'
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Eye, 
  CheckCircle, 
  User,
  Calendar,
  Reply,
  Save,
  Loader2,
  ArrowLeft,
  Calculator,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { toast } from 'sonner'

export default function QAQuestionPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [newAnswer, setNewAnswer] = useState('')
  const [newAnswerImageUrl, setNewAnswerImageUrl] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [useMathEditor, setUseMathEditor] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const hasAnimatedRef = useRef(false)
  
  const { data: question, isLoading: questionLoading, error: questionError } = useQAQuestion(id!)
  const { data: answers = [], isLoading: answersLoading, error: answersError } = useQAAnswers(id!)
  const createAnswerMutation = useCreateQAAnswer()
  const voteQuestionMutation = useVoteQAQuestion()
  const voteAnswerMutation = useVoteQAAnswer()
  const incrementViewsMutation = useIncrementQuestionViews()
  const acceptAnswerMutation = useAcceptAnswer()
  
  // Increment views when component mounts and question is loaded (session-based)
  useEffect(() => {
    if (id && question && !questionError) {
      // Only increment view count once per session
      const viewedKey = `qa_viewed_${id}`
      const hasViewedInSession = sessionStorage.getItem(viewedKey)
      
      if (!hasViewedInSession) {
        incrementViewsMutation.mutate(id)
        sessionStorage.setItem(viewedKey, 'true')
      }
    }
  }, [id, question, questionError])

  // Animation control - only animate once per session
  useEffect(() => {
    if (id && question && !questionError && !hasAnimatedRef.current) {
      const animatedKey = `qa_animated_${id}`
      const hasAnimatedInSession = sessionStorage.getItem(animatedKey)
      
      if (!hasAnimatedInSession) {
        setShouldAnimate(true)
        sessionStorage.setItem(animatedKey, 'true')
        hasAnimatedRef.current = true
      }
    }
  }, [id, question, questionError])

  const getDisplayName = (author: any) => {
    if (!author) return 'Anonim'
    if (author.is_private) return 'Abituriyent'
    return author.full_name || 'Abituriyent'
  }

  const handleCreateAnswer = async () => {
    if (!newAnswer.trim() || !id) return
    
    try {
      await createAnswerMutation.mutateAsync({
        content: newAnswer,
        question_id: id,
        image_url: newAnswerImageUrl || undefined,
      })
      setNewAnswer('')
      setNewAnswerImageUrl('')
    } catch (error) {
      // Error handled in mutation
    }
  }

  const handleCreateReply = async (parentAnswerId: string) => {
    if (!replyContent.trim() || !id) return
    
    try {
      await createAnswerMutation.mutateAsync({
        content: replyContent,
        question_id: id,
        parent_answer_id: parentAnswerId,
        image_url: replyImageUrl || undefined,
      })
      setReplyContent('')
      setReplyImageUrl('')
      setReplyTo(null)
    } catch (error) {
      // Error handled in mutation
    }
  }

  const handleVote = (voteType: 1 | -1, questionId?: string, answerId?: string) => {
    if (!user) {
      toast.error('Səs vermək üçün giriş edin')
      return
    }
    
    if (questionId) {
      voteQuestionMutation.mutate({
        questionId,
        voteType: voteType === 1 ? 'up' : 'down'
      })
    } else if (answerId && id) {
      voteAnswerMutation.mutate({
        answerId,
        questionId: id,
        voteType: voteType === 1 ? 'up' : 'down'
      })
    }
  }

  const handleAcceptAnswer = (answerId: string) => {
    if (!user || !question || question.author_id !== user.id) {
      toast.error('Yalnız sualın müəllifi cavabı qəbul edə bilər')
      return
    }
    
    acceptAnswerMutation.mutate({
      questionId: id!,
      answerId,
    })
  }

  if (questionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Sual yüklənir...</p>
        </div>
      </div>
    )
  }

  if (questionError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Xəta baş verdi</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Sual yüklənərkən xəta baş verdi. Lütfən yenidən cəhd edin.
            </p>
            <Link to="/qa">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sual-Cavaba qayıt
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Sual tapılmadı</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Axtarılan sual mövcud deyil vəya silinib.
            </p>
            <Link to="/qa">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sual-Cavaba qayıt
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mobile-qa-container space-y-6">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/qa" 
          className="inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sual-Cavaba qayıt
        </Link>
      </motion.div>

      {/* Question */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { duration: 0.6, delay: 0.1 } : { duration: 0 }}
      >
        <QuestionCard 
          question={question} 
          onVote={handleVote}
          getDisplayName={getDisplayName}
          currentUser={user}
          isAdmin={isAdmin}
        />
      </motion.div>

      {/* Answers */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { duration: 0.6, delay: 0.2 } : { duration: 0 }}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Cavablar ({answers.length})
          </h2>
          
          {answersLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-lg" />
              ))}
            </div>
          ) : answers.length > 0 ? (
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <motion.div
                  key={answer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <AnswerCard
                    answer={answer}
                    onVote={handleVote}
                    onReply={setReplyTo}
                    onAccept={handleAcceptAnswer}
                    getDisplayName={getDisplayName}
                    currentUser={user}
                    isQuestionAuthor={question.author_id === user?.id}
                    isAdmin={isAdmin}
                    replyTo={replyTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    replyImageUrl={replyImageUrl}
                    setReplyImageUrl={setReplyImageUrl}
                    onCreateReply={handleCreateReply}
                    createAnswerMutation={createAnswerMutation}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                Hələ ki cavab yoxdur. İlk cavabı siz verin!
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Answer Form */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="qa-answer-form">
            <CardHeader>
              <CardTitle className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:items-center md:justify-between">
                <span>Cavabınızı yazın</span>
                <div className="flex items-center flex-wrap gap-2">
                  <Calculator className="h-4 w-4" />
                  <Label htmlFor="answer-math-toggle" className="text-sm font-normal">Riyazi düstur</Label>
                  <Switch 
                    id="answer-math-toggle"
                    checked={useMathEditor}
                    onCheckedChange={setUseMathEditor}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {useMathEditor ? (
                <div className="space-y-2">
                  <MathInput
                    value={newAnswer}
                    onChange={setNewAnswer}
                    placeholder="LaTeX syntax istifadə edərək cavabınızı yazın (məs: \frac{1}{2}, x^2, \sqrt{x})"
                    label=""
                    className="w-full"
                  />
                  {newAnswer && (
                    <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Önizləmə:</p>
                      <MathRenderer>{newAnswer}</MathRenderer>
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  placeholder="Cavabınızı buraya yazın..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={6}
                  className="w-full min-h-[150px] mobile-form-input"
                />
              )}
              
              {/* Answer Image Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Şəkil əlavə et (isteğe bağlı)</span>
                </Label>
                <div className="w-full overflow-hidden">
                  <ImageUploadCrop
                    onImageUploaded={setNewAnswerImageUrl}
                    onImageRemoved={() => setNewAnswerImageUrl('')}
                    existingImageUrl={newAnswerImageUrl}
                    maxSizeInMB={5}
                    aspectRatio={4 / 3}
                    cropWidth={600}
                    cropHeight={450}
                    allowCrop={true}
                    bucketName="qa-images"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleCreateAnswer}
                  disabled={!newAnswer.trim() || createAnswerMutation.isPending}
                  className="touch-target w-full sm:w-auto"
                >
                  {createAnswerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Göndərilir...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Cavabı göndər
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// Question Card Component
function QuestionCard({ question, onVote, getDisplayName, currentUser, isAdmin }: any) {
  const { data: userVote } = useUserVote('question', question.id)
  
  return (
    <Card className={cn(
      'qa-question-card',
      question.is_answered ? 'border-green-200 dark:border-green-800' : ''
    )}>
      <CardContent className="mobile-card-content">
        <div className="qa-question-content">
          {/* Vote buttons */}
          <div className="qa-vote-sidebar">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(1, question.id, undefined)}
              className={`touch-target ${userVote === 1 ? 'text-green-600 bg-green-50 dark:bg-green-900' : 'text-slate-500'}`}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
            <span className="font-bold text-responsive-lg text-slate-900 dark:text-white text-center">
              {question.votes_score}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(-1, question.id, undefined)}
              className={`touch-target ${userVote === -1 ? 'text-red-600 bg-red-50 dark:bg-red-900' : 'text-slate-500'}`}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
            {question.is_answered && (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
          </div>
          
          {/* Question content */}
          <div className="qa-question-body">
            <h1 className="typography-h2 text-slate-900 dark:text-white mb-4 text-break">
              <AutoLangText text={question.title} tag="span" />
            </h1>
            
            <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
              <div className="mobile-qa-content">
                <AutoLangText text={question.content} tag="p" className="whitespace-pre-wrap text-break" />
              </div>
            </div>
            
            {/* Question Image */}
            {question.image_url && (
              <div className="mb-6">
                <div className="relative group max-w-full overflow-hidden rounded-lg">
                  <img
                    src={question.image_url}
                    alt="Question image"
                    className="w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl h-auto rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer object-contain"
                    style={{ maxHeight: '400px', width: 'auto', maxWidth: '100%' }}
                    onClick={() => window.open(question.image_url, '_blank')}
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors pointer-events-none" />
                </div>
              </div>
            )}
            
            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {question.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Question meta */}
            <div className="text-sm text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="mobile-qa-stats">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{getDisplayName(question.author)}</span>
                  {question.author && (['admin', 'super_admin'].includes(question.author.role)) && (
                    <RoleBadge 
                      role={question.author.role} 
                      isSuperAdmin={question.author.role === 'super_admin'}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(question.created_at)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{question.views} baxış</span>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {question.category && (
                  <Badge variant="outline">{question.category}</Badge>
                )}
                {isAdmin && (
                  <AdminDeleteButton
                    itemType="qa_question"
                    itemId={question.id}
                    itemName={question.title}
                    onDeleted={() => window.location.href = '/qa'}
                    size="sm"
                    variant="icon"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Answer Card Component
function AnswerCard({ 
  answer, 
  onVote, 
  onReply, 
  onAccept, 
  getDisplayName, 
  currentUser, 
  isQuestionAuthor,
  isAdmin,
  replyTo,
  replyContent,
  setReplyContent,
  replyImageUrl,
  setReplyImageUrl,
  onCreateReply,
  createAnswerMutation
}: any) {
  const { data: userVote } = useUserVote('answer', answer.id)
  
  return (
    <Card className={answer.is_accepted ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : ''}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(1, undefined, answer.id)}
              className={`p-1 ${userVote === 1 ? 'text-green-600 bg-green-50 dark:bg-green-900' : 'text-slate-500'}`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span className="font-medium text-slate-900 dark:text-white">
              {answer.votes_score}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(-1, undefined, answer.id)}
              className={`p-1 ${userVote === -1 ? 'text-red-600 bg-red-50 dark:bg-red-900' : 'text-slate-500'}`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            {answer.is_accepted && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
          </div>
          
          {/* Answer content */}
          <div className="flex-1">
            <div className="prose prose-slate dark:prose-invert max-w-none mb-4">
              <AutoLangText text={answer.content} tag="p" />
            </div>
            
            {/* Answer Image */}
            {answer.image_url && (
              <div className="mb-4">
                <div className="relative group w-full max-w-full overflow-hidden rounded-lg">
                  <img
                    src={answer.image_url}
                    alt="Answer image"
                    className="block w-full max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer object-contain max-h-80"
                    onClick={() => window.open(answer.image_url, '_blank')}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors pointer-events-none" />
                </div>
              </div>
            )}
            
            {/* Answer actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-4">
                {currentUser && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onReply(answer.id)}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    Cavabla
                  </Button>
                )}
                {isQuestionAuthor && !answer.is_accepted && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onAccept(answer.id)}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Qəbul et
                  </Button>
                )}
                {/* Admin Delete Button */}
                {isAdmin && (
                  <AdminDeleteButton
                    itemType="qa_answer"
                    itemId={answer.id}
                    itemName={`Answer by ${getDisplayName(answer.author)}`}
                    size="sm"
                    variant="icon"
                    className="ml-2"
                    onDeleted={() => {
                      // Refresh answers will happen automatically via query invalidation
                      console.log('Answer deleted successfully')
                    }}
                  />
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span>{getDisplayName(answer.author)}</span>
                {answer.author && (['admin', 'super_admin'].includes(answer.author.role)) && (
                  <RoleBadge 
                    role={answer.author.role} 
                    isSuperAdmin={answer.author.role === 'super_admin'}
                    size="sm"
                  />
                )}
                <span>•</span>
                <span>{formatDate(answer.created_at)}</span>
              </div>
            </div>
            
            {/* Reply form */}
            {replyTo === answer.id && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                <Textarea
                  placeholder="Cavabınızı yazın..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                />
                
                {/* Reply Image Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Şəkil əlavə et (isteğe bağlı)</span>
                  </Label>
                  <ImageUploadCrop
                    onImageUploaded={setReplyImageUrl}
                    onImageRemoved={() => setReplyImageUrl('')}
                    existingImageUrl={replyImageUrl}
                    maxSizeInMB={3}
                    aspectRatio={4 / 3}
                    cropWidth={400}
                    cropHeight={300}
                    allowCrop={true}
                    bucketName="qa-images"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    onClick={() => onCreateReply(answer.id)}
                    disabled={!replyContent.trim() || createAnswerMutation.isPending}
                  >
                    {createAnswerMutation.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Göndər
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      onReply(null)
                      setReplyImageUrl('')
                    }}
                  >
                    Ləğv et
                  </Button>
                </div>
              </div>
            )}
            
            {/* Nested replies */}
            {answer.replies && answer.replies.length > 0 && (
              <div className="mt-4 space-y-3">
                {answer.replies.map((reply: QAAnswer) => (
                  <div key={reply.id} className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none mb-2">
                      <AutoLangText text={reply.content} tag="p" />
                    </div>
                    
                    {/* Reply Image */}
                    {reply.image_url && (
                      <div className="mb-3">
                        <div className="relative group w-full max-w-full overflow-hidden rounded-lg">
                          <img
                            src={reply.image_url}
                            alt="Reply image"
                            className="block w-full max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer object-contain max-h-64"
                            onClick={() => window.open(reply.image_url, '_blank')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors pointer-events-none" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <span>{getDisplayName(reply.author)}</span>
                        {reply.author && (['admin', 'super_admin'].includes(reply.author.role)) && (
                          <RoleBadge 
                            role={reply.author.role} 
                            isSuperAdmin={reply.author.role === 'super_admin'}
                            size="sm"
                          />
                        )}
                        <span>•</span>
                        <span>{formatDate(reply.created_at)}</span>
                      </div>
                      {/* Admin Delete Button for Reply */}
                      {isAdmin && (
                        <AdminDeleteButton
                          itemType="qa_answer"
                          itemId={reply.id}
                          itemName={`Reply by ${getDisplayName(reply.author)}`}
                          size="sm"
                          variant="icon"
                          className="text-red-500 hover:text-red-600"
                          onDeleted={() => {
                            // Query invalidation will refresh the data automatically
                            console.log('Reply deleted successfully')
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
