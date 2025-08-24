import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Palette, 
  Eye, 
  EyeOff, 
  Save, 
  Key,
  Moon,
  Sun,
  Monitor,
  Lock,
  Mail,
  Smartphone,
  MessageSquare,
  BookOpen
} from 'lucide-react'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface EmailChangeForm {
  newEmail: string
  verificationToken: string
}

export default function SettingsPage() {
  const { user, updateProfile, loading: authLoading } = useAuth()
  const { currentLanguage, changeLanguage, t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [emailForm, setEmailForm] = useState<EmailChangeForm>({
    newEmail: '',
    verificationToken: ''
  })
  const [emailChangeStep, setEmailChangeStep] = useState<'request' | 'verify'>('request')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // Settings state with proper defaults - Initialize with empty string to avoid undefined errors
  const [isPrivate, setIsPrivate] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [language, setLanguage] = useState(currentLanguage)
  const [userFullName, setUserFullName] = useState('')
  
  // Notification settings
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

  // Update settings when user changes
  useEffect(() => {
    if (user && !authLoading) {
      setIsPrivate(user.is_private || false)
      setTheme(user.settings?.preferences?.theme || 'light')
      setUserFullName(user.full_name || '')
      setNotifications({
        ...defaultNotificationSettings,
        ...(user.settings?.notifications || {})
      })
    }
  }, [user, authLoading])

  // Apply theme changes to document
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

    // Recommend additional password policies
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    // Optional: add suggestions for stronger passwords (uppercase, number, symbol, etc.)

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast.success(t('settings.passwordChanged'))
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Password change error:', error)
      // Avoid leaking detailed error messages to user
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Password change error:', error)
      }
      toast.error('Şifrə dəyişdirilərkən xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  const handlePrivacyToggle = async (value: boolean) => {
    setLoading(true)
    try {
      await updateProfile({ is_private: value })
      setIsPrivate(value)
      toast.success(value ? 'Profil gizli edildi' : 'Profil açıq edildi')
    } catch (error: any) {
      console.error('Privacy update error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Privacy update error:', error)
      }
      toast.error('Məxfilik ayarı yenilənərkən xəta baş verdi')
      setIsPrivate(!value) // Revert on error
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
        preferences: {
          ...currentPreferences,
          theme: newTheme
        }
      }
      
      await updateProfile({ settings: newSettings })
      setTheme(newTheme)
      toast.success(`Tema ${newTheme === 'light' ? 'açıq' : newTheme === 'dark' ? 'tünd' : 'sistem'} olaraq dəyişdirildi`)
    } catch (error: any) {
      console.error('Theme update error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Theme update error:', error)
      }
      toast.error('Tema dəyişdirilərkən xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageChange = async (newLanguage: string) => {
    setLoading(true)
    try {
      // Update language context
      changeLanguage(newLanguage)
      setLanguage(newLanguage)
      
      // Update user preferences in database
      const currentSettings = user?.settings || {}
      const currentPreferences = currentSettings.preferences || {}
      
      const newSettings = {
        ...currentSettings,
        preferences: {
          ...currentPreferences,
          language: newLanguage
        }
      }
      
      await updateProfile({ settings: newSettings })
      toast.success(`Dil ${newLanguage === 'az' ? 'Azərbaycan' : 'İngilis'} olaraq dəyişdirildi`)
    } catch (error: any) {
      console.error('Language update error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Language update error:', error)
      }
      toast.error('Dil dəyişdirilərkən xəta baş verdi')
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
      toast.success('Bildiriş ayarları yeniləndi')
    } catch (error: any) {
      console.error('Notification update error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Notification update error:', error)
      }
      toast.error('Bildiriş ayarları yenilənərkən xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailForm.newEmail) {
      toast.error('Please enter a new email address')
      return
    }

    if (emailForm.newEmail === user?.email) {
      toast.error('New email must be different from current email')
      return
    }

    setLoading(true)
    try {
      const response = await supabase.functions.invoke('secure-email-change', {
        body: {
          action: 'request',
          new_email: emailForm.newEmail
        }
      })

      if (response.error) {
        throw response.error
      }

      const result = response.data
      if (result.success) {
        toast.success('Verification email sent! Check your inbox.')
        setEmailChangeStep('verify')
        // SECURITY: Never expose tokens in production (do not log or toast!)
        // Only display for development if needed, and ensure NODE_ENV! 
        if (process.env.NODE_ENV === 'development' && result.verification_token) {
          // eslint-disable-next-line no-console
          // DEV ONLY: Log verification token for development purposes
          toast.success(`Dev mode: Token is ${result.verification_token}`)
        }
      } else {
        toast.error(result.error || 'Failed to send verification email')
      }
    } catch (error: any) {
      console.error('Email change request error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Email change request error:', error)
      }
      toast.error('Failed to request email change')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailForm.verificationToken) {
      toast.error('Please enter the verification token')
      return
    }

    setLoading(true)
    try {
      const response = await supabase.functions.invoke('secure-email-change', {
        body: {
          action: 'verify',
          verification_token: emailForm.verificationToken
        }
      })

      if (response.error) {
        throw response.error
      }

      const result = response.data
      if (result.success) {
        toast.success('Email address changed successfully!')
        setIsChangingEmail(false)
        setEmailChangeStep('request')
        setEmailForm({ newEmail: '', verificationToken: '' })
        // Refresh user data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to verify email change')
      }
    } catch (error: any) {
      console.error('Email change verification error:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Email change verification error:', error)
      }
      toast.error('Failed to verify email change')
    } finally {
      setLoading(false)
    }
  }

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light': return <Sun className="h-4 w-4" />
      case 'dark': return <Moon className="h-4 w-4" />
      case 'system': return <Monitor className="h-4 w-4" />
      default: return <Sun className="h-4 w-4" />
    }
  }

  // Show loading state while auth is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-soft-grey flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-soft-grey p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-design-system flex items-center justify-center">
              <Settings className="h-6 w-6 text-pure-white" />
            </div>
            <div>
              <h1 className="text-page-title">{t('settings.settings')}</h1>
              <p className="text-body">{t('settings.general')}</p>
            </div>
          </div>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-fit">
              <TabsTrigger value="account" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('profile.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.privacy')}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.notifications')}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.theme')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              {/* Profile Information */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-section-title">
                    <User className="h-5 w-5" />
                    <span>{t('profile.profile')}</span>
                  </CardTitle>
                  <CardDescription>{t('profile.editProfile')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-ui-label">{t('auth.email')}</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="input-modern flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingEmail(!isChangingEmail)}
                        className="shrink-0"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Change Email
                      </Button>
                    </div>
                    {!isChangingEmail && (
                      <p className="text-caption text-medium-grey">Email address can be changed securely below</p>
                    )}
                  </div>
                  
                  {/* Email Change Section */}
                  {isChangingEmail && (
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-section-title flex items-center space-x-2">
                          <Mail className="h-5 w-5" />
                          <span>Change Email Address</span>
                        </CardTitle>
                        <CardDescription>
                          {emailChangeStep === 'request' 
                            ? 'Enter your new email address. A verification link will be sent to confirm the change.'
                            : 'Enter the verification token sent to your new email address.'
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {emailChangeStep === 'request' ? (
                          <form onSubmit={handleEmailChangeRequest} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-email" className="text-ui-label">New Email Address</Label>
                              <Input
                                id="new-email"
                                type="email"
                                value={emailForm.newEmail}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                                placeholder="Enter new email address"
                                className="input-modern"
                                required
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Sending...' : 'Send Verification'}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsChangingEmail(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={handleEmailChangeVerify} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="verification-token" className="text-ui-label">Verification Token</Label>
                              <Input
                                id="verification-token"
                                type="text"
                                value={emailForm.verificationToken}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, verificationToken: e.target.value }))}
                                placeholder="Enter verification token"
                                className="input-modern font-mono"
                                required
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Verifying...' : 'Verify & Change Email'}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setEmailChangeStep('request')}
                              >
                                Back
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsChangingEmail(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-ui-label">{t('auth.fullName')}</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="name"
                        type="text"
                        value={userFullName}
                        onChange={e => setUserFullName(e.target.value)}
                        placeholder={t('auth.fullName')}
                        className="input-modern flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (userFullName !== user?.full_name) {
                            try {
                              await updateProfile({ full_name: userFullName })
                              toast.success('Name updated successfully')
                            } catch (error: any) {
                              toast.error('Failed to update name')
                            }
                          }
                        }}
                        disabled={userFullName === user?.full_name || loading}
                        className="shrink-0"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-ui-label">{t('admin.userRole')}</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {user?.role === 'admin' ? t('admin.admin') :
                         user?.role === 'teacher' ? t('admin.teacher') : t('admin.student')}
                      </Badge>
                      <span className="text-caption text-medium-grey">{t('settings.roleSetByAdmin')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-section-title">
                    <Key className="h-5 w-5" />
                    <span>{t('settings.changePassword')}</span>
                  </CardTitle>
                  <CardDescription>{t('settings.strongPasswordDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-ui-label">{t('settings.currentPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="input-modern pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-ui-label">{t('settings.newPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="input-modern pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-ui-label">{t('settings.confirmPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="input-modern pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <Button type="submit" disabled={loading} className="btn-primary">
                      {loading ? t('common.loading') : t('settings.changePassword')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-section-title">
                    <Shield className="h-5 w-5" />
                    <span>{t('settings.privacy')}</span>
                  </CardTitle>
                  <CardDescription>{t('settings.manageProfileVisibility')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-light-grey rounded-design-system">
                    <div className="flex items-center space-x-3">
                      <Lock className="h-5 w-5 text-medium-grey" />
                      <div>
                        <Label className="text-ui-label text-dark-charcoal">{t('settings.privateProfile')}</Label>
                        <p className="text-caption text-medium-grey mt-1">
                          {t('settings.showAsAbituriyent')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isPrivate}
                      onCheckedChange={handlePrivacyToggle}
                      disabled={loading}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-section-title">
                    <Bell className="h-5 w-5" />
                    <span>{t('settings.notifications')}</span>
                  </CardTitle>
                  <CardDescription>{t('settings.manageNotifications')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'email', icon: Mail, label: t('settings.emailNotifications'), desc: t('settings.emailNotificationsDesc') },
                    { key: 'push', icon: Smartphone, label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc') },
                    { key: 'forum', icon: MessageSquare, label: t('settings.forumNotifications'), desc: t('settings.forumNotificationsDesc') },
                    { key: 'quiz', icon: BookOpen, label: t('settings.quizNotifications'), desc: t('settings.quizNotificationsDesc') }
                  ].map(({ key, icon: Icon, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-light-grey rounded-design-system">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-medium-grey" />
                        <div>
                          <Label className="text-ui-label text-dark-charcoal">{label}</Label>
                          <p className="text-caption text-medium-grey mt-1">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(value) => handleNotificationUpdate(key, value)}
                        disabled={loading}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-section-title">
                    <Palette className="h-5 w-5" />
                    <span>{t('settings.theme')}</span>
                  </CardTitle>
                  <CardDescription>Tətbiqin görünüşünü özelleştirin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-3">
                    <Label className="text-ui-label">{t('settings.theme')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: t('settings.lightTheme'), icon: Sun },
                        { value: 'dark', label: t('settings.darkTheme'), icon: Moon },
                        { value: 'system', label: t('settings.systemTheme'), icon: Monitor }
                      ].map(({ value, label, icon: Icon }) => (
                        <Button
                          key={value}
                          variant={theme === value ? 'default' : 'outline'}
                          className={`h-20 flex flex-col space-y-2 ${theme === value ? 'bg-vibrant-blue text-pure-white' : ''}`}
                          onClick={() => handleThemeChange(value as any)}
                          disabled={loading}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-ui-label">{label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Language Selection */}
                  <div className="space-y-3">
                    <Label className="text-ui-label">{t('settings.language')}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="az">🇦🇿 Azərbaycan dili</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}