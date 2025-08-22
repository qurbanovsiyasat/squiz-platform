import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon: LucideIcon
  className?: string
  iconColor?: string
  gradient?: string
  delay?: number
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  className,
  iconColor = 'text-blue-600',
  gradient = 'from-blue-50 to-indigo-50',
  delay = 0
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <Card className={cn(
        'hover:shadow-lg transition-all duration-300 border-light-grey bg-white',
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-medium-grey">{title}</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-dark-charcoal">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {change && (
                  <div className={cn(
                    'flex items-center text-xs font-medium px-2 py-1 rounded-full',
                    change.type === 'increase' 
                      ? 'text-success-green bg-green-50' 
                      : 'text-error-red bg-red-50'
                  )}>
                    {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
                  </div>
                )}
              </div>
            </div>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
              gradient
            )}>
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-24"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        </div>
      </CardContent>
    </Card>
  )
}