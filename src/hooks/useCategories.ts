import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface Category {
  id: string
  name: string
  type: string
  description: string
  created_at: string
  updated_at: string
  item_count: number
}

// Hook to get categories with proper error handling and fallbacks (Fix #4)
export function useCategories(type: string = '') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      try {
        // Try the fixed RPC function first
        const { data, error } = await supabase.rpc('get_categories_by_type', {
          p_type: type || ''
        })
        
        if (error) {
          console.error('Categories RPC error:', error)
          // Fallback to direct table query
          const fallbackQuery = supabase
            .from('categories')
            .select(`
              id,
              name,
              type,
              description,
              created_at,
              updated_at
            `)
            .order('name')
          
          if (type && type !== '') {
            fallbackQuery.eq('type', type)
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery
          
          if (fallbackError) {
            console.error('Categories fallback error:', fallbackError)
            return []
          }
          
          return (fallbackData || []).map(item => ({
            ...item,
            item_count: 0
          })) as Category[]
        }
        
        return (data || []) as Category[]
      } catch (error) {
        console.error('Categories fetch error:', error)
        // Return empty array on any error to prevent UI crashes
        return []
      }
    },
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// Hook to create a new category
export function useCreateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, type, description }: {
      name: string
      type: string
      description?: string
    }) => {
      const { data, error } = await supabase.rpc('create_category', {
        p_name: name.trim(),
        p_type: type,
        p_description: description || ''
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch categories
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories', variables.type] })
      queryClient.invalidateQueries({ queryKey: ['categories', ''] })
      
      toast.success('Category created successfully')
    },
    onError: (error: any) => {
      console.error('Create category error:', error)
      toast.error(error.message || 'Failed to create category')
    }
  })
}

// Hook to delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { data, error } = await supabase.rpc('delete_category', {
        p_category_id: categoryId
      })
      
      if (error) throw error
      if (!data) throw new Error('Failed to delete category')
      
      return data
    },
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      
      toast.success('Category deleted successfully')
    },
    onError: (error: any) => {
      console.error('Delete category error:', error)
      toast.error(error.message || 'Failed to delete category')
    }
  })
}

// Hook specifically for quiz categories
export function useQuizCategories() {
  return useCategories('quiz')
}

// Hook specifically for form categories
export function useFormCategories() {
  return useCategories('form')
}

// Hook specifically for Q&A categories
export function useQACategories() {
  return useCategories('qa')
}

// Hook to get all categories (for admin use)
export function useAllCategories() {
  return useCategories('')
}
