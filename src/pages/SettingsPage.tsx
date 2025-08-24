// FIX: Replace escaped HTML entities with real TSX
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
// Removed framer-motion to prevent runtime ReferenceError in some environments
// import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Globe,
  Palette,
  Save,
  Key,
  Moon,
  Sun,
  Monitor,
  Lock,
  ChevronRight,
  LayoutGrid,
  Info
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function SettingsPage() {
  const { user, updateProfile, loading: authLoading, signOut } = useAuth()
  const { currentLanguage, changeLanguage, t } = useLanguage()
  const [loading, setLoading] = useState(false)

  // State
  const [isPrivate, setIsPrivate] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [language, setLanguage] = useState(currentLanguage)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const defaultNotificationSettings = {
    email: true,
    push: true,
    forum: true,
    quiz: true
  }
  const [notifications, setNotifications] = useState({
    ...defaultNotificationSettings,
    ...(user?.settings?.notifications || {})
  })

  // Dashboard preferences (new)
  const defaultDashboardPrefs = {
    showRecentQuizzes: true,
    showMyStats: true,
    showForumFeed: true
  }
  const [dashboardPrefs, setDashboardPrefs] = useState(() => ({
    ...defaultDashboardPrefs,
    ...(user?.settings?.preferences?.dashboard || {})
  }))

  // Dialog visibility
  const [openPassword, setOpenPassword] = useState(false)
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openTheme, setOpenTheme] = useState(false)
  const [openLanguage, setOpenLanguage] = useState(false)
  const [openDashboard, setOpenDashboard] = useState(false)

  // Sync from user
  useEffect(() => {
    if (user && !authLoading) {
      setIsPrivate(user.is_private || false)
      setTheme((user.settings?.preferences?.theme as any) || (user.settings?.theme as any) || 'light')
      setLanguage(user.settings?.preferences?.language || currentLanguage)
      setNotifications({
        ...defaultNotificationSettings,
        ...(user.settings?.notifications || {})
      })
      setDashboardPrefs({
        ...defaultDashboardPrefs,
        ...(user.settings?.preferences?.dashboard || {})
      })
    }
  }, [user, authLoading])

  // Apply theme instantly
  useEffect(() => {
    const applyTheme = (themeValue: string) => {
      if (themeValue === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', systemTheme === 'dark')
      } else {
        document.documentElement.classList.toggle('dark', themeValue === 'dark')
      }
    }
    applyTheme(theme)
  }, [theme])

  // Handlers
  const handlePrivacyToggle = async (value: boolean) => {
    setLoading(true)
    try {
      await updateProfile({ is_private: value })
      setIsPrivate(value)
      toast.success(value ? t('settings.profileMadePrivate') : t('settings.profileMadePublic'))
    } catch (error: any) {
      toast.error(t('settings.privacyUpdateError'))
      setIsPrivate(!value)
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setLoading(true)
    try {
      const currentSettings = user?.settings || {}
      const currentPreferences = currentSettings.preferences || {}
      const newSettings = {
        ...currentSettings,
        preferences: { ...currentPreferences, theme: newTheme }
      }
      await updateProfile({ settings: newSettings })
      setTheme(newTheme)
      toast.success(t('settings.themeChanged'))
      setOpenTheme(false)
    } catch {
      toast.error(t('settings.themeChangeError'))
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageChange = async (newLanguage: string) => {
    setLoading(true)
    try {
      changeLanguage(newLanguage)
      setLanguage(newLanguage)
      const currentSettings = user?.settings || {}
      const currentPreferences = currentSettings.preferences || {}
      const newSettings = {
        ...currentSettings,
        preferences: { ...currentPreferences, language: newLanguage }
      }
      await updateProfile({ settings: newSettings })
      toast.success(t('settings.languageChanged'))
      setOpenLanguage(false)
    } catch {
      toast.error(t('settings.languageChangeError'))
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async (key: string, value: boolean) => {
    setLoading(true)
    try {
      const newNotifications = { ...notifications, [key]: value }
      const newSettings = {
        ...user?.settings,
        notifications: newNotifications
      }
      await updateProfile({ settings: newSettings })
      setNotifications(newNotifications)
      toast.success(t('settings.notificationsUpdated'))
    } catch {
      toast.error(t('settings.notificationsUpdateError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDashboardPrefsSave = async () => {
    setLoading(true)
    try {
      const currentSettings = user?.settings || {}
      const currentPreferences = currentSettings.preferences || {}
      const newSettings = {
        ...currentSettings,
        preferences: {
          ...currentPreferences,
          dashboard: { ...dashboardPrefs }
        }
      }
      await updateProfile({ settings: newSettings })
      toast.success(t('messages.changesSaved'))
      setOpenDashboard(false)
    } catch (e) {
      toast.error(t('errors.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t('errors.fieldsRequired'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('errors.passwordMismatch'))
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error(t('errors.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) throw error
      toast.success(t('settings.passwordChanged'))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setOpenPassword(false)
    } catch (error: any) {
      toast.error(t('settings.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  const getThemeLabel = (v: string) => (v === 'light' ? t('settings.lightTheme') : v === 'dark' ? t('settings.darkTheme') : t('settings.systemTheme'))

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-soft-grey flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Row component
  const SettingsRow = ({
    icon: Icon,
    title,
    description,
    right,
    onClick
  }: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description?: string
    right?: React.ReactNode
    onClick?: () => void
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl border border-light-grey transition-colors text-left"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <div className="text-sm font-medium text-dark-charcoal dark:text-white">{title}</div>
          {description && (
            <div className="text-xs text-medium-grey mt-0.5">{description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {right}
        <ChevronRight className="h-4 w-4 text-medium-grey" />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-soft-grey p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-design-system flex items-center justify-center">
              <SettingsIcon className="h-6 w-6 text-pure-white" />
            </div>
            <div>
              <h1 className="text-page-title">{t('settings.settings')}</h1>
              <p className="text-body">{t('settings.general')}</p>
            </div>
          </div>
        </motion.div>

        {/* ACCOUNT */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="text-section-title">HESAB</CardTitle>
            <CardDescription>{t('profile.profile')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsRow
              icon={User}
              title={t('profile.profile')}
              description={t('profile.editProfile')}
              right={
                <Badge variant="outline" className="capitalize">
                  {user?.role === 'admin' ? t('admin.admin') :
                   user?.role === 'teacher' ? t('admin.teacher') : t('admin.student')}
                </Badge>
              }
              onClick={() => (window.location.href = `/profile/${user.id}`)}
            />

            <SettingsRow
              icon={Shield}
              title={t('settings.changePassword')}
              description={t('settings.strongPasswordDesc')}
              onClick={() => setOpenPassword(true)}
            />

            <div className="flex items-center justify-between p-4 rounded-xl border border-light-grey">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <div className="text-sm font-medium text-dark-charcoal dark:text-white">{t('settings.privateProfile')}</div>
                  <div className="text-xs text-medium-grey mt-0.5">{t('settings.manageProfileVisibility')}</div>
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={handlePrivacyToggle} disabled={loading} />
            </div>
          </CardContent>
        </Card>

        {/* PREFERENCES */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="text-section-title">TƏRCİHLƏR</CardTitle>
            <CardDescription>{t('settings.manageNotifications')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsRow
              icon={Bell}
              title={t('settings.notifications')}
              description={t('settings.manageNotifications')}
              onClick={() => setOpenNotifications(true)}
              right={
                <div className="text-xs text-medium-grey">
                  {Object.values(notifications).filter(Boolean).length} / {Object.keys(notifications).length}
                </div>
              }
            />

            <SettingsRow
              icon={Palette}
              title={t('settings.theme')}
              description={t('settings.theme')}
              onClick={() => setOpenTheme(true)}
              right={
                <div className="flex items-center space-x-2 text-xs text-medium-grey">
                  {theme === 'light' && <Sun className="h-4 w-4" />}
                  {theme === 'dark' && <Moon className="h-4 w-4" />}
                  {theme === 'system' && <Monitor className="h-4 w-4" />}
                  <span>{getThemeLabel(theme)}</span>
                </div>
              }
            />

            <SettingsRow
              icon={LayoutGrid}
              title={t('settings.dashboardSettings')}
              description={t('settings.dashboardSettingsDesc')}
              onClick={() => setOpenDashboard(true)}
            />

            <SettingsRow
              icon={Globe}
              title={t('settings.language')}
              description={currentLanguage === 'az' ? 'Azərbaycan' : 'English'}
              onClick={() => setOpenLanguage(true)}
              right={<div className="text-xs text-medium-grey">{language?.toUpperCase()}</div>}
            />
          </CardContent>
        </Card>

        {/* GENERAL */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="text-section-title">ÜMUMİ</CardTitle>
            <CardDescription>{t('settings.general')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsRow
              icon={Info}
              title="About"
              description="App version, policies"
              onClick={() => (window.location.href = '/about')}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="pt-2">
          <Button variant="destructive" className="w-full" onClick={() => signOut()}>
            {t('nav.logout')}
          </Button>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={openPassword} onOpenChange={setOpenPassword}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>{t('settings.changePassword')}</span>
            </DialogTitle>
            <DialogDescription>{t('settings.strongPasswordDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-ui-label">{t('settings.currentPassword')}</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input-modern"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-ui-label">{t('settings.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input-modern"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-ui-label">{t('settings.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input-modern"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenPassword(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={loading}>{loading ? t('common.loading') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>{t('settings.notifications')}</span>
            </DialogTitle>
            <DialogDescription>{t('settings.manageNotifications')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {([
              { key: 'email', label: t('settings.emailNotifications') },
              { key: 'push', label: t('settings.pushNotifications') },
              { key: 'forum', label: t('settings.forumNotifications') },
              { key: 'quiz', label: t('settings.quizNotifications') }
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-light-grey">
                <div className="text-sm font-medium">{item.label}</div>
                <Switch
                  checked={Boolean((notifications as any)[item.key])}
                  onCheckedChange={(v) => handleNotificationUpdate(item.key, v)}
                  disabled={loading}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNotifications(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={openTheme} onOpenChange={setOpenTheme}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>{t('settings.theme')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'light', icon: Sun, label: t('settings.lightTheme') },
              { value: 'dark', icon: Moon, label: t('settings.darkTheme') },
              { value: 'system', icon: Monitor, label: t('settings.systemTheme') }
            ] as const).map(opt => (
              <Button
                key={opt.value}
                variant={theme === opt.value ? 'default' : 'outline'}
                className={`h-20 flex flex-col space-y-2 ${theme === opt.value ? 'bg-vibrant-blue text-pure-white' : ''}`}
                onClick={() => handleThemeChange(opt.value as any)}
                disabled={loading}
              >
                <opt.icon className="h-5 w-5" />
                <span className="text-ui-label">{opt.label}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTheme(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={openLanguage} onOpenChange={setOpenLanguage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>{t('settings.language')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant={language === 'az' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleLanguageChange('az')}>
              🇦🇿 Azərbaycan dili
            </Button>
            <Button variant={language === 'en' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleLanguageChange('en')}>
              🇺🇸 English
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLanguage(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Settings Dialog */}
      <Dialog open={openDashboard} onOpenChange={setOpenDashboard}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <LayoutGrid className="h-5 w-5" />
              <span>{t('settings.dashboardSettings')}</span>
            </DialogTitle>
            <DialogDescription>{t('settings.dashboardSettingsDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {([
              { key: 'showRecentQuizzes', label: t('dashboard.recentQuizzes') },
              { key: 'showMyStats', label: t('dashboard.myStats') },
              { key: 'showForumFeed', label: t('nav.forum') }
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-light-grey">
                <div className="text-sm font-medium">{item.label}</div>
                <Switch
                  checked={Boolean((dashboardPrefs as any)[item.key])}
                  onCheckedChange={(v) => setDashboardPrefs(prev => ({ ...prev, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDashboard(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleDashboardPrefsSave} disabled={loading}>{loading ? t('common.loading') : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}