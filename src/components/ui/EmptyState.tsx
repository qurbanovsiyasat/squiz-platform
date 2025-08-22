import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <Icon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="space-x-2">
          {action.icon && <action.icon className="h-4 w-4" />}
          <span>{action.label}</span>
        </Button>
      )}
    </div>
  )
}

export function EmptyStateCard({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="text-center py-16">
        <Icon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} className="space-x-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            <span>{action.label}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}