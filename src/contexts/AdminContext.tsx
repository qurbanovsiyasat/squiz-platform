import React, { createContext, useContext } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AdminContextType {
  isAdmin: boolean
  isSuperAdmin: boolean
  canCreateQuiz: boolean
  userRole: string
  loading: boolean
  refetchAdminInfo: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

// Simplified AdminProvider that delegates to AuthContext
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isSuperAdmin, canCreateQuiz, refetchUser } = useAuth()

  const value = {
    isAdmin,
    isSuperAdmin,
    canCreateQuiz,
    userRole: user?.role || 'student',
    loading,
    refetchAdminInfo: refetchUser
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    // Return default values instead of throwing error to prevent crashes
    console.warn('useAdmin called outside of AdminProvider, returning default values')
    return {
      isAdmin: false,
      isSuperAdmin: false,
      canCreateQuiz: false,
      userRole: 'student',
      loading: false,
      refetchAdminInfo: async () => {}
    }
  }
  return context
}
