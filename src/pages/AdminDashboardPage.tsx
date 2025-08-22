import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  useAdminStats,
  useAllUsers,
  useUpdateUserRole,
  useQuizCategories,
  useCreateCategory,
  useDeleteCategory,
  useGrantQuizPermission,
  useDeleteUser
} from '@/hooks/useAdmin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Shield,
  Settings,
  Plus,
  Trash2,
  Edit,
  UserPlus,
  Crown,
  Activity,
  Calendar,
  Mail,
  Loader2,
  X,
  Check,
  AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface NewCategoryForm {
  name: string
  description: string
  color: string
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: users, isLoading: usersLoading, error: usersError } = useAllUsers()
 
  const { data: quizCategories, isLoading: quizCategoriesLoading } = useQuizCategories()
  
  // Form categories hook (using direct query since hook may not exist)
  const { data: formCategories, isLoading: formCategoriesLoading } = useQuery({
    queryKey: ['form-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    }
  })
  
  const updateUserRoleMutation = useUpdateUserRole()
  const createCategoryMutation = useCreateCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const grantQuizPermissionMutation = useGrantQuizPermission()
  const deleteUserMutation = useDeleteUser()

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'categories'>('overview')
  const [categoryType, setCategoryType] = useState<'quiz' | 'form'>('quiz')
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newCategory, setNewCategory] = useState<NewCategoryForm>({
    name: '',
    description: '',
    color: 'blue'
  })
  
  const categories = categoryType === 'quiz' ? quizCategories : formCategories
  const categoriesLoading = categoryType === 'quiz' ? quizCategoriesLoading : formCategoriesLoading

  // Admin access check
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Giriş İcazəsi Yoxdur</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Admin panel üçün administrator yetkisi lazımdır.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Kateqoriya adı tələb olunur')
      return
    }

    try {
      if (categoryType === 'quiz') {
        await createCategoryMutation.mutateAsync(newCategory)
      } else {
        // Create form category directly
        const { error } = await supabase
          .from('form_categories')
          .insert([{
            name: newCategory.name,
            description: newCategory.description || null,
            color: newCategory.color
          }])
        
        if (error) throw error
        toast.success('Form kateqoriyası yaradıldı')
      }
      
      setNewCategory({ name: '', description: '', color: 'blue' })
      setShowCreateCategory(false)
      
      // Refetch categories
      if (categoryType === 'form') {
        queryClient.invalidateQueries({ queryKey: ['form-categories'] })
      }
    } catch (error) {
      console.error('Category creation error:', error)
      toast.error('Kateqoriya yaradılmadı')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Bu kateqoriyanı silmək istədiyinizə əminsiniz?')) {
      try {
        if (categoryType === 'quiz') {
          await deleteCategoryMutation.mutateAsync(categoryId)
        } else {
          // Delete form category directly
          const { error } = await supabase
            .from('form_categories')
            .delete()
            .eq('id', categoryId)
          
          if (error) throw error
          toast.success('Form kateqoriyası silindi')
          
          // Refetch categories
          queryClient.invalidateQueries({ queryKey: ['form-categories'] })
        }
      } catch (error) {
        console.error('Category deletion error:', error)
        toast.error('Kateqoriya silinmədi')
      }
    }
  }

  const handleUpdateUserRole = async (userId: string, role: string) => {
    await updateUserRoleMutation.mutateAsync({ userId, role })
  }

  const handleToggleQuizPermission = async (userId: string, currentPermission: boolean) => {
    await grantQuizPermissionMutation.mutateAsync({
      userId,
      canCreate: !currentPermission
    })
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Bu istifadəçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.')) {
      await deleteUserMutation.mutateAsync(userId)
    }
  }

  const getRoleColor = (role: string) => {
    const colorMap = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      teacher: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      student: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  const getRoleLabel = (role: string) => {
    const roleMap = {
      admin: 'Administrator',
      teacher: 'Müəllim',
      student: 'Tələbə'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const getCategoryColor = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-2 sm:mr-3" />
              {t('admin.panelTitle')}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t('admin.panelDesc')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="w-full sm:w-auto justify-start"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('admin.overview')}
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="w-full sm:w-auto justify-start"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('admin.users')}
          </Button>
          <Button
            variant={activeTab === 'categories' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('categories')}
            className="w-full sm:w-auto justify-start"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {t('admin.categories')}
          </Button>
        </div>
      </motion.div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('admin.totalUsers')}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : (users?.length || 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('admin.totalQuizzes')}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : stats?.totalQuizzes || 0}
                    </p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('admin.forumPosts')}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : stats?.totalForumPosts || 0}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('admin.activeUsers')}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : stats?.activeUsers || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>{t('admin.recentActivities')}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">{t('admin.loadingActivities')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {activity.users?.full_name || activity.users?.email}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {t('admin.activityParticipated', { quiz: activity.quizzes?.title })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                      <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                        {activity.status === 'completed' ? t('admin.completed') : t('admin.inProgress')}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-center text-slate-500 py-8">{t('admin.noRecentActivity')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>İstifadəçi İdarəetməsi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">İstifadəçilər yüklənir...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users?.map((userData) => {
                    const isSuperAdmin = userData.is_super_admin || (userData.email === 'user@squiz.com' && userData.role === 'admin')
                    const isCurrentUserSuperAdmin = user?.role === 'super_admin';
                    const canModifyUser = isCurrentUserSuperAdmin && userData.id !== user?.id;
                    
                    return (
                    <div key={userData.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg space-y-4 sm:space-y-0 ${
                      isSuperAdmin ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800' : 'bg-slate-50 dark:bg-slate-800'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSuperAdmin ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}>
                            {isSuperAdmin ? (
                              <Crown className="h-5 w-5 text-white" />
                            ) : (
                              <span className="text-sm font-bold text-white">
                                {userData.full_name?.charAt(0) || userData.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-slate-900 dark:text-white">
                                {userData.full_name || 'Ad təyin edilməyib'}
                              </h4>
                              {isSuperAdmin && (
                                <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 break-all">
                              {userData.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className={isSuperAdmin ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : getRoleColor(userData.role)}>
                            {isSuperAdmin ? 'Super Administrator' : getRoleLabel(userData.role)}
                          </Badge>
                          {userData.can_create_quiz && (
                            <Badge variant="outline" className="text-green-600">
                              Quiz Yarada Bilər
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                        {canModifyUser ? (
                          <>
                            <Select
                              value={userData.role}
                              onValueChange={(role) => handleUpdateUserRole(userData.id, role)}
                              disabled={isSuperAdmin && !isSuperAdmin}
                            >
                              <SelectTrigger className="w-full sm:w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Tələbə</SelectItem>
                                <SelectItem value="teacher">Müəllim</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin" disabled={user.role !== 'super_admin'}>Süper Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant={userData.can_create_quiz ? 'destructive' : 'default'}
                              onClick={() => handleToggleQuizPermission(userData.id, userData.can_create_quiz || false)}
                              className="w-full sm:w-auto"
                              disabled={isSuperAdmin && !isSuperAdmin}
                            >
                              {userData.can_create_quiz ? (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  İcazəni Ləğv et
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Quiz İcazəsi
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center text-sm text-slate-500 italic">
                            {isSuperAdmin ? 'Super Admin - Protected' : 'Cannot modify'}
                          </div>
                        )}
                        {canModifyUser && userData.id !== user?.id && !isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(userData.id)}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}) || (
                    <p className="text-center text-slate-500 py-8">İstifadəçi tapılmadı</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Kateqoriya İdarəetməsi</span>
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={categoryType} onValueChange={(value: 'quiz' | 'form') => setCategoryType(value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz Kateqoriyaları</SelectItem>
                      <SelectItem value="form">Form Kateqoriyaları</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowCreateCategory(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Kateqoriya
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">Kateqoriyalar yüklənir...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories?.map((category) => (
                    <div key={category.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">
                            {category.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {category.description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getCategoryColor(category.color)}>
                          {category.quiz_count} quiz
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(category.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Category Modal */}
          {showCreateCategory && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Yeni {categoryType === 'quiz' ? 'Quiz' : 'Form'} Kateqoriyası Yarat</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateCategory(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Kateqoriya Adı</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Kateqoriya adını daxil edin"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category-description">Açıqlama</Label>
                  <Textarea
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Kateqoriya açıqlamasını daxil edin"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category-color">Rəng</Label>
                  <Select
                    value={newCategory.color}
                    onValueChange={(color) => setNewCategory(prev => ({ ...prev, color }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Mavi</SelectItem>
                      <SelectItem value="green">Yaşıl</SelectItem>
                      <SelectItem value="yellow">Sarı</SelectItem>
                      <SelectItem value="purple">Bənövşəyi</SelectItem>
                      <SelectItem value="red">Qırmızı</SelectItem>
                      <SelectItem value="indigo">İndiqo</SelectItem>
                      <SelectItem value="gray">Boz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateCategory(false)}
                    className="w-full sm:w-auto"
                  >
                    Ləğv et
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createCategoryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}