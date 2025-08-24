import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// Enhanced Form Types
export interface Form {
  id: string
  title: string
  description?: string
  creator_id: string
  settings: Record<string, any>
  is_public: boolean
  access_code?: string
  view_count: number
  submission_count: number
  created_at: string
  updated_at: string
  creator?: {
    full_name: string
    avatar_url?: string
    is_private?: boolean
  }
  category_name?: string
}

export interface FormField {
  id: string
  form_id: string
  field_type: string
  label: string
  placeholder?: string
  options?: string[]
  is_required: boolean
  order_index: number
  validation_rules: Record<string, any>
  created_at: string
}

export interface FormSubmission {
  id: string
  form_id: string
  submitter_id?: string
  submission_data: Record<string, any>
  submitted_at: string
}

export interface FormReply {
  id: string
  form_id: string
  author_id: string
  content: string
  parent_reply_id?: string
  likes: number
  created_at: string
  updated_at: string
  author?: {
    full_name: string
    avatar_url?: string
    is_private?: boolean
  }
}

export interface FormAttachment {
  id: string
  form_id: string
  user_id: string
  file_name: string
  original_name: string
  mime_type: string
  file_size: number
  file_path: string
  storage_bucket: string
  is_image: boolean
  created_at: string
  updated_at?: string
}

// Form Query Filters
export interface FormFilters {
  category?: string
  isPublic?: boolean
  creatorId?: string
  limit?: number
  offset?: number
}

// Custom Error Class
class FormError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message)
    this.name = 'FormError'
  }
}

// Utility function to handle database errors
const handleDatabaseError = (error: any, operation: string): FormError => {
  console.error(`${operation} error:`, error)
  
  if (error?.code === 'PGRST301') {
    return new FormError('Access denied', 'PERMISSION_DENIED')
  }
  
  if (error?.code === 'PGRST116') {
    return new FormError('Resource not found', 'NOT_FOUND')
  }
  
  if (error?.code === '23505') {
    return new FormError('Resource already exists', 'DUPLICATE')
  }
  
  return new FormError(
    error?.message || `Failed to ${operation.toLowerCase()}`,
    'DATABASE_ERROR',
    error
  )
}

// QUERY HOOKS

/**
 * Get all forms with enhanced privacy-aware data fetching and error handling
 */
export function useForms(filters: FormFilters = {}) {
  return useQuery({
    queryKey: ['forms', filters],
    queryFn: async (): Promise<Form[]> => {
      try {
        // Use the enhanced backend function with privacy support
        const { data: forms, error } = await supabase.rpc('get_forms_with_privacy', {
          p_category_filter: filters.category || null,
          p_limit: filters.limit || 50,
          p_offset: filters.offset || 0
        })
        
        if (error) {
          throw handleDatabaseError(error, 'Fetch forms')
        }
        
        if (!forms || forms.length === 0) {
          return []
        }
        
        // Apply additional client-side filtering if needed
        let filteredData = forms
        
        if (filters.isPublic !== undefined) {
          filteredData = filteredData.filter(form => 
            filters.isPublic ? form.is_public : !form.is_public
          )
        }
        
        if (filters.creatorId) {
          filteredData = filteredData.filter(form => 
            form.creator_id === filters.creatorId
          )
        }
        
        // Map to expected format with privacy-aware names
        return filteredData.map(form => ({
          id: form.id,
          title: form.title,
          description: form.description,
          created_at: form.created_at,
          updated_at: form.updated_at,
          view_count: form.view_count || 0,
          submission_count: form.submission_count || 0,
          creator_id: form.creator_id,
          creator: {
            full_name: form.creator_name || 'Anonymous',
            is_private: false // Backend already handles privacy
          },
          category_name: form.category_name,
          is_public: form.is_public,
          settings: {},
          access_code: undefined
        })) as Form[]
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Fetch forms')
      }
    },
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error instanceof FormError && error.code === 'PERMISSION_DENIED') {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Get single form with fields and replies - enhanced error handling
 */
export function useForm(formId: string) {
  return useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      if (!formId) {
        throw new FormError('Form ID is required', 'INVALID_INPUT')
      }
      
      try {
        // Get form data with creator info
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select(`
            *,
            creator:creator_id (
              full_name,
              avatar_url,
              is_private
            )
          `)
          .eq('id', formId)
          .maybeSingle()
        
        if (formError) {
          throw handleDatabaseError(formError, 'Fetch form')
        }
        
        if (!formData) {
          throw new FormError('Form not found', 'NOT_FOUND')
        }
        
        // Get form fields
        const { data: fields, error: fieldsError } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('order_index', { ascending: true })

        if (fieldsError) {
          console.warn('Form fields error:', fieldsError)
        }

        // Get form replies with authors
        const { data: repliesData, error: repliesError } = await supabase
          .from('form_replies')
          .select(`
            *,
            author:author_id (
              full_name,
              avatar_url,
              is_private
            )
          `)
          .eq('form_id', formId)
          .order('created_at', { ascending: true })

        if (repliesError) {
          console.warn('Form replies error:', repliesError)
        }

        return { 
          id: formData.id,
          title: formData.title,
          description: formData.description,
          creator_id: formData.creator_id,
          settings: formData.settings || {},
          is_public: formData.is_public,
          access_code: formData.access_code,
          view_count: formData.view_count || 0,
          submission_count: formData.submission_count || 0,
          created_at: formData.created_at,
          updated_at: formData.updated_at,
          creator: {
            full_name: formData.creator?.full_name || 'Anonymous',
            avatar_url: formData.creator?.avatar_url,
            is_private: formData.creator?.is_private || false
          },
          fields: (fields || []) as FormField[], 
          replies: (repliesData || []) as FormReply[]
        }
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Fetch form')
      }
    },
    enabled: !!formId,
    retry: (failureCount, error) => {
      if (error instanceof FormError && ['NOT_FOUND', 'PERMISSION_DENIED'].includes(error.code || '')) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get form replies with author information
 */
export function useFormReplies(formId: string) {
  return useQuery({
    queryKey: ['form-replies', formId],
    queryFn: async (): Promise<FormReply[]> => {
      if (!formId) return []
      
      try {
        const { data, error } = await supabase
          .from('form_replies')
          .select(`
            *,
            author:users!form_replies_author_id_fkey(
              full_name,
              avatar_url,
              is_private
            )
          `)
          .eq('form_id', formId)
          .order('created_at', { ascending: true })

        if (error) {
          throw handleDatabaseError(error, 'Fetch form replies')
        }
        
        return data || []
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Fetch form replies')
      }
    },
    enabled: !!formId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// MUTATION HOOKS

/**
 * Create form with enhanced validation and error handling
 */
export function useCreateForm() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: {
      title: string
      description?: string
      category_id?: string | null
      is_public: boolean
      access_code?: string | null
      settings?: Record<string, any>
    }) => {
      if (!user) {
        throw new FormError('User must be authenticated', 'AUTH_REQUIRED')
      }
      
      // Validate input
      if (!formData.title?.trim()) {
        throw new FormError('Form title is required', 'VALIDATION_ERROR')
      }
      
      if (formData.title.length > 200) {
        throw new FormError('Form title is too long (max 200 characters)', 'VALIDATION_ERROR')
      }
      
      if (formData.description && formData.description.length > 1000) {
        throw new FormError('Form description is too long (max 1000 characters)', 'VALIDATION_ERROR')
      }

      const newForm = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        creator_id: user.id,
        category_id: formData.category_id || null,
        is_public: formData.is_public,
        access_code: formData.access_code || null,
        settings: formData.settings || {},
        view_count: 0,
        submission_count: 0
      }

      try {
        const { data, error } = await supabase
          .from('forms')
          .insert([newForm])
          .select()
          .single()

        if (error) {
          throw handleDatabaseError(error, 'Create form')
        }
        
        return data as Form
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Create form')
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      toast.success('Form created successfully')
      return data
    },
    onError: (error: FormError) => {
      console.error('Create form error:', error)
      toast.error(error.message || 'Failed to create form')
    }
  })
}

/**
 * Submit form response with enhanced validation
 */
export function useSubmitForm() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      formId, 
      submissionData 
    }: { 
      formId: string
      submissionData: Record<string, any> 
    }) => {
      if (!formId) {
        throw new FormError('Form ID is required', 'VALIDATION_ERROR')
      }
      
      if (!submissionData || Object.keys(submissionData).length === 0) {
        throw new FormError('Submission data is required', 'VALIDATION_ERROR')
      }

      const newSubmission = {
        form_id: formId,
        submitter_id: user?.id,
        submission_data: submissionData,
        submitted_at: new Date().toISOString(),
      }

      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .insert([newSubmission])
          .select()
          .single()

        if (error) {
          throw handleDatabaseError(error, 'Submit form')
        }
        
        return data as FormSubmission
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Submit form')
      }
    },
    onSuccess: (_, { formId }) => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      toast.success('Form submitted successfully')
    },
    onError: (error: FormError) => {
      console.error('Submit form error:', error)
      toast.error(error.message || 'Failed to submit form')
    }
  })
}

/**
 * Create form reply with validation
 */
export function useCreateFormReply() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      formId, 
      content, 
      parentReplyId 
    }: { 
      formId: string
      content: string
      parentReplyId?: string 
    }) => {
      if (!user) {
        throw new FormError('User must be authenticated', 'AUTH_REQUIRED')
      }
      
      if (!content?.trim()) {
        throw new FormError('Reply content is required', 'VALIDATION_ERROR')
      }
      
      if (content.length > 2000) {
        throw new FormError('Reply is too long (max 2000 characters)', 'VALIDATION_ERROR')
      }

      const newReply = {
        form_id: formId,
        author_id: user.id,
        content: content.trim(),
        parent_reply_id: parentReplyId,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      try {
        const { data, error } = await supabase
          .from('form_replies')
          .insert([newReply])
          .select(`
            *,
            author:users!form_replies_author_id_fkey(
              full_name,
              avatar_url
            )
          `)
          .single()

        if (error) {
          throw handleDatabaseError(error, 'Create reply')
        }
        
        return data as FormReply
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Create reply')
      }
    },
    onSuccess: (_, { formId }) => {
      queryClient.invalidateQueries({ queryKey: ['form-replies', formId] })
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      toast.success('Reply added successfully')
    },
    onError: (error: FormError) => {
      console.error('Reply error:', error)
      toast.error(error.message || 'Failed to add reply')
    }
  })
}

/**
 * Increment form view count with session tracking
 */
export function useIncrementFormViewCount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formId: string) => {
      if (!formId) {
        throw new FormError('Form ID is required', 'VALIDATION_ERROR')
      }
      
      // Check if user has already viewed this form in current session
      const viewedKey = `form_viewed_${formId}`
      const hasViewedInSession = sessionStorage.getItem(viewedKey)
      
      if (hasViewedInSession) {
        // Don't increment if already viewed in this session
        return 0
      }
      
      try {
        const { data, error } = await supabase.rpc('record_form_view', {
          p_form_id: formId
        })
        
        if (error) {
          throw handleDatabaseError(error, 'Record view')
        }
        
        // Mark as viewed in session storage
        sessionStorage.setItem(viewedKey, 'true')
        
        return data || 0
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Record view')
      }
    },
    onSuccess: (_, formId) => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
    onError: (error: FormError) => {
      // Don't show error toast for view tracking failures to avoid spamming user
      console.warn('View count error:', error)
    }
  })
}

/**
 * Get form attachments
 */
export function useFormAttachments(formId: string) {
  return useQuery({
    queryKey: ['form-attachments', formId],
    queryFn: async (): Promise<FormAttachment[]> => {
      if (!formId) return []
      
      try {
        const { data, error } = await supabase
          .from('form_attachments')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false })
        
        if (error) {
          throw handleDatabaseError(error, 'Fetch attachments')
        }
        
        return data || []
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Fetch attachments')
      }
    },
    enabled: !!formId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Upload form attachment with progress tracking
 */
export function useUploadFormAttachment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      formId, 
      file, 
      fileName, 
      originalName 
    }: { 
      formId: string
      file: File
      fileName: string
      originalName: string
    }) => {
      if (!user) {
        throw new FormError('User must be authenticated', 'AUTH_REQUIRED')
      }
      
      // Validate inputs
      if (!formId || !file || !fileName || !originalName) {
        throw new FormError('All parameters are required', 'VALIDATION_ERROR')
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new FormError('File size exceeds 10MB limit', 'FILE_TOO_LARGE')
      }
      
      try {
        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('form-attachments')
          .upload(fileName, file)
        
        if (uploadError) {
          throw handleDatabaseError(uploadError, 'Upload file')
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(fileName)
        
        // Save attachment record to database
        const { data, error } = await supabase.rpc('save_form_attachment', {
          p_form_id: formId,
          p_file_name: fileName,
          p_original_name: originalName,
          p_mime_type: file.type,
          p_file_size: file.size,
          p_file_path: publicUrl,
          p_storage_bucket: 'form-attachments'
        })
        
        if (error) {
          throw handleDatabaseError(error, 'Save attachment record')
        }
        
        return { id: data, fileName, originalName, url: publicUrl }
      } catch (error) {
        if (error instanceof FormError) {
          throw error
        }
        throw handleDatabaseError(error, 'Upload attachment')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-attachments', variables.formId] })
      toast.success('File uploaded successfully')
    },
    onError: (error: FormError) => {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload file')
    }
  })
}

// Get form submissions
export function useFormSubmissions(formId: string) {
  return useQuery({
    queryKey: ['form-submissions', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })
      
      if (error) {
        throw handleDatabaseError(error, 'Fetch form submissions')
      }
      
      return data || []
    },
    enabled: !!formId
  })
}

/**
 * Save attachment to database after form creation
 */
export function useSaveFormAttachments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      formId,
      attachments
    }: {
      formId: string
      attachments: { id: string; name: string; type: string; size: number; url: string; isImage: boolean }[]
    }) => {
      if (!user) {
        throw new FormError('User must be authenticated', 'AUTH_REQUIRED')
      }
      
      if (!formId || !attachments.length) {
        return []
      }
      
      const results = []
      
      for (const attachment of attachments) {
        try {
          // Extract file path from URL for storage path
          const urlParts = attachment.url.split('/')
          const fileName = urlParts[urlParts.length - 1] || attachment.id
          
          const { data, error } = await supabase.rpc('save_form_attachment', {
            p_form_id: formId,
            p_file_name: fileName,
            p_original_name: attachment.name,
            p_mime_type: attachment.type,
            p_file_size: attachment.size,
            p_file_path: attachment.url,
            p_storage_bucket: 'form-attachments'
          })
          
          if (error) {
            throw handleDatabaseError(error, 'Save attachment')
          }
          
          results.push({ id: data, ...attachment })
        } catch (error) {
          // Continue with other files even if one fails
        }
      }
      
      return results
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-attachments', variables.formId] })
      queryClient.invalidateQueries({ queryKey: ['form', variables.formId] })
    },
    onError: (error: FormError) => {
      console.error('Save attachments error:', error)
      toast.error('Some files could not be saved to database')
    }
  })
}

// Export the error class for external use
export { FormError }
