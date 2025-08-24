import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
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
      setTheme(user.settings?.preferences?.theme || (user.settings?.theme as any) || 'light')
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
    if (passwordForm.newPassword.length &lt; 8) {
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

  const getThemeLabel = (v: string) => v === 'light' ? t('settings.lightTheme') : v === 'dark' ? t('settings.darkTheme') : t('settings.systemTheme')

  // Loading state
  if (authLoading || !user) {
    return (
      &lt;div className="min-h-screen bg-soft-grey flex items-center justify-center"&gt;
        &lt;div className="text-center"&gt;
          &lt;div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"&gt;&lt;/div&gt;
          &lt;p className="text-slate-600 dark:text-slate-400"&gt;{t('common.loading')}&lt;/p&gt;
        &lt;/div&gt;
      &lt;/div&gt;
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
  }) =&gt; (
    &lt;button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl border border-light-grey transition-colors text-left"
    &gt;
      &lt;div className="flex items-center space-x-3"&gt;
        &lt;div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center"&gt;
          &lt;Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" /&gt;
        &lt;/div&gt;
        &lt;div&gt;
          &lt;div className="text-sm font-medium text-dark-charcoal dark:text-white"&gt;{title}&lt;/div&gt;
          {description &amp;&amp; (
            &lt;div className="text-xs text-medium-grey mt-0.5"&gt;{description}&lt;/div&gt;
          )}
        &lt;/div&gt;
      &lt;/div&gt;
      &lt;div className="flex items-center space-x-2"&gt;
        {right}
        &lt;ChevronRight className="h-4 w-4 text-medium-grey" /&gt;
      &lt;/div&gt;
    &lt;/button&gt;
  )

  return (
    &lt;div className="min-h-screen bg-soft-grey p-4 sm:p-6 lg:p-8"&gt;
      &lt;div className="max-w-3xl mx-auto space-y-8"&gt;
        {/* Header */}
        &lt;motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}&gt;
          &lt;div className="flex items-center space-x-4 mb-2"&gt;
            &lt;div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-design-system flex items-center justify-center"&gt;
              &lt;SettingsIcon className="h-6 w-6 text-pure-white" /&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;h1 className="text-page-title"&gt;{t('settings.settings')}&lt;/h1&gt;
              &lt;p className="text-body"&gt;{t('settings.general')}&lt;/p&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/motion.div&gt;

        {/* ACCOUNT */}
        &lt;Card className="card-modern"&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle className="text-section-title"&gt;HESAB&lt;/CardTitle&gt;
            &lt;CardDescription&gt;{t('profile.profile')}&lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="space-y-3"&gt;
            &lt;SettingsRow
              icon={User}
              title={t('profile.profile')}
              description={t('profile.editProfile')}
              right={
                &lt;Badge variant="outline" className="capitalize"&gt;
                  {user?.role === 'admin' ? t('admin.admin') :
                   user?.role === 'teacher' ? t('admin.teacher') : t('admin.student')}
                &lt;/Badge&gt;
              }
              onClick={() =&gt; (window.location.href = `/profile/${user.id}`)}
            /&gt;

            &lt;SettingsRow
              icon={Shield}
              title={t('settings.changePassword')}
              description={t('settings.strongPasswordDesc')}
              onClick={() =&gt; setOpenPassword(true)}
            /&gt;

            &lt;div className="flex items-center justify-between p-4 rounded-xl border border-light-grey"&gt;
              &lt;div className="flex items-center space-x-3"&gt;
                &lt;div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center"&gt;
                  &lt;Lock className="h-5 w-5 text-slate-600 dark:text-slate-300" /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;div className="text-sm font-medium text-dark-charcoal dark:text-white"&gt;{t('settings.privateProfile')}&lt;/div&gt;
                  &lt;div className="text-xs text-medium-grey mt-0.5"&gt;{t('settings.manageProfileVisibility')}&lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;Switch checked={isPrivate} onCheckedChange={handlePrivacyToggle} disabled={loading} /&gt;
            &lt;/div&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {/* PREFERENCES */}
        &lt;Card className="card-modern"&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle className="text-section-title"&gt;TƏRCİHLƏR&lt;/CardTitle&gt;
            &lt;CardDescription&gt;{t('settings.manageNotifications')}&lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="space-y-3"&gt;
            &lt;SettingsRow
              icon={Bell}
              title={t('settings.notifications')}
              description={t('settings.manageNotifications')}
              onClick={() =&gt; setOpenNotifications(true)}
              right={
                &lt;div className="text-xs text-medium-grey"&gt;
                  {Object.values(notifications).filter(Boolean).length} / {Object.keys(notifications).length}
                &lt;/div&gt;
              }
            /&gt;

            &lt;SettingsRow
              icon={Palette}
              title={t('settings.theme')}
              description={t('settings.theme')}
              onClick={() =&gt; setOpenTheme(true)}
              right={
                &lt;div className="flex items-center space-x-2 text-xs text-medium-grey"&gt;
                  {theme === 'light' &amp;&amp; &lt;Sun className="h-4 w-4" /&gt;}
                  {theme === 'dark' &amp;&amp; &lt;Moon className="h-4 w-4" /&gt;}
                  {theme === 'system' &amp;&amp; &lt;Monitor className="h-4 w-4" /&gt;}
                  &lt;span&gt;{getThemeLabel(theme)}&lt;/span&gt;
                &lt;/div&gt;
              }
            /&gt;

            &lt;SettingsRow
              icon={LayoutGrid}
              title={t('settings.dashboardSettings')}
              description={t('settings.dashboardSettingsDesc')}
              onClick={() =&gt; setOpenDashboard(true)}
            /&gt;

            &lt;SettingsRow
              icon={Globe}
              title={t('settings.language')}
              description={currentLanguage === 'az' ? 'Azərbaycan' : 'English'}
              onClick={() =&gt; setOpenLanguage(true)}
              right={
                &lt;div className="text-xs text-medium-grey"&gt;{language?.toUpperCase()}&lt;/div&gt;
              }
            /&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {/* GENERAL */}
        &lt;Card className="card-modern"&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle className="text-section-title"&gt;ÜMUMİ&lt;/CardTitle&gt;
            &lt;CardDescription&gt;{t('settings.general')}&lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="space-y-3"&gt;
            &lt;SettingsRow
              icon={Info}
              title="About"
              description="App version, policies"
              onClick={() =&gt; (window.location.href = '/about')}
            /&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {/* Footer */}
        &lt;div className="pt-2"&gt;
          &lt;Button variant="destructive" className="w-full" onClick={() =&gt; signOut()}&gt;
            {t('nav.logout')}
          &lt;/Button&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      {/* Password Dialog */}
      &lt;Dialog open={openPassword} onOpenChange={setOpenPassword}&gt;
        &lt;DialogContent className="sm:max-w-lg"&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle className="flex items-center space-x-2"&gt;
              &lt;Key className="h-5 w-5" /&gt;
              &lt;span&gt;{t('settings.changePassword')}&lt;/span&gt;
            &lt;/DialogTitle&gt;
            &lt;DialogDescription&gt;{t('settings.strongPasswordDesc')}&lt;/DialogDescription&gt;
          &lt;/DialogHeader&gt;
          &lt;form onSubmit={handlePasswordChange} className="space-y-4"&gt;
            &lt;div className="space-y-2"&gt;
              &lt;Label htmlFor="current-password" className="text-ui-label"&gt;{t('settings.currentPassword')}&lt;/Label&gt;
              &lt;Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =&gt; setPasswordForm(prev =&gt; ({ ...prev, currentPassword: e.target.value }))}
                className="input-modern"
              /&gt;
            &lt;/div&gt;
            &lt;div className="space-y-2"&gt;
              &lt;Label htmlFor="new-password" className="text-ui-label"&gt;{t('settings.newPassword')}&lt;/Label&gt;
              &lt;Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =&gt; setPasswordForm(prev =&gt; ({ ...prev, newPassword: e.target.value }))}
                className="input-modern"
              /&gt;
            &lt;/div&gt;
            &lt;div className="space-y-2"&gt;
              &lt;Label htmlFor="confirm-password" className="text-ui-label"&gt;{t('settings.confirmPassword')}&lt;/Label&gt;
              &lt;Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =&gt; setPasswordForm(prev =&gt; ({ ...prev, confirmPassword: e.target.value }))}
                className="input-modern"
              /&gt;
            &lt;/div&gt;
            &lt;DialogFooter&gt;
              &lt;Button type="button" variant="outline" onClick={() =&gt; setOpenPassword(false)}&gt;{t('common.cancel')}&lt;/Button&gt;
              &lt;Button type="submit" disabled={loading}&gt;{loading ? t('common.loading') : t('common.save')}&lt;/Button&gt;
            &lt;/DialogFooter&gt;
          &lt;/form&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;

      {/* Notifications Dialog */}
      &lt;Dialog open={openNotifications} onOpenChange={setOpenNotifications}&gt;
        &lt;DialogContent className="sm:max-w-lg"&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle className="flex items-center space-x-2"&gt;
              &lt;Bell className="h-5 w-5" /&gt;
              &lt;span&gt;{t('settings.notifications')}&lt;/span&gt;
            &lt;/DialogTitle&gt;
            &lt;DialogDescription&gt;{t('settings.manageNotifications')}&lt;/DialogDescription&gt;
          &lt;/DialogHeader&gt;
          &lt;div className="space-y-3"&gt;
            {([
              { key: 'email', label: t('settings.emailNotifications') },
              { key: 'push', label: t('settings.pushNotifications') },
              { key: 'forum', label: t('settings.forumNotifications') },
              { key: 'quiz', label: t('settings.quizNotifications') }
            ] as const).map(item =&gt; (
              &lt;div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-light-grey"&gt;
                &lt;div className="text-sm font-medium"&gt;{item.label}&lt;/div&gt;
                &lt;Switch
                  checked={Boolean(notifications[item.key as keyof typeof notifications])}
                  onCheckedChange={(v) =&gt; handleNotificationUpdate(item.key, v)}
                  disabled={loading}
                /&gt;
              &lt;/div&gt;
            ))}
          &lt;/div&gt;
          &lt;DialogFooter&gt;
            &lt;Button variant="outline" onClick={() =&gt; setOpenNotifications(false)}&gt;{t('common.close')}&lt;/Button&gt;
          &lt;/DialogFooter&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;

      {/* Theme Dialog */}
      &lt;Dialog open={openTheme} onOpenChange={setOpenTheme}&gt;
        &lt;DialogContent className="sm:max-w-md"&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle className="flex items-center space-x-2"&gt;
              &lt;Palette className="h-5 w-5" /&gt;
              &lt;span&gt;{t('settings.theme')}&lt;/span&gt;
            &lt;/DialogTitle&gt;
          &lt;/DialogHeader&gt;
          &lt;div className="grid grid-cols-3 gap-3"&gt;
            {([
              { value: 'light', icon: Sun, label: t('settings.lightTheme') },
              { value: 'dark', icon: Moon, label: t('settings.darkTheme') },
              { value: 'system', icon: Monitor, label: t('settings.systemTheme') }
            ] as const).map(opt =&gt; (
              &lt;Button
                key={opt.value}
                variant={theme === opt.value ? 'default' : 'outline'}
                className={`h-20 flex flex-col space-y-2 ${theme === opt.value ? 'bg-vibrant-blue text-pure-white' : ''}`}
                onClick={() =&gt; handleThemeChange(opt.value as any)}
                disabled={loading}
              &gt;
                &lt;opt.icon className="h-5 w-5" /&gt;
                &lt;span className="text-ui-label"&gt;{opt.label}&lt;/span&gt;
              &lt;/Button&gt;
            ))}
          &lt;/div&gt;
          &lt;DialogFooter&gt;
            &lt;Button variant="outline" onClick={() =&gt; setOpenTheme(false)}&gt;{t('common.close')}&lt;/Button&gt;
          &lt;/DialogFooter&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;

      {/* Language Dialog */}
      &lt;Dialog open={openLanguage} onOpenChange={setOpenLanguage}&gt;
        &lt;DialogContent className="sm:max-w-md"&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle className="flex items-center space-x-2"&gt;
              &lt;Globe className="h-5 w-5" /&gt;
              &lt;span&gt;{t('settings.language')}&lt;/span&gt;
            &lt;/DialogTitle&gt;
          &lt;/DialogHeader&gt;
          &lt;div className="space-y-3"&gt;
            &lt;Button variant={language === 'az' ? 'default' : 'outline'} className="w-full justify-start" onClick={() =&gt; handleLanguageChange('az')}&gt;
              🇦🇿 Azərbaycan dili
            &lt;/Button&gt;
            &lt;Button variant={language === 'en' ? 'default' : 'outline'} className="w-full justify-start" onClick={() =&gt; handleLanguageChange('en')}&gt;
              🇺🇸 English
            &lt;/Button&gt;
          &lt;/div&gt;
          &lt;DialogFooter&gt;
            &lt;Button variant="outline" onClick={() =&gt; setOpenLanguage(false)}&gt;{t('common.close')}&lt;/Button&gt;
          &lt;/DialogFooter&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;

      {/* Dashboard Settings Dialog */}
      &lt;Dialog open={openDashboard} onOpenChange={setOpenDashboard}&gt;
        &lt;DialogContent className="sm:max-w-lg"&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle className="flex items-center space-x-2"&gt;
              &lt;LayoutGrid className="h-5 w-5" /&gt;
              &lt;span&gt;{t('settings.dashboardSettings')}&lt;/span&gt;
            &lt;/DialogTitle&gt;
            &lt;DialogDescription&gt;{t('settings.dashboardSettingsDesc')}&lt;/DialogDescription&gt;
          &lt;/DialogHeader&gt;
          &lt;div className="space-y-3"&gt;
            {([
              { key: 'showRecentQuizzes', label: t('dashboard.recentQuizzes') },
              { key: 'showMyStats', label: t('dashboard.myStats') },
              { key: 'showForumFeed', label: t('nav.forum') }
            ] as const).map(item =&gt; (
              &lt;div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-light-grey"&gt;
                &lt;div className="text-sm font-medium"&gt;{item.label}&lt;/div&gt;
                &lt;Switch
                  checked={Boolean(dashboardPrefs[item.key as keyof typeof dashboardPrefs])}
                  onCheckedChange={(v) =&gt; setDashboardPrefs(prev =&gt; ({ ...prev, [item.key]: v }))}
                /&gt;
              &lt;/div&gt;
            ))}
          &lt;/div&gt;
          &lt;DialogFooter&gt;
            &lt;Button variant="outline" onClick={() =&gt; setOpenDashboard(false)}&gt;{t('common.cancel')}&lt;/Button&gt;
            &lt;Button onClick={handleDashboardPrefsSave} disabled={loading}&gt;{loading ? t('common.loading') : t('common.save')}&lt;/Button&gt;
          &lt;/DialogFooter&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;
    &lt;/div&gt;
  )
}