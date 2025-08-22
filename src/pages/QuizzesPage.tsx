import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useQuizCreatePermission } from '@/hooks/useQuizCreatePermission'
import { useQuizzes } from '@/hooks/useQuiz'
import { CategorySelect } from '@/components/admin/CategorySelect'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QuizCardSkeleton } from '@/components/ui/Skeleton'
import { QueryErrorFallback } from '@/components/ui/ErrorBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ShareQuizModal } from '@/components/ShareQuizModal'
import { motion } from 'framer-motion'
import { Search, Filter, Plus, BookOpen, Clock, Users, Star, Share2 } from 'lucide-react'
import { formatDate, getDifficultyColor } from '@/lib/utils'

export default function QuizzesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { checkPermissionAndNavigate } = useQuizCreatePermission()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'difficulty'>('recent')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null)
  

  
  const { data: quizzes = [], isLoading, error } = useQuizzes({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
    isPublic: true
  })

  // Apply search filtering and sorting
  const filteredQuizzes = quizzes
    .filter(quiz => 
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.attempts_count || 0) - (a.attempts_count || 0)
        case 'difficulty': {
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        }
        default: // recent
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Debug logging
  console.log('QuizzesPage Debug:', { 
    quizzes, 
    filteredQuizzes, 
    isLoading, 
    error,
    categoryFilter,
    difficultyFilter,
    searchTerm 
  })

  const difficulties = [
    { value: 'easy', label: 'Asan' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Çətin' }
  ]
  
  const sortOptions = [
    { value: 'recent', label: 'Ən yeni' },
    { value: 'popular', label: 'Ən populyar' },
    { value: 'difficulty', label: 'Çətinlik əsasında' }
  ]

  const handleShareQuiz = (quiz: any) => {
    setSelectedQuiz(quiz)
    setShareModalOpen(true)
  }

  const handleCloseShareModal = () => {
    setShareModalOpen(false)
    setSelectedQuiz(null)
  }

  return (
    <PageWrapper
      title="Quizlər"
      description="Mövcud quizləri araşdırın və biliklərinizi sınayın"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Quizlər
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Mövcud quizləri araşdırın və biliklərinizi sınayın
            </p>
          </div>
          {(user?.role === 'teacher' || user?.role === 'admin' || user?.can_create_quiz) && (
            <Button onClick={checkPermissionAndNavigate} size="lg" className="space-x-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span>Yeni Quiz</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Quizləri axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <CategorySelect
                type="quiz"
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value === 'all' ? 'all' : value || 'all')}
                placeholder={t('common.allCategories')}
                className="w-full sm:w-48"
              />
              
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Çətinlik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün səviyyələr</SelectItem>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                className="space-x-2"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                  setDifficultyFilter('all')
                  setSortBy('recent')
                }}
              >
                <Filter className="h-4 w-4" />
                <span>Filtri təmizlə</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quiz Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <QueryErrorFallback 
            error={error as Error}
            title="Failed to load quizzes"
            description="We couldn't load the quizzes. Please check your connection and try again."
          />
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz, index) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full card-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-3">
                          {quiz.description || 'Açıqlama yoxdur'}
                        </CardDescription>
                      </div>
                      {quiz.category && (
                        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full ml-2">
                          {quiz.category}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Quiz Stats */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {quiz.questions?.length || 0} sual
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {quiz.time_limit ? `${quiz.time_limit}dəq` : 'Sərbəst'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {quiz.attempts_count || 0}
                          </span>
                        </div>
                      </div>
                      
                      {/* Difficulty & Rating */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
                          {quiz.difficulty === 'easy' ? 'Asan' : 
                           quiz.difficulty === 'medium' ? 'Orta' : 'Çətin'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            4.5
                          </span>
                        </div>
                      </div>
                      
                      {/* Created Date */}
                      <p className="text-xs text-slate-500">
                        {formatDate(quiz.created_at)} tarixində yaradılıb
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link to={`/quizzes/${quiz.id}`} className="flex-1">
                          <Button className="w-full">
                            Quizi başla
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareQuiz(quiz)}
                          className="px-3"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {(user?.role === 'admin' || user?.id === quiz.creator_id) && (
                          <Link to={`/quizzes/${quiz.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Redaktə et
                            </Button>
                          </Link>
                        )}
                        {isAdmin && (
                          <AdminDeleteButton
                            itemType="quiz"
                            itemId={quiz.id}
                            itemName={quiz.title}
                            size="sm"
                            variant="icon"
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Quiz tapılmadı"
            description="Axtarış şərtlərinizə uyğun quiz mövcud deyil. Filtrləri dəyişdirməyi və ya yeni quiz yaratmagı sınayın."
            action={(user?.role === 'teacher' || user?.role === 'admin' || user?.can_create_quiz) ? {
              label: 'Yeni Quiz Yarat',
              onClick: checkPermissionAndNavigate,
              icon: Plus
            } : undefined}
          />
        )}
      </motion.div>
      
      {/* Share Quiz Modal */}
      {selectedQuiz && (
        <ShareQuizModal
          isOpen={shareModalOpen}
          onClose={handleCloseShareModal}
          quiz={selectedQuiz}
        />
      )}
    </PageWrapper>
  )
}