import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForms } from '@/hooks/useForms'
import { useFormCategories } from '@/hooks/useCategories'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { FormLikeButton } from '@/components/ui/FormLikeButton'
import { motion } from 'framer-motion'
import { 
  Search,
  Plus,
  Eye, 
  Send, 
  User, 
  Calendar, 
  Clock,
  FileText,
  Heart,
  TrendingUp,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatDate } from '@/lib/utils'

export default function FormPage() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'submissions'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const formsPerPage = 12
  
  const { data: forms = [], isLoading, error, refetch } = useForms(
    categoryFilter === 'all' ? {} : { category: categoryFilter }
  )
  const { data: categories = [] } = useFormCategories()

  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Sort forms based on selected criteria
  const sortedForms = [...filteredForms].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return (b.view_count || 0) - (a.view_count || 0)
      case 'submissions':
        return (b.submission_count || 0) - (a.submission_count || 0)
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedForms.length / formsPerPage)
  const startIndex = (currentPage - 1) * formsPerPage
  const endIndex = startIndex + formsPerPage
  const currentForms = sortedForms.slice(startIndex, endIndex)

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
  
  const handleSortChange = (value: 'recent' | 'popular' | 'submissions') => {
    setSortBy(value)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setSortBy('recent')
    setCurrentPage(1)
  }

  const getDisplayName = (creator: any) => {
    if (!creator) return 'Anonymous'
    if (creator.is_private && !isAdmin) return 'User'
    return creator.full_name || 'Anonymous'
  }

  const retryLoad = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <PageWrapper title={t('nav.forms')} description={t('forms.formDescription') || 'Create and share information with forms'}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={t('nav.forms')}
      description={t('forms.formDescription') || 'Create and share information with forms'}
    >
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-8 mb-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('/api/placeholder/800/400')] opacity-5 bg-cover bg-center" />
        <div className="relative z-10">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {t('nav.forms')}
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
                {t('forms.formDescription') || 'Create and share information with forms'}
              </p>
              <div className="flex items-center space-x-4 mt-4 text-sm text-slate-500">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{forms.length} {t('nav.forms').toLowerCase()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{forms.reduce((acc, form) => acc + (form.view_count || 0), 0)} {t('common.views')}</span>
                </div>
              </div>
            </div>
            <Link to="/forms/create" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                <Plus className="h-5 w-5" />
                <span>{t('forms.createForm')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder={`${t('common.search')} ${t('nav.forms').toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 h-12 text-lg border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                />
              </div>
              
              {/* Filter Controls */}
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full sm:w-64 h-10 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder={t('quiz.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allCategories') || 'All Categories'}</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: any) => handleSortChange(value)}>
                  <SelectTrigger className="w-full sm:w-48 h-10 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t('common.mostRecent') || 'Most Recent'}</SelectItem>
                    <SelectItem value="popular">{t('common.mostPopular') || 'Most Popular'}</SelectItem>
                    <SelectItem value="submissions">{t('forms.mostSubmissions') || 'Most Submissions'}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="space-x-2 h-10 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Filter className="h-4 w-4" />
                  <span>{t('common.filter')}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forms Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">Failed to load forms</h3>
              <p className="text-red-600 dark:text-red-400 mb-4">
                We couldn't load the forms. Please check your connection and try again.
              </p>
              <Button onClick={retryLoad} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                Retry
              </Button>
            </div>
          </div>
        ) : sortedForms.length > 0 ? (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600 dark:text-slate-400">
                Showing <span className="font-semibold">{currentForms.length}</span> of <span className="font-semibold">{sortedForms.length}</span> forms
              </p>
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
            
            {/* Enhanced Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentForms.map((form, index) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <Card className="h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-md hover:shadow-2xl group-hover:shadow-blue-500/25 rounded-xl overflow-hidden">
                    {/* Card Header with Gradient */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5" />
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow duration-300">
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <Badge 
                              variant={form.is_public ? "default" : "secondary"}
                              className={`text-xs font-medium ${
                                form.is_public 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {form.is_public ? t('quiz.public') : t('quiz.private')}
                            </Badge>
                            {isAdmin && (
                              <AdminDeleteButton
                                itemType="form"
                                itemId={form.id}
                                itemName={form.title}
                                size="sm"
                                variant="icon"
                              />
                            )}
                          </div>
                        </div>
                        
                        <CardTitle className="text-lg leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          <Link 
                            to={`/forms/${form.id}`}
                            className="hover:underline line-clamp-2"
                          >
                            {form.title}
                          </Link>
                        </CardTitle>
                        
                        {form.description && (
                          <CardDescription className="text-sm line-clamp-2 text-slate-600 dark:text-slate-400">
                            {form.description.length > 80 
                              ? `${form.description.substring(0, 80)}...` 
                              : form.description
                            }
                          </CardDescription>
                        )}
                      </CardHeader>
                    </div>
                    
                    <CardContent className="pt-0">
                      {/* Enhanced Form Stats */}
                      <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">{form.view_count || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                            <Send className="h-4 w-4" />
                            <span className="font-medium">{form.submission_count || 0}</span>
                          </div>
                        </div>
                        <FormLikeButton
                          formId={form.id}
                          variant="compact"
                          showViewCount={false}
                          className="text-sm"
                        />
                      </div>
                      
                      {/* Form Meta Information */}
                      <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-3 w-3" />
                          <span className="truncate font-medium">{getDisplayName(form.creator)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}</span>
                        </div>
                        {form.category_name && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {form.category_name}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced Action Button with Localized "Bax" */}
                      <div className="mt-4">
                        <Link to={`/forms/${form.id}`} className="block w-full">
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 group-hover:scale-105"
                            size="sm"
                            onClick={(e) => {
                              // Ensure navigation works properly
                              e.stopPropagation()
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view')}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex items-center justify-center space-x-2 mt-12"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.previous')}</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-[40px] h-10 rounded-lg ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="hidden sm:inline">{t('common.next')}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <EmptyState
              icon={FileText}
              title={t('forms.noFormsTitle') || 'No forms found'}
              description={searchTerm || categoryFilter !== 'all' 
                ? t('forms.noFormsFiltered') || 'No forms match your search criteria. Try adjusting your filters.'
                : t('forms.noFormsEmpty') || 'No forms available yet. Create the first form to get started!'}
              action={user ? {
                label: t('forms.createForm'),
                onClick: () => window.location.href = '/forms/create',
                icon: Plus
              } : {
                label: t('auth.login'),
                onClick: () => window.location.href = '/login',
                icon: User
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  )
}
