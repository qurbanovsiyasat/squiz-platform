import { createClient } from '@supabase/supabase-js'

// Supabase environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bhykzkqlyfcagrnkubnr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWt6a3FseWZjYWdybmt1Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzU1MzYsImV4cCI6MjA2OTU1MTUzNn0.Y8vaK5AJBKhdI5HJx1aBM3zg3tQQ8tNkx4jgwTI10ps'

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  throw new Error('Supabase configuration is incomplete. Check your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Image upload helper function
export async function uploadImage(file: File, folder: string = 'general'): Promise<string> {
  try {
    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('file-upload', {
      body: {
        imageData: base64Data,
        fileName: file.name,
        folder
      }
    })

    if (error) throw error
    return data.data.publicUrl
  } catch (error) {
    console.error('Image upload failed:', error)
    throw new Error(error instanceof Error ? error.message : 'Image upload failed')
  }
}

// Database Types
export interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'teacher' | 'student' | 'super_admin'
  avatar_url?: string
  bio?: string
  is_private?: boolean
  can_create_quiz?: boolean
  settings?: {
    notifications_enabled?: boolean
    email_notifications?: boolean
    theme?: 'light' | 'dark' | 'system'
    language?: string
    preferences?: {
      language?: string
      [key: string]: any
    }
    notifications?: {
      [key: string]: boolean
    }
  }
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  title: string
  description?: string
  creator_id: string
  category_id?: string
  is_public: boolean
  time_limit?: number
  questions: QuizQuestion[]
  attempts_count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  created_at: string
  updated_at: string
  creator?: User
  category?: Category
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: string[]
  correct_answer: string | number
  explanation?: string
  points: number
  order_index: number
}

// Alias for backward compatibility
export type Question = QuizQuestion

export interface QuizResult {
  id: string
  quiz_id: string
  user_id: string
  answers: any[]
  score: number
  total_points: number
  correct_answers: number
  total_questions: number
  completed_at: string
  time_taken?: number
}

export interface Category {
  id: string
  name: string
  type: 'quiz' | 'form' | 'qa'
  description?: string
  created_at: string
  updated_at: string
  item_count?: number
}

export interface Form {
  id: string
  title: string
  description?: string
  creator_id: string
  category_id?: string
  category_name?: string
  is_public: boolean
  fields: FormField[]
  created_at: string
  updated_at: string
  creator?: User
  category?: Category
}

export interface FormField {
  id: string
  form_id: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file'
  label: string
  required: boolean
  options?: string[]
  order_index: number
}

export interface QAQuestion {
  id: string
  title: string
  content: string
  author_id: string
  category_id?: string
  is_answered: boolean
  view_count: number
  like_count: number
  created_at: string
  updated_at: string
  author?: User
  category?: Category
  answers?: QAAnswer[]
}

export interface QAAnswer {
  id: string
  question_id: string
  content: string
  author_id: string
  is_accepted: boolean
  like_count: number
  created_at: string
  updated_at: string
  author?: User
}

// Helper functions for type safety
export const isValidRole = (role: string): role is User['role'] => {
  return ['admin', 'teacher', 'student', 'super_admin'].includes(role)
}

export const isValidCategoryType = (type: string): type is Category['type'] => {
  return ['quiz', 'form', 'qa'].includes(type)
}

export const isValidQuestionType = (type: string): type is QuizQuestion['type'] => {
  return ['multiple_choice', 'true_false', 'short_answer'].includes(type)
}

export const isValidFieldType = (type: string): type is FormField['type'] => {
  return ['text', 'textarea', 'select', 'radio', 'checkbox', 'file'].includes(type)
}
