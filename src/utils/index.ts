// Utility functions for the application

// Re-export important utilities from lib/utils
export { cn } from '@/lib/utils'

/**
 * Creates a delay for testing purposes
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Handles API errors consistently
 */
export function handleApiError(error: any) {
  console.error('API Error:', error)
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.error?.message) {
    return error.error.message
  }
  
  return 'An unexpected error occurred'
}

/**
 * Checks if the code is running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Safe JSON parse
 */
export function safeJsonParse(str: string, defaultValue: any = null) {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => any {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Get initials from a name
 */
export function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Generate a random ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}