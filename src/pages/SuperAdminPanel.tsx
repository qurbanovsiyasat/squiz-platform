import React, { useState } from 'react'
import { useAdmin } from '@/contexts/AdminContext'
import {
  useAllUsers,
  useAssignAdminRole,
  useRemoveAdminRole,
  useDeleteUser,
  useToggleQuizPermission,
  useQuizCategories,
  useCreateCategory,
  useDeleteCategory,
  AdminUser
} from '@/hooks/useAdmin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { RoleBadge, UserDisplay } from '@/components/ui/RoleBadge'
import { Search, UserPlus, Shield, Crown, Trash2, Plus, Users, Settings, ShieldOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function SuperAdminPanel() {
  const { isSuperAdmin, isAdmin } = useAdmin()
  const [searchTerm, setSearchTerm] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)

  // Data fetching
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useAllUsers()
  const { data: categories = [], refetch: refetchCategories } = useQuizCategories()

  // Mutations
  const assignAdminMutation = useAssignAdminRole()
  const removeAdminMutation = useRemoveAdminRole()
  const deleteUserMutation = useDeleteUser()
  const toggleQuizPermissionMutation = useToggleQuizPermission()
  const createCategoryMutation = useCreateCategory()
  const deleteCategoryMutation = useDeleteCategory()

  // Access control is handled at route level (isSuperAdmin)

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignAdmin = async (userId: string) => {
    try {
      await assignAdminMutation.mutateAsync(userId)
      refetchUsers()
      toast.success('Admin rolu verildi')
    } catch {}
  }

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await removeAdminMutation.mutateAsync(userId)
      refetchUsers()
      toast.success('Admin rolu silindi')
    } catch {}
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId)
      refetchUsers()
      toast.success('İstifadəçi silindi')
    } catch {}
  }

  const handleToggleQuizPermission = async (userId: string, canCreate: boolean) => {
    try {
      await toggleQuizPermissionMutation.mutateAsync({ userId, canCreate })
      refetchUsers()
      toast.success('Quiz yaratma icazəsi yeniləndi')
    } catch {}
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Kateqoriya adı tələb olunur')
      return
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined
      })
      setNewCategoryName('')
      setNewCategoryDescription('')
      setIsCreateCategoryOpen(false)
      refetchCategories()
      toast.success('Kateqoriya yaradıldı')
    } catch {}
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(categoryId)
      refetchCategories()
      toast.success('Kateqoriya silindi')
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            İstifadəçiləri, rolları və sistem ayarlarını idarə edin
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isSuperAdmin && (
            <Badge className="bg-purple-600 text-white">
              <Crown className="h-3 w-3 mr-1" /> Super Admin
            </Badge>
          )}
          {isAdmin && !isSuperAdmin && (
            <Badge className="bg-blue-600 text-white">
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* User Management - LIST STYLE for mobile & desktop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>İstifadəçi İdarəetməsi</span>
          </CardTitle>
          <CardDescription>İstifadəçi rolları və icazələri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Ad və ya email ilə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Users list as cards */}
          {usersLoading ? (
            <div className="p-6 text-center text-slate-500">Yüklənir...</div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between sm:justify-start flex-wrap gap-3">
                      {/* User + Role */}
                      <div className="flex items-center gap-3 min-w-0">
                        <UserDisplay user={user as any} />
                        <RoleBadge role={(user as any).role} isSuperAdmin={user.is_super_admin} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Make/Remove Admin */}
                        {!user.is_super_admin && (
                          user.is_admin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAdmin(user.id)}
                              disabled={removeAdminMutation.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />Admini sil
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignAdmin(user.id)}
                              disabled={assignAdminMutation.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2" />Admin et
                            </Button>
                          )
                        )}

                        {/* Quiz creation toggle (disabled for admins) */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.can_create_quiz}
                            onCheckedChange={(val) => handleToggleQuizPermission(user.id, val)}
                            disabled={user.is_super_admin || user.is_admin}
                          />
                          <span className="text-sm">Quiz Creation</span>
                        </div>

                        {/* Delete user (confirmation) */}
                        {!user.is_super_admin && (
                          <AlertDialog>
                            <AlertDialogTrigger>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />Sil
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>İstifadəçini sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.full_name || user.email} istifadəçisini həmişəlik silmək istədiyinizə əminsiniz?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-2 text-xs text-slate-500">Qoşuldu: {formatDate(user.created_at)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">İstifadəçi tapılmadı</div>
          )}
        </CardContent>
      </Card>

      {/* Category Management - Super Admin Only */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Kateqoriya idarəetməsi</span>
              </div>
              <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogTrigger>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Kateqoriya əlavə et
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni kateqoriya</DialogTitle>
                    <DialogDescription>Quiz və formalar üçün kateqoriya əlavə edin</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ad</label>
                      <Input placeholder="Kateqoriya adı" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Təsvir (opsional)</label>
                      <Textarea placeholder="Kateqoriya təsviri" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>Bağla</Button>
                      <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>Yarat</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>Quiz və forma kateqoriyaları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 dark:text-white">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 ml-2">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Kateqoriyanı sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{category.name}" kateqoriyasını silmək istədiyinizə əminsiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-red-600 hover:bg-red-700">
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}