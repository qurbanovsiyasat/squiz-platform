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
import { Search, UserPlus, UserMinus, Trash2, Shield, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'

const AdminPanel: React.FC = () => {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { data: users, isLoading } = useAllUsers()
  const assignAdminMutation = useAssignAdminRole()
  const removeAdminMutation = useRemoveAdminRole()
  const deleteUserMutation = useDeleteUser()
  const toggleQuizPermissionMutation = useToggleQuizPermission()

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('users')

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const filteredUsers = users?.filter(userData => 
    userData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignAdmin = async (userId: string) => {
    try {
      await assignAdminMutation.mutateAsync(userId)
      toast.success('Admin role assigned successfully')
    } catch (error) {
      toast.error('Failed to assign admin role')
    }
  }

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await removeAdminMutation.mutateAsync(userId)
      toast.success('Admin role removed successfully')
    } catch (error) {
      toast.error('Failed to remove admin role')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId)
      toast.success('User deleted successfully')
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleToggleQuizPermission = async (userId: string, currentPermission: boolean) => {
    try {
      await toggleQuizPermissionMutation.mutateAsync({ userId, canCreate: !currentPermission })
      toast.success('Quiz permission updated successfully')
    } catch (error) {
      toast.error('Failed to update quiz permission')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="categories">Category Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-wrap">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredUsers?.map((userData) => (
                    <Card key={userData.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between sm:justify-start space-x-2 flex-wrap gap-y-2">
                          <div className="flex items-center space-x-3">
                            <UserDisplay user={userData} />
                            <RoleBadge role={userData.role} isSuperAdmin={userData.is_super_admin} />
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-start space-x-2 flex-wrap gap-y-2">
                            {userData.role !== 'super_admin' && (
                              <>
                                {userData.role === 'admin' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveAdmin(userData.id)}
                                    disabled={removeAdminMutation.isPending}
                                  >
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Remove Admin
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAssignAdmin(userData.id)}
                                    disabled={assignAdminMutation.isPending}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </Button>
                                )}
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={userData.can_create_quiz}
                                    onCheckedChange={() => 
                                      handleToggleQuizPermission(userData.id, userData.can_create_quiz)
                                    }
                                  />
                                  <span className="text-sm">Quiz Creation</span>
                                </div>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(userData.id)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPanel
