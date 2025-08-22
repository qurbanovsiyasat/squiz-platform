import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Heart, Loader2, Eye } from 'lucide-react'
import { useFormStats, useToggleFormLike } from '@/hooks/useFormLikes'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface FormLikeButtonProps {
  formId: string
  variant?: 'button' | 'icon' | 'compact'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showViewCount?: boolean
  disabled?: boolean
}

export function FormLikeButton({ 
  formId, 
  variant = 'button',
  size = 'default',
  className,
  showViewCount = false,
  disabled = false
}: FormLikeButtonProps) {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useFormStats(formId)
  const toggleLikeMutation = useToggleFormLike()
  
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if used inside a link
    e.stopPropagation() // Prevent event bubbling
    
    if (!user) {
      // Could redirect to login or show login modal
      return
    }
    
    await toggleLikeMutation.mutateAsync(formId)
  }
  
  const isLoading = statsLoading || toggleLikeMutation.isPending
  const isLiked = stats?.user_liked || false
  const likeCount = stats?.total_likes || 0
  const viewCount = stats?.total_views || 0
  
  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleLike}
          disabled={disabled || !user || isLoading}
          className={cn(
            'p-1 h-auto transition-colors',
            isLiked && 'text-red-500 hover:text-red-600',
            !isLiked && 'text-gray-500 hover:text-red-400'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <motion.div
              animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                className={cn(
                  'h-4 w-4 transition-all',
                  isLiked && 'fill-current'
                )}
              />
            </motion.div>
          )}
        </Button>
        <AnimatePresence mode="wait">
          <motion.span 
            key={likeCount}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            {likeCount}
          </motion.span>
        </AnimatePresence>
        
        {showViewCount && (
          <div className="flex items-center space-x-1 ml-3">
            <Eye className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{viewCount}</span>
          </div>
        )}
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleLike}
          disabled={disabled || !user || isLoading}
          className={cn(
            'flex items-center space-x-1 px-2 py-1',
            isLiked && 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100',
            !isLiked && 'text-gray-500 hover:text-red-400'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart 
              className={cn(
                'h-4 w-4 transition-all',
                isLiked && 'fill-current'
              )}
            />
          )}
          <span className="font-medium">{likeCount}</span>
        </Button>
        
        {showViewCount && (
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{viewCount}</span>
          </div>
        )}
      </div>
    )
  }
  
  // Default button variant
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant={isLiked ? "default" : "outline"}
        size={size}
        onClick={handleToggleLike}
        disabled={disabled || !user || isLoading}
        className={cn(
          'flex items-center space-x-2 transition-all',
          isLiked && 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <motion.div
            animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-all',
                isLiked && 'fill-current'
              )}
            />
          </motion.div>
        )}
        <span className="font-medium">
          {isLiked ? 'Liked' : 'Like'} ({likeCount})
        </span>
      </Button>
      
      {showViewCount && (
        <Badge variant="outline" className="flex items-center space-x-1">
          <Eye className="h-3 w-3" />
          <span>{viewCount} views</span>
        </Badge>
      )}
    </div>
  )
}
