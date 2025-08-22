import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  can_create_quiz: boolean
  is_active: boolean
  is_private: boolean
  created_at: string
  updated_at: string
  is_super_admin: boolean
  is_admin: boolean
}

export interface AdminStats {
  totalQuizzes: number
  totalForumPosts: number
  activeUsers: number
  recentActivity: any[]
}

// Get admin statistics
export function useAdminStats() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        // Get basic counts
        const [quizzesResult, formsResult, activeUsersResult, recentActivityResult] = await Promise.all([
          supabase.from('qa_questions').select('id', { count: 'exact', head: true }),
          supabase.from('forms').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase
            .from('users')
            .select('id, full_name, email, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5)
        ])
        
        return {
          totalQuizzes: quizzesResult.count || 0,
          totalForumPosts: formsResult.count || 0,
          activeUsers: activeUsersResult.count || 0,
          recentActivity: recentActivityResult.data?.map(activity => ({
            users: {
              full_name: activity.full_name,
              email: activity.email
            },
            created_at: activity.updated_at
          })) || []
        } as AdminStats
      } catch (error) {
        console.error('Error fetching admin stats:', error)
        return {
          totalQuizzes: 0,
          totalForumPosts: 0,
          activeUsers: 0,
          recentActivity: []
        } as AdminStats
      }
    },
    enabled: !!user,
  })
}

// Get all users (admin only)
export function useAllUsers() {
  const { user, isAdmin } = useAuth()
  
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          can_create_quiz,
          is_active,
          is_private,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Add computed admin flags
      const usersWithAdminInfo = (data || []).map(user => ({
        ...user,
        is_admin: user.role === 'admin' || user.role === 'super_admin',
        is_super_admin: user.role === 'super_admin'
      }))
      
      return usersWithAdminInfo as AdminUser[]
    },
    enabled: !!user && isAdmin,
  })
}

// Assign admin role
export function useAssignAdminRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('assign_admin_role', {
        target_user_id: userId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign admin role')
    }
  })
}

// Remove admin role
export function useRemoveAdminRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('remove_admin_role', {
        target_user_id: userId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove admin role')
    }
  })
}

// Delete user account
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('delete_user_account', {
        target_user_id: userId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user account')
    }
  })
}

// Toggle quiz creation permission
export function useToggleQuizPermission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, canCreate }: { userId: string; canCreate: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_quiz_creation_permission', {
        target_user_id: userId,
        can_create: canCreate
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update quiz permission')
    }
  })
}

// Update user role
export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User role updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user role')
    }
  })
}

// Get quiz categories
export function useQuizCategories() {
  return useQuery({
    queryKey: ['quiz-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    },
  })
}

// Create category
export function useCreateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, description }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all category-related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.refetchQueries({ queryKey: ['quiz-categories'] })
      toast.success('Category created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category')
    }
  })
}

// Delete category
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
      
      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate all category-related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.refetchQueries({ queryKey: ['quiz-categories'] })
      toast.success('Category deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category')
    }
  })
}

// Grant quiz permission
export function useGrantQuizPermission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, canCreate }: { userId: string; canCreate: boolean }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ can_create_quiz: canCreate, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Quiz permission updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update quiz permission')
    }
  })
}

// Get user profile (admin only - can view private profiles)
export function useUserProfileAdmin(userId: string) {
  return useQuery({
    queryKey: ['admin-user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_profile_admin', {
        target_user_id: userId
      })
      
      if (error) throw error
      return data[0] || null
    },
    enabled: !!userId,
  })
}
