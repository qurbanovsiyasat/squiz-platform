import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useQuizCreatePermission } from '@/hooks/useQuizCreatePermission'
import { useTranslation } from 'react-i18next'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../image/logo.png'
import {
  Home,
  BookOpen,
  MessageSquare,
  User,
  Settings,
  Shield,
  BarChart3,
  X,
  Sparkles,
  ChevronRight,
  Plus,
  FileText,
  HelpCircle,
  Users
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose?: () =&gt; void
  isMobile: boolean
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  onClick?: () =&gt; void
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  adminOnly?: boolean
}

export default function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const { user, isAdmin, isSuperAdmin, canCreateQuiz } = useAuth()
  const location = useLocation()
  const { checkPermissionAndNavigate } = useQuizCreatePermission()
  const { t } = useTranslation()

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
      icon: Plus,
      label: t('nav.createQuiz'),
      onClick: checkPermissionAndNavigate
    },
    {
      icon: MessageSquare,
      label: t('nav.qa'),
      href: '/qa'
    },
    {
      icon: FileText,
      label: t('nav.forms'),
      href: '/forms',
      badge: 'New',
      badgeVariant: 'secondary'
    },
    {
      icon: BarChart3,
      label: t('nav.statistics'),
      href: '/stats'
    },
    {
      icon: Shield,
      label: t('nav.admin'),
      href: '/admin',
      adminOnly: true,
      badge: isAdmin ? 'Admin' : undefined,
      badgeVariant: 'destructive'
    },
    {
      icon: User,
      label: t('nav.profile'),
      href: user?.id ? `/profile/${user.id}` : '/profile'
    },
    {
      icon: Users,
      label: t('nav.socialMedia'),
      href: '/social-media'
    },
    {
      icon: Settings,
      label: t('nav.settings'),
      href: '/settings'
    },

  ]

  const filteredNavigation = navigation.filter(item =&gt; 
    !item.adminOnly || (item.adminOnly &amp;&amp; isAdmin)
  )

  const sidebarContent = (
    <div className="flex flex-col h-full bg-pure-white border-r border-light-grey dark:bg-[#0B0B0F] dark:border-[#232325]">
      {/* Header */}
      <div className="p-6 border-b border-light-grey dark:border-[#232325]">
        <div className="flex items-center justify-between">
          <div className="flex items-center pl-1 pb-2 space-x-2 select-none">
            <img src={logo} alt="Logo" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-2xl shadow-sm border border-light-grey bg-white dark:border-[#2a2a2e] dark:bg-[#111216]" style={{ boxShadow: '0 2px 12px 0 rgb(80 0 180 / 9%)' }} />
            <div className="flex flex-col justify-center ml-1">
              <span className="text-3xl md:text-4xl font-extrabold text-purple-700 leading-tight tracking-tight drop-shadow-sm dark:text-white">
                Squiz
              </span>
              <span className="text-xs text-medium-grey font-medium mt-1 md:mt-2 pl-0.5 dark:text-dark-text-muted">
                Təhsil Platforması
              </span>
            </div>
          </div>
          {isMobile &amp;&amp; onClose &amp;&amp; (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {filteredNavigation.map((item, index) =&gt; {
          const isActive = item.href &amp;&amp; (location.pathname === item.href || 
            (item.href !== '/dashboard' &amp;&amp; location.pathname.startsWith(item.href)))
          
          const handleClick = () =&gt; {
            if (item.onClick) {
              item.onClick()
            }
            if (isMobile) {
              onClose?.()
            }
          }
          
          return (
            <motion.div
              key={item.href || item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              {item.href ? (
                <Link
                  to={item.href}
                  onClick={() =&gt; isMobile &amp;&amp; onClose?.()}
                  className={cn(
                    'flex items-center justify-between w-full p-2.5 rounded-lg text-[13px] transition-all duration-200 group ring-1 ring-black/[0.04] dark:ring-white/[0.04]',
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-[#1A1A20] dark:text-white'
                      : 'text-medium-grey hover:bg-soft-grey hover:text-dark-charcoal dark:text-dark-text-muted dark:hover:bg-[#141418] dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon 
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-purple-600 dark:text-purple-400' : 'text-medium-grey group-hover:text-vibrant-blue dark:text-dark-text-muted dark:group-hover:text-purple-400'
                      )} 
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge &amp;&amp; (
                      <Badge 
                        variant={item.badgeVariant || 'default'} 
                        className="text-xs px-2 py-0.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {!isActive &amp;&amp; (
                      <ChevronRight className="h-4 w-4 text-medium-grey opacity-0 group-hover:opacity-100 transition-opacity dark:text-dark-text-muted" />
                    )}
                  </div>
                </Link>
              ) : (
                <button
                  onClick={handleClick}
                  className={cn(
                    'flex items-center justify-between w-full p-2.5 rounded-lg text-[13px] transition-all duration-200 group ring-1 ring-black/[0.04] dark:ring-white/[0.04]',
                    'text-medium-grey hover:bg-soft-grey hover:text-dark-charcoal dark:text-dark-text-muted dark:hover:bg-[#141418] dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon 
                      className="h-4 w-4 transition-colors text-medium-grey group-hover:text-vibrant-blue dark:text-dark-text-muted dark:group-hover:text-purple-400" 
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge &amp;&amp; (
                      <Badge 
                        variant={item.badgeVariant || 'default'} 
                        className="text-xs px-2 py-0.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-medium-grey opacity-0 group-hover:opacity-100 transition-opacity dark:text-dark-text-muted" />
                  </div>
                </button>
              )}
            </motion.div>
          )
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-light-grey dark:border-[#232325]">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:from-[#141418] dark:to-[#111216] dark:border-[#232325]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-vibrant-blue rounded-full flex items-center justify-center dark:bg-purple-600">
              <span className="text-sm font-semibold text-pure-white">
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ui-label text-dark-charcoal truncate dark:text-white">
                {user?.is_private ? 'Abituriyent' : (user?.full_name || user?.email?.split('@')[0] || 'İstifadəçi')}
              </p>
              <div className="flex items-center space-x-2">
                <RoleBadge 
                  role={user?.role || 'student'} 
                  isSuperAdmin={user?.role === 'super_admin'}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  // Desktop sidebar
  if (!isMobile) {
    return (
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-80">
          {sidebarContent}
        </div>
      </aside>
    )
  }

  // Mobile sidebar with overlay
  return (
    <AnimatePresence>
      {isOpen &amp;&amp; (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-dark-charcoal/50 lg:hidden"
            onClick={onClose}
          />
          
          {/* Mobile Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-80 lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}