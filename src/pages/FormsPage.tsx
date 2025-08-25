import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForms } from '@/hooks/useForms'
import { useFormCategories } from '@/hooks/useCategories'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { motion } from 'framer-motion'
import { 
  Search,
  Plus,
  Eye,
  MessageSquare,
  User,
  Calendar,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatDate } from '@/lib/utils'

export default function FormPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'submissions'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const formsPerPage = 10
  
  const { data: forms = [], isLoading, error } = useForms(
    categoryFilter === 'all' ? {} : { category: categoryFilter }
  )
  const { data: categories = [] } = useFormCategories()

  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredForms.length / formsPerPage)
  const startIndex = (currentPage - 1) * formsPerPage
  const endIndex = startIndex + formsPerPage
  const currentForms = filteredForms.slice(startIndex, endIndex)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <PageWrapper
      title="Forms"
      description="Create and fill out forms to collect and share information"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mobile-form-container"
      >
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="typography-h1 text-slate-900 dark:text-white">
              Forms
            </h1>
            <p className="mt-2 typography-body text-slate-600 dark:text-slate-400">
              Create and fill out forms to collect and share information
            </p>
          </div>
          <Link to="/forms/create" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto touch-target bg-gradient-to-r from-[#6F56D9] to-[#6750A4] hover:from-[#7A61E6] hover:to-[#6F56D9] text-white shadow-[0_6px_20px_-5px_rgba(103,80,164,0.5)]">
              <Plus className="h-4 w-4 mr-2" />
              <span>Create Form</span>
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
                  placeholder="Search forms..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 mobile-form-input text-break"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-48 mobile-form-input">
                  <SelectValue placeholder="Category" />
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
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="mobile-dropdown">
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="submissions">Most Submissions</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="space-x-2 h-10 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Filter className="h-4 w-4" />
                <span>Filtri təmizlə</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forms List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="mobile-card">
                <CardContent className="mobile-card-content">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                    <div className="flex space-x-4">
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                      <div className="h-3 bg-slate-200 rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Failed to load forms</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We couldn't load the forms. Please check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredForms.length > 0 ? (
          <>
            <div className="space-y-4">
              {currentForms.map((form, index) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="card-hover mobile-card">
                    <CardContent className="mobile-card-content">
                      <div className="flex flex-col sm:flex-row items-start sm:items-start gap-3 sm:gap-4 p-3 sm:p-4">
                        {/* Form Icon */}
                        <div className="flex-shrink-0 mb-2 sm:mb-0">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        {/* Form Content */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="mb-3">
                            <Link 
                              to={`/form/${form.id}`}
                              className="font-semibold typography-h3 text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2 text-break block"
                            >
                              {form.title}
                            </Link>
                          </div>
                          {form.description && (
                            <p className="typography-body text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 mobile-qa-content">
                              {form.description.length > 150
                                ? <>
                                    {form.description.substring(0, 150)}...
                                    <Link to={`/form/${form.id}`} className="text-primary-600 hover:underline ml-1">Devamına bax</Link>
                                  </>
                                : form.description
                              }
                            </p>
                          )}
                          {/* Form Meta & Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                            <div className="mobile-qa-stats typography-small text-slate-500 flex flex-row flex-wrap gap-x-4 gap-y-1 mb-2">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span className="text-break font-medium">
                                  {getDisplayName(form.creator)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span className="whitespace-nowrap">
                                  {formatDate(form.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-4 w-4" />
                                <span>{form.view_count || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Send className="h-4 w-4" />
                                <span>{form.submission_count || 0} submissions</span>
                              </div>
                              {form.category_name && (
                                <Badge variant="outline" className="typography-small text-xs">
                                  {form.category_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <Badge variant={form.is_public ? "default" : "secondary"} className="w-max">
                                {form.is_public ? "Public" : "Private"}
                              </Badge>
                              <Link to={`/form/${form.id}`} className="w-full sm:w-auto">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  Bax
                                </Button>
                              </Link>
                              {isAdmin && (
                                <div className="w-full sm:w-auto">
                                  <AdminDeleteButton
                                    itemType="form"
                                    itemId={form.id}
                                    itemName={form.title}
                                    size="sm"
                                    variant="icon"
                                    className="w-full sm:w-auto"
                                  />
                                </div>
                              )}
                            </div>
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
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                  {totalPages > 5 && (
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
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title="No forms found"
            description={searchTerm || categoryFilter !== 'all' 
              ? 'No forms match your search criteria. Try adjusting your filters.'
              : 'No forms available yet. Create the first form to get started!'}
            action={user ? {
              label: 'Create Form',
              onClick: () => window.location.href = '/forms/create',
              icon: Plus
            } : {
              label: 'Login',
              onClick: () => window.location.href = '/login',
              icon: User
            }}
          />
        )}
      </motion.div>
    </PageWrapper>
  )
}