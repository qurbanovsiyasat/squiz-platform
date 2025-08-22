import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  FolderOpen,
  Crown,
  FileText,
  MessageSquare,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { formatDate } from '@/lib/utils'

interface Category {
  id: string
  name: string
  type: 'quiz' | 'form' | 'qa'
  description?: string
  created_at: string
  updated_at: string
}

interface CreateCategoryData {
  name: string
  type: 'quiz' | 'form' | 'qa'
  description?: string
}

// Admin functionality disabled
export function CategoryManager() {
  const { isSuperAdmin } = useAdmin()
  const [activeTab, setActiveTab] = useState<'form' | 'quiz' | 'qa'>('form')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState<CreateCategoryData>({
    name: '',
    type: 'form',
    description: ''
  })
  const [editData, setEditData] = useState<CreateCategoryData>({
    name: '',
    type: 'form',
    description: ''
  })
  
  const queryClient = useQueryClient()
  
  // Fetch categories by type using RPC function with error handling
  const { data: categories = [], isLoading, error: categoriesError } = useQuery({
    queryKey: ['categories', activeTab],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_categories_by_type', {
          p_type: activeTab
        })
        
        if (error) {
          console.error('Categories RPC error:', error)
          // Try simple query as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('categories')
            .select('*')
            .eq('type', activeTab)
            .order('name')
          
          if (fallbackError) throw fallbackError
          return (fallbackData || []) as Category[]
        }
        
        return (data || []) as Category[]
      } catch (error) {
        console.error('Categories query failed:', error)
        return []
      }
    },
    enabled: isSuperAdmin,
    retry: 2,
    retryDelay: 1000
  })
  
  // Create category mutation using RPC function
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CreateCategoryData) => {
      const { data, error } = await supabase.rpc('create_category', {
        category_name: categoryData.name,
        category_type: categoryData.type,
        category_description: categoryData.description || null
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category created successfully')
      setShowCreateForm(false)
      setNewCategory({ name: '', type: activeTab, description: '' })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category')
    }
  })
  
  // Update category mutation using RPC function
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCategoryData> }) => {
      const { error } = await supabase.rpc('update_category', {
        category_id: id,
        category_name: data.name || null,
        category_description: data.description || null
      })
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category updated successfully')
      setEditingCategory(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category')
    }
  })
  
  // Delete category mutation using improved RPC function with fallback
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      // Try RPC function first
      const { data, error } = await supabase.rpc('delete_category', {
        p_category_id: categoryId,
        force_delete: false,
        reassign_to_default: true
      })

      // If RPC function doesn't exist (404), fall back to direct delete
      if (error && error.message && (error.message.includes('404') || error.message.includes('not found'))) {
        console.warn('RPC delete_category not found, using direct delete method')
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId)
        if (deleteError) throw deleteError
        return { success: true, message: 'Category deleted successfully' }
      }

      if (error) throw error

      // Eğer Supabase fonksiyonu "returns table" ise data bir array olur.
      if (Array.isArray(data) && data.length > 0) {
        return data[0]
      }
      return data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })

      // Gelen veri array ise ilk elemanı al, değilse kendisini kullan
      const data = Array.isArray(result) && result.length > 0 ? result[0] : result
      if (data && typeof data === 'object') {
        if (data.success) {
          toast.success(data.message || 'Category deleted successfully')
          if (data.items_reassigned && data.items_reassigned > 0) {
            toast.info(`${data.items_reassigned} items were moved to the default category`)
          }
        } else {
          toast.error(data.message || 'Failed to delete category')
          return // Don't close modal on failure
        }
      } else {
        toast.success('Category deleted successfully')
      }

      setDeleteCategory(null)
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to delete category'
      
      if (error.message) {
        if (error.message.includes('being used by')) {
          errorMessage = error.message + ' Items will be reassigned to default category on next attempt.'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    }
  })
  
  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required')
      return
    }
    const categoryWithType = { ...newCategory, type: activeTab }
    createCategoryMutation.mutate(categoryWithType)
  }
  
  const handleUpdateCategory = (categoryId: string) => {
    if (!editData.name.trim()) {
      toast.error('Category name is required')
      return
    }
    updateCategoryMutation.mutate({ id: categoryId, data: editData })
  }
  
  const startEditing = (category: Category) => {
    setEditingCategory(category.id)
    setEditData({
      name: category.name,
      type: category.type,
      description: category.description || ''
    })
  }
  
  const getTabIcon = (type: string) => {
    switch (type) {
      case 'form': return <FileText className="h-4 w-4" />
      case 'quiz': return <BookOpen className="h-4 w-4" />
      case 'qa': return <MessageSquare className="h-4 w-4" />
      default: return <FolderOpen className="h-4 w-4" />
    }
  }
  
  const getTabLabel = (type: string) => {
    switch (type) {
      case 'form': return 'Forms'
      case 'quiz': return 'Quizzes'
      case 'qa': return 'Q&A'
      default: return 'General'
    }
  }
  
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <Crown className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Super Admin Access Required</h3>
        <p className="text-slate-600 dark:text-slate-400">
          Only super administrators can manage categories.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Category Management</h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Manage categories for forms, quizzes, and Q&A across the platform
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      {/* Category Type Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="form" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            {getTabIcon('form')}
            <span className="hidden sm:inline">{getTabLabel('form')}</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            {getTabIcon('quiz')}
            <span className="hidden sm:inline">{getTabLabel('quiz')}</span>
            <span className="sm:hidden">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            {getTabIcon('qa')}
            <span className="hidden sm:inline">{getTabLabel('qa')}</span>
            <span className="sm:hidden">Q&A</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Create New {getTabLabel(activeTab)} Category</CardTitle>
                <CardDescription>
                  Add a new category for organizing {getTabLabel(activeTab).toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Enter category name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category-description">Description (Optional)</Label>
                  <Input
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Enter category description"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                  >
                    {createCategoryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Create Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewCategory({ name: '', type: activeTab, description: '' })
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Categories List for each tab */}
        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{getTabLabel(activeTab)} Categories ({categories.length})</CardTitle>
              <CardDescription>
                Manage existing {getTabLabel(activeTab).toLowerCase()} categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold mb-2">No {getTabLabel(activeTab)} Categories</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Create your first {getTabLabel(activeTab).toLowerCase()} category to get started
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {editingCategory === category.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            placeholder="Category name"
                          />
                          <Input
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="font-medium">
                              {getTabIcon(category.type)}
                              <span className="ml-1">{category.name}</span>
                            </Badge>
                            {category.description && (
                              <span className="text-slate-600 dark:text-slate-400 text-sm">
                                {category.description}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Created: {formatDate(category.created_at)}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {editingCategory === category.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCategory(category.id)}
                              disabled={updateCategoryMutation.isPending}
                            >
                              {updateCategoryMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCategory(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteCategory(category)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        onConfirm={() => deleteCategory && deleteCategoryMutation.mutate(deleteCategory.id)}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        itemName={deleteCategory?.name}
        isPending={deleteCategoryMutation.isPending}
      />
    </div>
  )
}
