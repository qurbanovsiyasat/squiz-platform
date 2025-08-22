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
import { UserPlus, Shield, Crown, Trash2, Plus, Users, Settings, UserCheck, UserX } from 'lucide-react'
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

  // Access control is now handled at the route level

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignAdmin = async (userId: string) => {
    try {
      await assignAdminMutation.mutateAsync(userId)
      refetchUsers()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await removeAdminMutation.mutateAsync(userId)
      refetchUsers()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId)
      refetchUsers()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleToggleQuizPermission = async (userId: string, canCreate: boolean) => {
    try {
      await toggleQuizPermissionMutation.mutateAsync({ userId, canCreate })
      refetchUsers()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required')
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
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(categoryId)
      refetchCategories()
    } catch (error) {
      // Error handled by mutation
    }
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
            Manage users, roles, and system settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isSuperAdmin && (
            <Badge className="bg-purple-600 text-white">
              <Crown className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>
          )}
          {isAdmin && !isSuperAdmin && (
            <Badge className="bg-blue-600 text-white">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Quiz Permission</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    {isSuperAdmin && <th className="text-left p-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 5 : 4} className="p-8 text-center text-slate-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {user.full_name || 'Anonymous'}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            {user.is_super_admin ? (
                              <Badge className="bg-purple-600 text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            ) : user.is_admin ? (
                              <Badge className="bg-blue-600 text-white">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            ) : user.role === 'teacher' ? (
                              <Badge variant="secondary">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Teacher
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <UserX className="h-3 w-3 mr-1" />
                                Student
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={user.can_create_quiz}
                            onCheckedChange={(canCreate) => 
                              handleToggleQuizPermission(user.id, canCreate)
                            }
                            disabled={user.is_super_admin || user.is_admin}
                          />
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {formatDate(user.created_at)}
                        </td>
                        {isSuperAdmin && (
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {!user.is_super_admin && (
                                <>
                                  {user.is_admin ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemoveAdmin(user.id)}
                                      disabled={removeAdminMutation.isPending}
                                    >
                                      Remove Admin
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleAssignAdmin(user.id)}
                                      disabled={assignAdminMutation.isPending}
                                    >
                                      Make Admin
                                    </Button>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger>
  <Button
    size="sm"
    variant="outline"
    className="text-red-600 hover:text-red-700"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to permanently delete {user.full_name || user.email}? 
                                          This will remove all their data including quizzes, forms, and submissions. 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isSuperAdmin ? 5 : 4} className="p-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Management - Super Admin Only */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Category Management</span>
              </div>
              <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogTrigger>
  <Button size="sm">
    <Plus className="h-4 w-4 mr-2" />
    Add Category
  </Button>
</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      Add a new category for quizzes and forms
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                      <Textarea
                        placeholder="Category description"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateCategory}
                        disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                      >
                        Create Category
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Manage quiz and form categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-slate-500 mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger>
  <Button
    size="sm"
    variant="outline"
    className="text-red-600 hover:text-red-700 ml-2"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the "{category.name}" category? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCategory(category.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Category
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
