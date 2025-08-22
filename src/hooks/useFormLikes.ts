import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface FormLikeStats {
  total_likes: number
  total_views: number
  user_liked: boolean
}

interface ToggleLikeResult {
  liked: boolean
  total_likes: number
}

// Hook to get form like stats (likes, views, user's like status)
export function useFormStats(formId: string) {
  return useQuery({
    queryKey: ['form-stats', formId],
    queryFn: async (): Promise<FormLikeStats> => {
      const { data, error } = await supabase.rpc('get_form_stats', {
        p_form_id: formId
      })
      
      if (error) {
        console.error('Error fetching form stats:', error)
        throw error
      }
      
      return {
        total_likes: data?.[0]?.total_likes || 0,
        total_views: data?.[0]?.total_views || 0,
        user_liked: data?.[0]?.user_liked || false
      }
    },
    enabled: !!formId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  })
}

// Hook to toggle form like
export function useToggleFormLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formId: string): Promise<ToggleLikeResult> => {
      if (!user) {
        throw new Error('Authentication required to like forms')
      }

      const { data, error } = await supabase.rpc('toggle_form_like', {
        p_form_id: formId
      })
      
      if (error) {
        console.error('Error toggling form like:', error)
        throw error
      }
      
      return {
        liked: data?.[0]?.liked || false,
        total_likes: data?.[0]?.total_likes || 0
      }
    },
    onSuccess: (data, formId) => {
      // Update the form stats cache
      queryClient.setQueryData(['form-stats', formId], (oldData: FormLikeStats | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          total_likes: data.total_likes,
          user_liked: data.liked
        }
      })
      
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['form-stats', formId] })
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      
      // Show success message
      toast.success(data.liked ? 'Form liked!' : 'Like removed')
    },
    onError: (error: any) => {
      console.error('Like toggle error:', error)
      if (error.message.includes('Authentication required')) {
        toast.error('Please log in to like forms')
      } else {
        toast.error('Failed to update like')
      }
    }
  })
}

// Hook to record form view (enhanced with session tracking)
export function useRecordFormView() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formId: string): Promise<number> => {
      // Check if user has already viewed this form in current session
      const viewedKey = `form_viewed_${formId}`
      const hasViewedInSession = sessionStorage.getItem(viewedKey)
      
      if (hasViewedInSession) {
        // Return current view count without incrementing
        const currentStats = queryClient.getQueryData(['form-stats', formId]) as FormLikeStats | undefined
        return currentStats?.total_views || 0
      }
      
      const { data, error } = await supabase.rpc('record_form_view', {
        p_form_id: formId
      })
      
      if (error) {
        console.error('Error recording form view:', error)
        throw error
      }
      
      // Mark as viewed in session storage
      sessionStorage.setItem(viewedKey, 'true')
      
      return data || 0
    },
    onSuccess: (newViewCount, formId) => {
      // Update the form stats cache
      queryClient.setQueryData(['form-stats', formId], (oldData: FormLikeStats | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          total_views: newViewCount
        }
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['form-stats', formId] })
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
    },
    onError: (error: any) => {
      console.error('View recording error:', error)
      // Don't show error toast for view tracking failures
    }
  })
}
