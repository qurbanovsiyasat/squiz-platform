import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
// Admin functionality removed
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/Badge'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import logo from '../../image/logo.png'
import {
  Menu,
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Globe,
  Shield
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface NavbarProps {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, signOut } = useAuth()
  // Admin functionality removed
  const { currentLanguage, changeLanguage } = useLanguage()
  const { theme } = useTheme()
  
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const toggleTheme = () => {
    toast.error('Bu funksiya hələ mövcud deyil', {
      duration: 3000,
      position: 'top-center'
    })
  }

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'az' ? 'en' : 'az'
    changeLanguage(newLanguage)
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 w-full bg-pure-white/95 backdrop-blur supports-[backdrop-filter]:bg-pure-white/60 border-b border-light-grey"
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Logo Only */}
          <Link to="/">
            <img src={logo} alt="Logo" className="h-12 w-auto" style={{ borderRadius: '8px' }} />
          </Link>
          {/* Mobile menu button */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden touch-target"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Search */}
          {user && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                <input
                  type="text"
                  placeholder="Search quizzes and questions..."
                  className="pl-10 pr-4 py-2 w-80 bg-soft-grey border border-light-grey rounded-button typography-body placeholder:text-medium-grey focus:border-vibrant-blue focus:ring-2 focus:ring-blue-200 transition-colors mobile-form-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* Theme toggle */}
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="touch-target">
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>

              {/* Language toggle */}
              <Button variant="ghost" size="sm" onClick={toggleLanguage} className="touch-target">
                <Globe className="h-4 w-4 mr-1" />
                <span className="typography-small">{currentLanguage.toUpperCase()}</span>
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative touch-target">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 typography-small bg-error-red border-0">
                  3
                </Badge>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                      <AvatarFallback className="bg-vibrant-blue text-pure-white">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="typography-body text-dark-charcoal text-break">
                        {user.is_private ? 'Abituriyent' : (user.full_name || 'İstifadəçi')}
                      </p>
                      <p className="typography-small text-medium-grey mobile-email-display">
                        {user.email}
                      </p>
                      <RoleBadge 
                        role={user.role} 
                        isSuperAdmin={user.role === 'super_admin'}
                        size="sm"
                      />
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/profile/${user.id}`} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Tənzimləmələr</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-error-red cursor-pointer" 
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıxış</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Giriş</Link>
              </Button>
              <Button asChild className="btn-primary">
                <Link to="/register">Qeydiyyat</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}