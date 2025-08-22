import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
        // First try the new RPC function
        const { data, error } = await supabase.rpc('get_categories_by_type', {
          p_type: type
        })
        
        if (error) {
          console.error('Categories RPC error:', error)
          // Fallback to direct table query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('categories')
            .select(`
              id,
              name,
              type,
              description,
              created_at,
              updated_at
            `)
            .eq('type', type)
            .order('name')
          
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
