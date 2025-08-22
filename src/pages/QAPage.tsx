import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useQAQuestions } from '@/hooks/useQA'
import { useCategories } from '@/components/admin/CategorySelect'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { UserDisplay } from '@/components/ui/RoleBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { QAPostSkeleton } from '@/components/ui/Skeleton'
import { QueryErrorFallback } from '@/components/ui/ErrorBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { motion } from 'framer-motion'
import { Search, Plus, MessageSquare, Eye, ArrowUp, ArrowDown, CheckCircle, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function QAPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'votes' | 'unanswered'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const questionsPerPage = 10
  
  const { data: questions = [], isLoading, error } = useQAQuestions(
    categoryFilter === 'all' ? undefined : categoryFilter,
    sortBy
  )

  const filteredQuestions = questions.filter(question => 
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (question.tags && question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  )
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage)
  const startIndex = (currentPage - 1) * questionsPerPage
  const endIndex = startIndex + questionsPerPage
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex)
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }
  
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }
  
  const handleSortChange = (value: 'recent' | 'votes' | 'unanswered') => {
    setSortBy(value)
    setCurrentPage(1)
  }

  // Get categories using the new hook
  const { data: categories = [] } = useCategories('qa')

  const getDisplayName = (author: any) => {
    if (!author) return 'Anonim'
    if (author.is_private && !isAdmin) return 'Abituriyent'
    return author.full_name || 'Abituriyent'
  }

  return (
    <PageWrapper
      title="Sual-Cavab"
      description="Suallarınızı soruşun, cavablar tapın və bilik paylaşın"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mobile-qa-container"
      >
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="typography-h1 text-slate-900 dark:text-white">
              Sual-Cavab
            </h1>
            <p className="mt-2 typography-body text-slate-600 dark:text-slate-400">
              Suallarınızı soruşun, cavablar tapın və bilik paylaşın
            </p>
          </div>
          <Link to="/qa/create" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto space-x-2 touch-target">
              <Plus className="h-4 w-4" />
              <span>Sual ver</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="mobile-card">
          <CardContent className="mobile-card-content">
            <div className="mobile-qa-filters">
              <div className="relative mobile-qa-search">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Sualları axtarın..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 mobile-form-input text-break"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-48 mobile-form-input">
                  <SelectValue placeholder="Kateqoriya" />
                </SelectTrigger>
                <SelectContent className="mobile-dropdown">
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => handleSortChange(value)}>
                <SelectTrigger className="w-full sm:w-40 mobile-form-input">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="mobile-dropdown">
                  <SelectItem value="recent">Ən yeni</SelectItem>
                  <SelectItem value="votes">Ən çox səs</SelectItem>
                  <SelectItem value="unanswered">Cavabsız</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Questions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <QAPostSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <QueryErrorFallback 
            error={error as Error}
            title="Failed to load questions"
            description="We couldn't load the questions. Please check your connection and try again."
          />
        ) : filteredQuestions.length > 0 ? (
          <>
            <div className="space-y-4">
              {currentQuestions.map((question, index) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="card-hover mobile-card qa-question-card">
                    <CardContent className="mobile-card-content">
                      <div className="qa-question-content">
                        {/* Vote Score & Stats */}
                        <div className="qa-vote-sidebar">
                          <div className="flex items-center space-x-2 md:flex-col md:space-x-0 md:space-y-2">
                            <div className="flex items-center space-x-1 md:flex-col md:space-x-0 typography-small">
                              <ArrowUp className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-slate-900 dark:text-white text-sm">
                                {question.votes_score}
                              </span>
                              <ArrowDown className="h-4 w-4 text-red-600" />
                            </div>
                            
                            {question.is_answered && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs text-slate-500 md:mt-2">
                            <Eye className="h-3 w-3" />
                            <span>{question.views}</span>
                          </div>
                        </div>
                        
                        {/* Question Content */}
                        <div className="qa-question-body">
                          <div className="mb-3">
                            <Link 
                              to={`/qa/${question.id}`}
                              className="font-semibold typography-h3 text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2 text-break block"
                            >
                              {question.title}
                            </Link>
                          </div>
                          
                          <p className="typography-body text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 mobile-qa-content">
                            {question.content.substring(0, 200)}...
                          </p>
                          
                          {/* Question Image */}
                          {question.image_url && (
                            <div className="mb-4">
                              <img 
                                src={question.image_url} 
                                alt="Question image" 
                                className="w-full max-w-full sm:max-w-sm h-auto rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors object-cover"
                                style={{ maxHeight: '250px' }}
                                onClick={() => window.open(question.image_url, '_blank')}
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                          
                          {/* Tags */}
                          {question.tags && question.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 md:gap-2 mb-4">
                              {question.tags.slice(0, 3).map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="secondary" className="typography-small text-break text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {question.tags.length > 3 && (
                                <Badge variant="outline" className="typography-small text-xs">
                                  +{question.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Meta info */}
                          <div className="flex items-center justify-between">
                            <div className="mobile-qa-stats typography-small text-slate-500">
                              <UserDisplay 
                                user={question.author} 
                                showRole={true}
                                currentUserIsAdmin={isAdmin}
                                className="text-break font-medium"
                              />
                              <span className="whitespace-nowrap">
                                {formatDate(question.created_at)}
                              </span>
                              {question.category && (
                                <Badge variant="outline" className="typography-small text-xs">
                                  {question.category}
                                </Badge>
                              )}
                            </div>
                            {isAdmin && (
                              <AdminDeleteButton
                                itemType="qa_question"
                                itemId={question.id}
                                itemName={question.title}
                                size="sm"
                                variant="icon"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-1 md:space-x-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 touch-target"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Əvvəlki</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="min-w-[40px] touch-target"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  
                  {totalPages > 3 && (
                    <>
                      <span className="text-slate-500 typography-small">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="min-w-[40px] touch-target"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1 touch-target"
                >
                  <span className="hidden sm:inline">Növbəti</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Sual tapılmadı"
            description={searchTerm || categoryFilter !== 'all' 
              ? 'Axtarış meyarlarınıza uyğun sual yoxdur. Filtrləri dəyişdirməyi sınayın.'
              : 'Hələ ki sual yoxdur. İlk sualı sən ver və icmanın böyüməsinə kömək et!'}
            action={user ? {
              label: 'Sual ver',
              onClick: () => window.location.href = '/qa/create',
              icon: Plus
            } : {
              label: 'Giriş et',
              onClick: () => window.location.href = '/login',
              icon: MessageSquare
            }}
          />
        )}
      </motion.div>
      

    </PageWrapper>
  )
}
