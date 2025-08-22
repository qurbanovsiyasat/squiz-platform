import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface PrivacyAwareUsernameProps {
  user: {
    id?: string
    full_name?: string
    is_private?: boolean
  }
  className?: string
  fallback?: string
}

/**
 * Component that displays user names with proper privacy handling
 * - If user is private and viewer is not admin: shows "Anonymous"
 * - If user is not private or viewer is admin: shows real name
 * - Admins and super_admins can always see real names
 */
export function PrivacyAwareUsername({ 
  user, 
  className, 
  fallback = 'Anonymous' 
}: PrivacyAwareUsernameProps) {
  const { user: currentUser, isAdmin } = useAuth()
  
  if (!user) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }
  
  // If user is private and current user is not admin/super_admin, show Anonymous
  if (user.is_private && !isAdmin && currentUser?.id !== user.id) {
    return <span className={cn('text-muted-foreground', className)}>Anonymous</span>
  }
  
  // Show real name for non-private users, admins viewing anyone, or users viewing themselves
  const displayName = user.full_name || fallback
  
  return (
    <span className={cn('font-medium', className)}>
      {displayName}
    </span>
  )
}

// Hook version for programmatic use
export function usePrivacyAwareName(user: { id?: string; full_name?: string; is_private?: boolean } | null | undefined) {
  const { user: currentUser, isAdmin } = useAuth()
  
  if (!user) return 'Anonymous'
  
  // If user is private and current user is not admin/super_admin, show Anonymous
  if (user.is_private && !isAdmin && currentUser?.id !== user.id) {
    return 'Anonymous'
  }
  
  return user.full_name || 'Anonymous'
}
