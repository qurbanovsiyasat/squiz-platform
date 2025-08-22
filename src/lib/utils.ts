import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date helper
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]
  
  const day = d.getDate()
  const month = monthNames[d.getMonth()]
  const year = d.getFullYear()
  
  return `${day} ${month} ${year}`
}

// Format date and time helper
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]
  
  const day = d.getDate()
  const month = monthNames[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

// Format relative time helper
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'İndi'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dəqiqə əvvəl`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat əvvəl`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün əvvəl`
  
  return formatDate(date)
}

// Generate random access code
export function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Truncate text helper
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Validate email helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Calculate quiz score percentage
export function calculateScorePercentage(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

// Get difficulty color
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-100'
    case 'medium': return 'text-yellow-600 bg-yellow-100' 
    case 'hard': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

// Get role color
export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin': return 'text-purple-600 bg-purple-100'
    case 'teacher': return 'text-blue-600 bg-blue-100'
    case 'student': return 'text-green-600 bg-green-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

// Get score color
export function getScoreColor(score: number, maxScore: number = 100): string {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return 'text-green-600 bg-green-100'
  if (percentage >= 60) return 'text-yellow-600 bg-yellow-100'
  if (percentage >= 40) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

// Kullanıcı admin veya super_admin mı?
export function checkUserIsAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}
