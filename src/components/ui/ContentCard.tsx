import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PrivacyAwareUsername } from '@/components/ui/PrivacyAwareUsername'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, MessageCircle, ThumbsUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface ContentCardProps {
  item: {
    id: string
    title: string
    content?: string
    description?: string
    creator_id?: string
    author_id?: string
    creator_name?: string
    author_name?: string
    creator?: { full_name?: string; is_private?: boolean; role?: string }
    author?: { full_name?: string; is_private?: boolean; role?: string }
    view_count?: number
    views?: number
    submission_count?: number
    votes_score?: number
    image_url?: string
    category_name?: string
    created_at: string
    updated_at?: string
  }
  type: 'form' | 'qa' | 'forum'
  onClick?: () => void
  className?: string
  showImage?: boolean
  maxContentLength?: number
}

export function ContentCard({
  item,
  type,
  onClick,
  className,
  showImage = true,
  maxContentLength = 200
}: ContentCardProps) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Get the user info based on type
  const user = item.creator || item.author || {
    full_name: item.creator_name || item.author_name,
    is_private: false
  }
  
  const userId = item.creator_id || item.author_id
  
  // Get content to display
  const content = item.content || item.description || ''
  const needsTruncation = content.length > maxContentLength
  const displayContent = needsTruncation && !isExpanded 
    ? content.slice(0, maxContentLength) + '...'
    : content
  
  // Get stats based on type
  const viewCount = item.view_count || item.views || 0
  const interactionCount = type === 'form' 
    ? item.submission_count || 0
    : item.votes_score || 0
  
  const interactionLabel = type === 'form' 
    ? t('forms.submissions')
    : type === 'qa' 
      ? t('qa.votes')
      : t('forum.likes')

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const handleReadMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        'mobile-safe w-full',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
              {item.title}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap">
              <PrivacyAwareUsername 
                user={{ ...user, id: userId }}
                className="text-sm text-muted-foreground"
              />
              
              {user.role && (
                <RoleBadge 
                  role={user.role} 
                  size="sm"
                />
              )}
              
              <span className="text-xs text-muted-foreground">
                •
              </span>
              
              <time className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </time>
            </div>
          </div>
          
          {item.category_name && (
            <Badge variant="outline" className="shrink-0">
              {item.category_name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Image Display */}
        {showImage && item.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={item.image_url} 
              alt="Content image"
              className="w-full h-48 object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Content */}
        {content && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </div>
            
            {needsTruncation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReadMoreClick}
                className="mt-2 p-0 h-auto font-medium text-primary hover:text-primary/80 hover:bg-transparent"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    {t('common.showLess', 'Show Less')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    {t('common.readMore', 'Read More')}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{viewCount}</span>
            <span className="hidden sm:inline">{t('common.views')}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {type === 'form' ? (
              <MessageCircle className="h-3 w-3" />
            ) : (
              <ThumbsUp className="h-3 w-3" />
            )}
            <span>{interactionCount}</span>
            <span className="hidden sm:inline">{interactionLabel}</span>
          </div>
          
          {type === 'qa' && (
            <div className="flex items-center gap-1">
              <span className="text-xs">•</span>
              <span>
                {item.votes_score && item.votes_score > 0 ? 'Answered' : 'Unanswered'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized components for different content types
export function FormCard(props: Omit<ContentCardProps, 'type'>) {
  return <ContentCard {...props} type="form" />
}

export function QACard(props: Omit<ContentCardProps, 'type'>) {
  return <ContentCard {...props} type="qa" />
}

export function ForumCard(props: Omit<ContentCardProps, 'type'>) {
  return <ContentCard {...props} type="forum" />
}
