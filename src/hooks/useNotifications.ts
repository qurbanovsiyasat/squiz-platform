import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message?: string
  data?: any
  is_read: boolean
  created_at: string
}

// Enhanced notifications hook with better error handling
export function useNotifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return []

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.warn('Error fetching notifications:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.warn('Exception fetching notifications:', error)
        return []
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2, // Retry twice on failure
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0

      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        if (error) {
          console.warn('Error fetching unread notification count:', error)
          return 0
        }

        return count || 0
      } catch (error) {
        console.warn('Exception fetching unread notification count:', error)
        return 0
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // More frequent for unread count
    retry: 2,
    staleTime: 5000,
  })
}

export function useMarkNotificationAsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user?.id] })
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  })
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user?.id] })
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  })
}

export function useCreateNotification() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      type, 
      title, 
      message, 
      data,
      targetUserId
    }: { 
      type: string
      title: string
      message?: string
      data?: any
      targetUserId?: string // Allow creating notifications for other users (admin only)
    }) => {
      const recipientId = targetUserId || user?.id
      if (!recipientId) throw new Error('No recipient specified')

      const { data: result, error } = await supabase.rpc('create_notification', {
        p_user_id: recipientId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data
      })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      // Invalidate notifications for all users since we might create for others
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
    },
    onError: (error) => {
      console.error('Error creating notification:', error)
      toast.error('Failed to create notification')
    }
  })
}

// Enhanced real-time notification subscription with better error handling
export function useNotificationSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload)
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user.id] })
          
          // Show toast for new notification
          const notification = payload.new as Notification
          if (notification) {
            toast.info(notification.title, {
              description: notification.message,
              duration: 5000,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh on updates (e.g., mark as read)
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user.id] })
        }
      )
      .subscribe((status, err) => {
        console.log('Notification subscription status:', status)
        
        if (err) {
          console.error('Notification subscription error:', err)
          setIsConnected(false)
          
          // Exponential backoff for reconnection
          if (reconnectAttempts < 5) {
            setTimeout(() => {
              setReconnectAttempts(prev => prev + 1)
            }, Math.pow(2, reconnectAttempts) * 1000)
          }
        } else {
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'SUBSCRIBED') {
            setReconnectAttempts(0)
          }
        }
      })

    return () => {
      console.log('Cleaning up notification subscription')
      supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [user?.id, queryClient, reconnectAttempts])

  return { isConnected, reconnectAttempts }
}

// Utility function to create system notifications
export async function createSystemNotification(
  userId: string,
  title: string,
  message?: string,
  data?: any
) {
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'system',
      p_title: title,
      p_message: message,
      p_data: data || {}
    })

    if (error) {
      console.error('Failed to create system notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception creating system notification:', error)
    return false
  }
}
