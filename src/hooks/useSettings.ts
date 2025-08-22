import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
    forum: boolean
    quiz: boolean
  }
  privacy: {
    profilePublic: boolean
    showEmail: boolean
    showActivity: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timeZone: string
  }
}

export interface UserPrivacySettings {
  is_private: boolean
}

export function useUserSettings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async (): Promise<UserSettings> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        const { data, error } = await supabase
          .from('users')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle()

        // Always return default settings on any error or if data is missing
        const defaultSettings: UserSettings = {
          notifications: {
            email: true,
            push: false,
            forum: true,
            quiz: true
          },
          privacy: {
            profilePublic: true,
            showEmail: false,
            showActivity: true
          },
          preferences: {
            theme: 'system',
            language: 'en',
            timeZone: 'Asia/Baku'
          }
        }

        if (error) {
          console.warn('Error fetching user settings, using defaults:', error)
          return defaultSettings
        }

        // Merge with defaults to ensure all properties exist
        return {
          notifications: {
            ...defaultSettings.notifications,
            ...(data?.settings?.notifications || {})
          },
          privacy: {
            ...defaultSettings.privacy,
            ...(data?.settings?.privacy || {})
          },
          preferences: {
            ...defaultSettings.preferences,
            ...(data?.settings?.preferences || {})
          }
        }
      } catch (error) {
        console.warn('Exception fetching user settings, using defaults:', error)
        return {
          notifications: {
            email: true,
            push: false,
            forum: true,
            quiz: true
          },
          privacy: {
            profilePublic: true,
            showEmail: false,
            showActivity: true
          },
          preferences: {
            theme: 'system',
            language: 'en',
            timeZone: 'Asia/Baku'
          }
        }
      }
    },
    enabled: !!user?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useUserPrivacySettings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-privacy-settings', user?.id],
    queryFn: async (): Promise<UserPrivacySettings & { bio?: string }> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_private, bio')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.warn('Error fetching user privacy settings, using defaults:', error)
          return { is_private: false, bio: '' }
        }

        return { 
          is_private: data?.is_private || false,
          bio: data?.bio || ''
        }
      } catch (error) {
        console.warn('Exception fetching user privacy settings, using defaults:', error)
        return { is_private: false, bio: '' }
      }
    },
    enabled: !!user?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update({ 
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] })
      toast.success('Settings saved successfully')
    },
    onError: (error) => {
      console.error('Settings update error:', error)
      toast.error('Error occurred while saving settings')
    }
  })
}

export function useUpdatePrivacySetting() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { is_private?: boolean; bio?: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_, updates) => {
      queryClient.invalidateQueries({ queryKey: ['user-privacy-settings', user?.id] })
      if (updates.is_private !== undefined) {
        toast.success(updates.is_private ? 'Your profile is now private' : 'Your profile is now public')
      }
      if (updates.bio !== undefined) {
        toast.success('Bio updated successfully')
      }
    },
    onError: (error) => {
      console.error('Privacy setting update error:', error)
      toast.error('Error occurred while updating profile')
    }
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('User not authenticated. Please log in again.')
        }
        
        if (!user.email) {
          throw new Error('User email not found. Please contact support.')
        }

        // Validate password strength
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long')
        }

        // Verify current password by attempting to sign in with it
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        })

        if (verifyError) {
          throw new Error('Current password is incorrect')
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (updateError) {
          // Handle specific error cases
          if (updateError.message.includes('Password should be')) {
            throw new Error('Password must be at least 6 characters long')
          }
          if (updateError.message.includes('Password is too weak')) {
            throw new Error('Password is too weak. Please choose a stronger password.')
          }
          throw new Error(updateError.message || 'Failed to update password')
        }

        return { success: true }
      } catch (error: any) {
        throw new Error(error.message || 'An unexpected error occurred while changing password')
      }
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error: any) => {
      console.error('Password change error:', error)
      toast.error(error.message || 'Error occurred while changing password')
    }
  })
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      // Get theme from localStorage or default to system
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system'
      // Validate the saved theme
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved
      }
      return 'system'
    } catch (error) {
      console.warn('Error reading theme from localStorage:', error)
      return 'system'
    }
  })

  // Initialize theme on first load
  useEffect(() => {
    const root = window.document.documentElement
    
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      try {
        root.classList.remove('light', 'dark')
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }
      } catch (error) {
        console.warn('Error applying theme:', error)
        // Fallback to light theme
        root.classList.remove('light', 'dark')
        root.classList.add('light')
      }
    }
    
    applyTheme(theme)
    
    // Listen for system theme changes
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (theme === 'system') {
          applyTheme('system')
        }
      }
      
      // Use the newer method if available, fallback to older method
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange)
        return () => mediaQuery.removeListener(handleChange)
      }
    } catch (error) {
      console.warn('Error setting up media query listener:', error)
      return () => {} // No cleanup needed if setup failed
    }
  }, [theme])

  const updateTheme = (newTheme: 'light' | 'dark' | 'system') => {
    try {
      setTheme(newTheme)
      localStorage.setItem('theme', newTheme)
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error)
      // Still update the theme state even if localStorage fails
      setTheme(newTheme)
    }
  }

  return { theme, updateTheme }
}
