import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useAllUsers, useAssignAdminRole, useRemoveAdminRole, useDeleteUser, useToggleQuizPermission, AdminUser } from '@/hooks/useAdmin'
import { CategoryManager } from '@/components/admin/CategoryManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { RoleBadge, UserDisplay } from '@/components/ui/RoleBadge'
import { Switch } from '@/components/ui/Switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { motion } from 'framer-motion'
import { 
  Users, 
  Shield, 
  Crown, 
  Search, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  Trash2, 
  BookOpen,
  Eye,
  Settings
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export default function AdminPanel() {
  const { user } = useAuth()
  const { isSuperAdmin, isAdmin } = useAdmin()
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  
  const { data: users = [], isLoading } = useAllUsers()
  const assignAdminMutation = useAssignAdminRole()
  const removeAdminMutation = useRemoveAdminRole()
  const deleteUserMutation = useDeleteUser()
  const toggleQuizMutation = useToggleQuizPermission()

  // Filter users based on search term
  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteUser = async () => {
    if (!userToDelete || deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }
    
    await deleteUserMutation.mutateAsync(userToDelete.id)
    setUserToDelete(null)
    setDeleteConfirmText('')
  }

  // Access control is now handled at the route level

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-3 sm:space-x-4 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              {isSuperAdmin ? (
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              ) : (
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 hidden sm:block">
                {isSuperAdmin ? 'Ultimate system control and user management' : 'User management and system oversight'}
              </p>
            </div>
          </div>
          
          {/* Role badge for current user */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Your role:</span>
            <RoleBadge 
              role={user?.role || 'student'} 
              isSuperAdmin={isSuperAdmin}
              size="md"
            />
          </div>
        </motion.div>

        {/* Admin Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:w-fit">
              <TabsTrigger value="users" className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3">
                <Users className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Users</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Content</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3">
                <Settings className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* Search and filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>User Management</span>
                  </CardTitle>
                  <CardDescription>
                    {isSuperAdmin ? 'Manage all users, assign roles, and control permissions' : 'View and manage user information'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                </CardContent>
              </Card>

              {/* Users List */}
              <div className="grid gap-4">
                {isLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredUsers.map((userItem, index) => (
                    <motion.div
                      key={userItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-200">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                            {/* User Avatar and Basic Info */}
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                                {userItem.full_name.charAt(0).toUpperCase()}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                    {userItem.full_name}
                                  </h3>
                                  <RoleBadge 
                                    role={userItem.role} 
                                    isSuperAdmin={userItem.is_super_admin}
                                    size="sm"
                                  />
                                </div>
                                
                                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                  <span className="truncate">{userItem.email}</span>
                                  <span className="text-xs">
                                    Joined {formatDistanceToNow(new Date(userItem.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quiz Permission Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center justify-between sm:justify-start space-x-2">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">
                                    {userItem.can_create_quiz ? 'Can create quizzes' : 'Cannot create quizzes'}
                                  </span>
                                </div>
                                {isSuperAdmin && (
                                  <Switch
                                    checked={userItem.can_create_quiz}
                                    onCheckedChange={(checked) => 
                                      toggleQuizMutation.mutate({ userId: userItem.id, canCreate: checked })
                                    }
                                    disabled={userItem.is_super_admin}
                                  />
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between sm:justify-start space-x-2">
                                {userItem.is_private && (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Private
                                  </Badge>
                                )}
                                
                                {/* Actions dropdown (super admin only) */}
                                {isSuperAdmin && !userItem.is_super_admin && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {!userItem.is_admin ? (
                                        <DropdownMenuItem
                                          onClick={() => assignAdminMutation.mutate(userItem.id)}
                                          className="text-blue-600"
                                        >
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Make Admin
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => removeAdminMutation.mutate(userItem.id)}
                                          className="text-orange-600"
                                        >
                                          <UserX className="h-4 w-4 mr-2" />
                                          Remove Admin
                                        </DropdownMenuItem>
                                      )}
                                      
                                      <DropdownMenuItem
                                        onClick={() => setUserToDelete(userItem)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Content Management Tab */}
            <TabsContent value="content">
              <CategoryManager />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>System settings coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <strong>{userToDelete?.full_name}</strong> and remove all their data from our servers.
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToDelete(null)
              setDeleteConfirmText('')
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteConfirmText !== 'DELETE' || deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
