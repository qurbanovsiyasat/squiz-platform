import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Home,
  BookOpen,
  Users,
  MessageSquare,
  User
} from 'lucide-react'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  onClick?: () => void
}

export default function BottomNavigation() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  const navigation: NavItem[] = [
    {
      icon: Home,
      label: t('nav.dashboard'),
      href: '/dashboard'
    },
    {
      icon: BookOpen,
      label: t('nav.quizzes'),
      href: '/quizzes'
    },
    {
      icon: BookOpen,
      label: t('nav.forms') || 'Formlar',
      href: '/forms'
    },
    {
      icon: MessageSquare,
      label: t('nav.qa'),
      href: '/qa'
    },
    {
      icon: User,
      label: t('nav.profile'),
      href: user?.id ? `/profile/${user.id}` : '/profile'
    }
  ]

  // Only show on mobile and for authenticated users
  if (!user) return null

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl lg:hidden dark:bg-gray-900/95 dark:border-gray-700"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-3 max-w-screen-sm mx-auto">
        {navigation.map((item, index) => {
          const isActive = item.href && (location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href)))
          
          return item.href ? (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 relative group',
                'min-h-[60px] hover:scale-105 active:scale-95',
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center space-y-1"
              >
                <div className={cn(
                  'relative p-1 rounded-lg transition-all duration-200',
                  isActive && 'bg-white/20'
                )}>
                  <item.icon 
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    )} 
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                    />
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium leading-tight text-center truncate max-w-full',
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          ) : (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 relative group',
                'min-h-[60px] hover:scale-105 active:scale-95',
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center space-y-1"
              >
                <div className={cn(
                  'relative p-1 rounded-lg transition-all duration-200',
                  isActive && 'bg-white/20'
                )}>
                  <item.icon 
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    )} 
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                    />
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium leading-tight text-center truncate max-w-full',
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {item.label}
                </span>
              </motion.div>
            </button>
          )
        })}
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-4 sm:h-2" />
    </motion.nav>
  )
}