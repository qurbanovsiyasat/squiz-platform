import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Crown, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface RoleBadgeProps {
  role: string
  isSuperAdmin?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function RoleBadge({ role, isSuperAdmin = false, size = 'sm', className }: RoleBadgeProps) {
  const { t } = useTranslation()
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher'
  const isStudent = role === 'student'
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 h-6',
    md: 'text-sm px-3 py-1.5 h-8',
    lg: 'text-base px-4 py-2 h-10'
  }
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  if (isSuperAdmin || role === 'super_admin') {
    return (
      <Badge 
        variant="default"
        className={cn(
          // Squiz Gold colors as per design specification
          'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold border-none shadow-lg',
          'hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200',
          'flex items-center gap-1',
          sizeClasses[size],
          className
        )}
      >
        <Crown className={cn(iconSizes[size], 'text-yellow-100')} />
        <span className="font-bold tracking-wide">{t('roles.super_admin').toUpperCase()}</span>
      </Badge>
    )
  }

  if (isAdmin) {
    return (
      <Badge 
        variant="default"
        className={cn(
          // Squiz Blue colors as per design specification
          'bg-blue-600 text-white font-semibold border-blue-700',
          'hover:bg-blue-700 transition-colors duration-200',
          'flex items-center gap-1',
          sizeClasses[size],
          className
        )}
      >
        <Shield className={cn(iconSizes[size], 'text-blue-100')} />
        <span className="font-semibold tracking-wide">{t('roles.admin').toUpperCase()}</span>
      </Badge>
    )
  }

  if (isTeacher) {
    return (
      <Badge 
        variant="default"
        className={cn(
          // Teacher green colors
          'bg-green-600 text-white font-medium border-green-700',
          'hover:bg-green-700 transition-colors duration-200',
          'flex items-center gap-1',
          sizeClasses[size],
          className
        )}
      >
        <User className={cn(iconSizes[size], 'text-green-100')} />
        <span className="font-medium tracking-wide">{t('roles.teacher').toUpperCase()}</span>
      </Badge>
    )
  }

  if (isStudent) {
    return (
      <Badge 
        variant="outline"
        className={cn(
          // Student gray colors with dark theme support
          'bg-gray-100 text-gray-700 border-gray-300',
          'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
          'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200',
          'flex items-center gap-1',
          sizeClasses[size],
          className
        )}
      >
        <User className={cn(iconSizes[size], 'text-gray-500 dark:text-gray-400')} />
        <span className="font-medium tracking-wide">{t('roles.student').toUpperCase()}</span>
      </Badge>
    )
  }

  // Fallback for unknown roles
  return (
    <Badge 
      variant="outline"
      className={cn(
        'bg-gray-100 text-gray-700 border-gray-300',
        'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
        'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200',
        'flex items-center gap-1',
        sizeClasses[size],
        className
      )}
    >
      <User className={cn(iconSizes[size], 'text-gray-500 dark:text-gray-400')} />
      <span className="font-medium tracking-wide">{t(`roles.${role}`, role?.toUpperCase() || 'USER').toUpperCase()}</span>
    </Badge>
  )
}

// Helper function to get display name with proper privacy consideration
export function getDisplayName(user: any, currentUserIsAdmin = false) {
  if (!user) return 'Anonymous'
  
  // If user is private and current user is not admin, show Anonymous
  if (user.is_private && !currentUserIsAdmin) {
    return 'Anonymous'
  }
  
  return user.full_name || user.name || 'Anonymous'
}

// Enhanced user display component that includes role badge
export function UserDisplay({ 
  user, 
  showRole = true, 
  currentUserIsAdmin = false,
  className 
}: {
  user: any
  showRole?: boolean
  currentUserIsAdmin?: boolean
  className?: string
}) {
  const displayName = getDisplayName(user, currentUserIsAdmin)
  const isSuperAdmin = user?.email === 'user@squiz.com' && user?.role === 'admin'
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="font-medium">{displayName}</span>
      {showRole && user?.role && (
        <RoleBadge 
          role={user.role} 
          isSuperAdmin={isSuperAdmin}
          size="sm"
        />
      )}
    </div>
  )
}
