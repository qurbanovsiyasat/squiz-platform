import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User } from '@/lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  canCreateQuiz: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: Partial<User>) => Promise<any>
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user on mount (one-time check)
  useEffect(() => {
    let mounted = true
    
    async function loadUser() {
      try {
        setLoading(true)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        if (session?.user && mounted) {
          // Get user profile from our users table
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            if (mounted) {
              setUser(null)
            }
          } else if (userProfile && mounted) {
            // Always use role from users table in database
            setUser(userProfile)
          } else if (mounted) {
            // Create profile if it doesn't exist
            const newProfile: User = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: userProfile?.full_name || session.user.email || '',
              role: 'student' as User['role'],
              can_create_quiz: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: createdProfile, error: createError } = await supabase
              .from('users')
              .insert([newProfile])
              .select()
              .single()

            if (createError) {
              console.error('Error creating user profile:', createError)
            } else if (mounted) {
              setUser(createdProfile as User)
            }
          }
        } else if (mounted) {
          setUser(null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadUser()

    // Set up auth listener - KEEP SIMPLE, avoid any async operations in callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        // NEVER use any async operations in callback
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Only reload if we don't have user data or user ID changed
          if (!user || user.id !== session.user.id) {
            loadUser()
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Auth methods
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) throw error
      
      // Immediately load user profile after successful login
      if (data.session?.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle()

        if (!profileError && userProfile) {
          setUser(userProfile)
          setLoading(false)
          // Success! User state is updated, let the component handle navigation
          return { data, userProfile }
        } else {
          // Profil yoksa otomatik oluştur
          const newProfile: User = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            full_name: userProfile?.full_name || data.session.user.email || '',
            role: 'student' as User['role'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          await supabase.from('users').insert([newProfile])
          setUser(newProfile)
          setLoading(false)
          return { data, userProfile: newProfile }
        }
      }
      
      return data
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: string = 'student') {
    setLoading(true)
    try {
      // First check if email already exists in auth.users table (including deleted accounts)
      const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', {
        email_address: email
      })
      
      if (checkError) {
        console.error('Error checking email existence:', checkError)
        throw new Error('Unable to verify email. Please try again.')
      }
      
      if (emailExists) {
        throw new Error('This account already exists. Please try logging in or use a different email.')
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          },
          emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
        }
      })
      
      if (error) throw error
      
      return data
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      // Force redirect to home page after logout
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) {
      throw new Error('No user logged in')
    }
    
    try {
      const { data: currentUser, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser.user) {
        throw new Error('User authentication failed. Please log in again.')
      }

      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', currentUser.user.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Database update error:', error)
        // Provide user-friendly error messages
        if (error.code === 'PGRST116') {
          throw new Error('User profile not found. Please contact support.')
        }
        if (error.message.includes('permission')) {
          throw new Error('Permission denied. Please check your account status.')
        }
        throw new Error(error.message || 'Failed to update profile')
      }

      if (data) {
        setUser(data)
      }
      
      return data
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  // Compute role-based permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const canCreateQuiz = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'teacher'

  const refetchUser = async () => {
    if (!user?.id) return
    
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (!error && userProfile) {
        setUser(userProfile)
      }
    } catch (error) {
      console.error('Error refetching user:', error)
    }
  }

  const value = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    canCreateQuiz,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refetchUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function for auth callback page
export async function handleAuthCallback() {
  const hashFragment = window.location.hash

  if (hashFragment && hashFragment.length > 0) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(hashFragment)

    if (error) {
      console.error('Error exchanging code for session:', error.message)
      window.location.href = '/login?error=' + encodeURIComponent(error.message)
      return
    }

    if (data.session) {
      window.location.href = '/dashboard'
      return
    }
  }

  window.location.href = '/login?error=No session found'
}