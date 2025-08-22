import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStats, useRecentActivity } from '@/hooks/useUserStats'
import { useUserPrivacySettings, useUpdatePrivacySetting } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { User, Mail, Calendar, Edit, Save, X, BookOpen, MessageSquare, Trophy, TrendingUp, Clock, Star, Key, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { data: userStats, isLoading: statsLoading } = useUserStats()
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity()
  const { data: privacySettings, isLoading: privacyLoading } = useUserPrivacySettings()
  const updatePrivacyMutation = useUpdatePrivacySetting()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    bio: '',
    newEmail: '',
    currentPassword: ''
  })
  const [showEmailChange, setShowEmailChange] = useState(false)

  // Update bio from privacy settings when loaded
  useEffect(() => {
    if (privacySettings?.bio !== undefined) {
      setEditData(prev => ({
        ...prev,
        bio: privacySettings.bio || ''
      }))
    }
  }, [privacySettings])

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Giriş Tələb Olunur</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Profil səhifəsini görmək üçün giriş edin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleEmailChange = async () => {
    if (!editData.newEmail || !editData.currentPassword) {
      toast.error('Yeni email və cari şifrə tələb olunur')
      return
    }

    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: editData.currentPassword
      })

      if (verifyError) {
        toast.error('Cari şifrə yanlışdır')
        return
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: editData.newEmail
      })

      if (updateError) {
        toast.error('Email yenilənərkən xəta: ' + updateError.message)
      } else {
        toast.success('Email yeniləmə linki yeni ünvana göndərildi. Təsdiqləmə üçün emailinizi yoxlayın.')
        setShowEmailChange(false)
        setEditData(prev => ({ ...prev, newEmail: '', currentPassword: '' }))
      }
    } catch (error) {
      toast.error('Email yenilənərkən xəta baş verdi')
      console.error('Email update error:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Update profile (name)
      if (editData.full_name !== user?.full_name) {
        await updateProfile({
          full_name: editData.full_name
        })
      }
      
      // Update bio separately using privacy settings
      if (editData.bio !== (privacySettings?.bio || '')) {
        await updatePrivacyMutation.mutateAsync({
          bio: editData.bio
        })
      }
      
      setIsEditing(false)
      toast.success('Profil uğurla yeniləndi!')
    } catch (error) {
      toast.error('Profil yenilənərkən xəta baş verdi')
      console.error('Profile update error:', error)
    }
  }

  const handleCancel = () => {
    setEditData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      newEmail: '',
      currentPassword: ''
    })
    setIsEditing(false)
  }

  const getRoleLabel = (role: string) => {
    const roleMap = {
      admin: 'Administrator',
      teacher: 'Müəllim',
      student: 'Tələbə'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const getRoleColor = (role: string) => {
    const colorMap = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      teacher: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      student: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="mobile-profile-container space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="mobile-card">
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
              <CardTitle className="typography-h2 text-center sm:text-left">İstifadəçi Profili</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="w-full sm:w-auto touch-target"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Ləğv et
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Düzəlt
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="mobile-card-content space-y-6">
            {/* Avatar */}
            <div className="mobile-profile-header">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.full_name} 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="typography-h3 text-slate-900 dark:text-white text-break">
                  {user.full_name || 'Ad təyin edilməyib'}
                </h3>
                <p className="mobile-email-display text-slate-600 dark:text-slate-400">{user.email || 'Email not set'}</p>
                <div className="mt-2">
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="mobile-profile-grid">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name" className="typography-body">Ad Soyad</Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={editData.full_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="mt-1 mobile-form-input"
                    />
                  ) : (
                    <p className="mt-1 text-slate-900 dark:text-white font-medium">
                      {user.full_name || 'Ad təyin edilməyib'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">E-poçt</Label>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-900 dark:text-white break-all">{user.email || 'Email not set'}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowEmailChange(true)}
                      className="text-vibrant-blue hover:text-vibrant-blue/80"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Dəyiş
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Rol</Label>
                  <div className="flex items-center mt-1">
                    <User className="h-4 w-4 mr-2 text-slate-400" />
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Qeydiyyat Tarixi</Label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bioqrafiya</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  placeholder="Özünüz haqqında qısa məlumat yazın..."
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  className="mt-1"
                  rows={4}
                  maxLength={500}
                />
              ) : (
                <div className="mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[100px]">
                  {privacyLoading ? (
                    <p className="text-slate-500">Yüklənir...</p>
                  ) : privacySettings?.bio ? (
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                      {privacySettings.bio}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">
                      Bioqrafiya məlumatı yoxdur. Düzəlt düyməsinə basaraq əlavə edin.
                    </p>
                  )}
                </div>
              )}
              {isEditing && (
                <p className="text-xs text-slate-500">
                  {editData.bio.length}/500 simvol
                </p>
              )}
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  Ləğv et
                </Button>
                <Button onClick={handleSave} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Saxla
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statsLoading ? '...' : userStats?.quizzesCreated || 0}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Yaradılan Quizlər</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statsLoading ? '...' : userStats?.quizzesCompleted || 0}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Tamamlanan Quizlər</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {statsLoading ? '...' : userStats?.forumPosts || 0}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Forum Yazıları</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {statsLoading ? '...' : userStats?.averageScore || 0}%
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Ortalama Bal</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Son Fəaliyyətlər</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Fəaliyyətlər yüklənir...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Quizzes */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Son Quizlər</h4>
                  <div className="space-y-2">
                    {recentActivity?.quizzes?.slice(0, 3).map((quiz) => (
                      <div key={quiz.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                        <p className="font-medium truncate">{quiz.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {formatDate(quiz.created_at)}
                        </p>
                      </div>
                    )) || <p className="text-slate-500 text-sm">Quiz yoxdur</p>}
                  </div>
                </div>

                {/* Recent Forum Posts */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Son Forum Yazıları</h4>
                  <div className="space-y-2">
                    {recentActivity?.forumPosts?.slice(0, 3).map((post) => (
                      <div key={post.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                        <p className="font-medium truncate">{post.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    )) || <p className="text-slate-500 text-sm">Forum yazısı yoxdur</p>}
                  </div>
                </div>

                {/* Recent Quiz Attempts */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Son Quiz Cəhdləri</h4>
                  <div className="space-y-2">
                    {recentActivity?.quizAttempts?.slice(0, 3).map((attempt) => (
                      <div key={attempt.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                        <p className="font-medium truncate">{(attempt as any).quizzes?.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {formatDate(attempt.created_at)}
                        </p>
                      </div>
                    )) || <p className="text-slate-500 text-sm">Quiz cəhdi yoxdur</p>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Change Dialog */}
      <Dialog open={showEmailChange} onOpenChange={setShowEmailChange}>
        <DialogContent className="mobile-form-container sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 typography-h3">
              <Mail className="h-5 w-5" />
              <span>Email Ünvanını Dəyiş</span>
            </DialogTitle>
            <DialogDescription className="typography-body">
              Email ünvanınızı dəyişmək üçün yeni email və cari şifrənizi daxil edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="mobile-form-field space-y-2">
              <Label htmlFor="newEmail" className="typography-body">Yeni Email</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="yeni@email.com"
                value={editData.newEmail}
                onChange={(e) => setEditData(prev => ({ ...prev, newEmail: e.target.value }))}
                className="mobile-form-input"
              />
            </div>
            <div className="mobile-form-field space-y-2">
              <Label htmlFor="currentPassword" className="typography-body">Cari Şifrə</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Cari şifrənizi daxil edin"
                value={editData.currentPassword}
                onChange={(e) => setEditData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="mobile-form-input"
              />
            </div>
          </div>
          <DialogFooter className="mobile-form-actions">
            <Button variant="outline" onClick={() => setShowEmailChange(false)} className="touch-target">
              Ləğv et
            </Button>
            <Button onClick={handleEmailChange} disabled={!editData.newEmail || !editData.currentPassword} className="touch-target">
              <Shield className="h-4 w-4 mr-2" />
              Email-i Dəyiş
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}