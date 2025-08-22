import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useUserSettings } from '@/hooks/useSettings'

interface NotificationBarProps {
  message?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  isDismissible?: boolean
  autoHide?: boolean
  autoHideDuration?: number
  onDismiss?: () => void
  className?: string
  showSettings?: boolean
}

interface SystemNotification {
  id: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: number
  isDismissible: boolean
  autoHide: boolean
  autoHideDuration?: number
}

// Global notification store (simplified)
const notificationStore = {
  notifications: [] as SystemNotification[],
  listeners: new Set<() => void>(),
  
  add(notification: Omit<SystemNotification, 'id' | 'timestamp'>) {
    const newNotification: SystemNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    this.notifications.push(newNotification)
    this.notifyListeners()
    
    if (notification.autoHide) {
      setTimeout(() => {
        this.remove(newNotification.id)
      }, notification.autoHideDuration || 5000)
    }
  },
  
  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyListeners()
  },
  
  clear() {
    this.notifications = []
    this.notifyListeners()
  },
  
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  },
  
  notifyListeners() {
    this.listeners.forEach(listener => listener())
  }
}

// Hook for managing notifications
export function useNotificationBar() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  
  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setNotifications([...notificationStore.notifications])
    })
    
    // Initial sync
    setNotifications([...notificationStore.notifications])
    
    return unsubscribe
  }, [])
  
  const showNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
    notificationStore.add(notification)
  }
  
  const hideNotification = (id: string) => {
    notificationStore.remove(id)
  }
  
  const clearAll = () => {
    notificationStore.clear()
  }
  
  return {
    notifications,
    showNotification,
    hideNotification,
    clearAll
  }
}

// Individual notification bar component
function NotificationBarItem({ 
  notification, 
  onDismiss,
  className,
  showSettings = false
}: {
  notification: SystemNotification
  onDismiss: (id: string) => void
  className?: string
  showSettings?: boolean
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)
  
  // Auto-hide progress animation
  useEffect(() => {
    if (notification.autoHide && notification.autoHideDuration) {
      const startTime = Date.now()
      const duration = notification.autoHideDuration
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
        setProgress(remaining)
        
        if (remaining > 0) {
          requestAnimationFrame(updateProgress)
        }
      }
      
      requestAnimationFrame(updateProgress)
    }
  }, [notification.autoHide, notification.autoHideDuration])
  
  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }
  
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }
  
  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : -20, 
        scale: isVisible ? 1 : 0.95 
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative border rounded-lg p-4 shadow-sm backdrop-blur-sm',
        getStyles(),
        className
      )}
    >
      {/* Progress bar for auto-hide notifications */}
      {notification.autoHide && notification.autoHideDuration && (
        <div className="absolute bottom-0 left-0 h-1 bg-current/20 rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-current/40"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {notification.message}
          </p>
        </div>
        
        <div className="flex-shrink-0 flex space-x-1">
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-current hover:bg-current/10"
              onClick={() => {
                // TODO: Open notification settings
                console.log('Open notification settings')
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          
          {notification.isDismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-current hover:bg-current/10"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Main notification bar container
export default function NotificationBar({ 
  message,
  type = 'info',
  isDismissible = true,
  autoHide = false,
  autoHideDuration = 5000,
  onDismiss,
  className,
  showSettings = true
}: NotificationBarProps) {
  const { notifications, hideNotification } = useNotificationBar()
  const { data: settings } = useUserSettings()
  
  // Check if notifications are enabled in settings
  const notificationsEnabled = settings?.notifications?.email !== false
  
  if (!notificationsEnabled && !message) {
    return null
  }
  
  // Single notification mode
  if (message) {
    const singleNotification: SystemNotification = {
      id: 'single',
      message,
      type,
      isDismissible,
      autoHide,
      autoHideDuration,
      timestamp: Date.now()
    }
    
    return (
      <div className={cn('fixed top-0 left-0 right-0 z-50 p-4', className)}>
        <div className="max-w-4xl mx-auto">
          <NotificationBarItem
            notification={singleNotification}
            onDismiss={() => onDismiss?.()}
            showSettings={showSettings}
          />
        </div>
      </div>
    )
  }
  
  // Multiple notifications mode
  if (notifications.length === 0) {
    return null
  }
  
  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50 p-4', className)}>
      <div className="max-w-4xl mx-auto space-y-2">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <NotificationBarItem
              key={notification.id}
              notification={notification}
              onDismiss={hideNotification}
              showSettings={showSettings}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Utility functions for easy notification creation
export const showNotification = {
  info: (message: string, options: Partial<SystemNotification> = {}) => {
    notificationStore.add({
      message,
      type: 'info',
      isDismissible: true,
      autoHide: true,
      autoHideDuration: 5000,
      ...options
    })
  },
  
  success: (message: string, options: Partial<SystemNotification> = {}) => {
    notificationStore.add({
      message,
      type: 'success',
      isDismissible: true,
      autoHide: true,
      autoHideDuration: 4000,
      ...options
    })
  },
  
  warning: (message: string, options: Partial<SystemNotification> = {}) => {
    notificationStore.add({
      message,
      type: 'warning',
      isDismissible: true,
      autoHide: false, // Warnings should be persistent by default
      ...options
    })
  },
  
  error: (message: string, options: Partial<SystemNotification> = {}) => {
    notificationStore.add({
      message,
      type: 'error',
      isDismissible: true,
      autoHide: false, // Errors should be persistent by default
      ...options
    })
  },
  
  system: (message: string, options: Partial<SystemNotification> = {}) => {
    notificationStore.add({
      message,
      type: 'info',
      isDismissible: false,
      autoHide: false, // System messages should be persistent
      ...options
    })
  }
}
