import React from 'react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function PageWrapper({ 
  children, 
  title, 
  description,
  className = '' 
}: PageWrapperProps) {
  return (
    <ErrorBoundary>
      <div className={`space-y-8 px-4 sm:px-6 lg:px-8 ${className}`}>
        {children}
      </div>
    </ErrorBoundary>
  )
}