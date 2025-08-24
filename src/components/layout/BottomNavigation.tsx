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
      className="pointer-events-none fixed bottom-3 left-0 right-0 z-30 lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="px-4">
        <div className="max-w-md mx-auto rounded-2xl bg-white/95 backdrop-blur ring-1 ring-black/5 shadow-lg pointer-events-auto dark:bg-[#111216]/95 dark:ring-white/10">
          <div className="grid grid-cols-5 gap-1 px-2 py-3">
            {navigation.map((item) => {
              const isActive = item.href && (location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href)))
              
              const Content = (
                <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center justify-center">
                  <div className="relative h-6 flex items-center justify-center">
                    <item.icon 
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'
                      )} 
                    />
                    {isActive && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-purple-600/90 dark:bg-purple-400/90" />
                    )}
                  </div>
                  <span className={cn(
                    'mt-1 text-[11px] font-medium leading-tight text-center truncate max-w-full',
                    isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              )
              
              return item.href ? (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 min-h-[56px]"
                >
                  {Content}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 min-h-[56px]"
                >
                  {Content}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[calc(env(safe-area-inset-bottom,0px)+8px)]" />
    </motion.nav>
  )
}