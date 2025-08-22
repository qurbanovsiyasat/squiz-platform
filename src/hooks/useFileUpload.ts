import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface FileUploadItem {
  id: string
  name: string
  type: string
  size: number
  url: string
  isImage: boolean
  uploadProgress?: number
  isPersistent?: boolean // Track if file is saved to database
}

interface UseFileUploadOptions {
  maxFiles?: number
  maxSizeInMB?: number
  acceptedTypes?: string[]
  formId?: string
  persistToDB?: boolean // Whether to save metadata to database
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif', 
  'image/webp',
  'application/pdf'
]

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  
  const {
    maxFiles = 5,
    maxSizeInMB = 30,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    formId,
    persistToDB = true
  } = options

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Supported types: ${acceptedTypes.join(', ')}`
    }
    
    if (file.size > maxSizeInMB * 1024 * 1024) {
      return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${maxSizeInMB}MB limit`
    }
    
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }
    
    return null
  }, [acceptedTypes, maxSizeInMB, maxFiles, files.length])

  // Enhanced upload with better error handling and persistence
  const uploadFile = useCallback(async (file: File, fileId: string): Promise<FileUploadItem> => {
    try {
      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileExtension = file.name.split('.').pop() || 'bin'
      const uniqueFileName = `${timestamp}_${randomId}.${fileExtension}`
      const filePath = user?.id ? `${user.id}/${uniqueFileName}` : `public/${uniqueFileName}`
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 10 }))
      
      // Try multiple buckets for better reliability
      let uploadUrl: string
      let bucketName = 'form-attachments'
      
      try {
        // First try form-attachments bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          // If bucket doesn't exist, try images bucket
          bucketName = 'images'
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (fallbackError) {
            throw new Error(`Upload failed: ${fallbackError.message}`)
          }
          
          uploadUrl = supabase.storage.from(bucketName).getPublicUrl(fallbackData.path).data.publicUrl
        } else {
          uploadUrl = supabase.storage.from(bucketName).getPublicUrl(uploadData.path).data.publicUrl
        }
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 70 }))
        
      } catch (storageError: any) {
        console.error('Storage upload error:', storageError)
        throw new Error(`Upload failed: ${storageError.message}`)
      }

      // Save metadata to database if requested and formId is provided
      let attachmentId = fileId
      let isPersistent = false
      
      if (persistToDB && formId) {
        try {
          const { data: savedAttachment, error: saveError } = await supabase
            .rpc('save_form_attachment', {
              p_form_id: formId,
              p_file_name: uniqueFileName,
              p_original_name: file.name,
              p_mime_type: file.type,
              p_file_size: file.size,
              p_file_path: uploadUrl,
              p_storage_bucket: bucketName
            })
          
          if (saveError) {
            console.error('Failed to save attachment metadata:', saveError)
            // Don't fail upload, but mark as not persistent
            toast.warning(`File uploaded but metadata save failed: ${saveError.message}`)
          } else {
            attachmentId = savedAttachment || fileId
            isPersistent = true
          }
        } catch (error) {
          console.error('Database save error:', error)
          // Don't fail upload, just log
          toast.warning('File uploaded successfully but database save failed')
        }
      }

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))

      // Create file item
      const fileItem: FileUploadItem = {
        id: attachmentId,
        name: file.name,
        type: file.type,
        size: file.size,
        url: uploadUrl,
        isImage: file.type.startsWith('image/'),
        uploadProgress: 100,
        isPersistent
      }

      console.log(`File uploaded successfully: ${file.name} -> ${uploadUrl} (persistent: ${isPersistent})`)
      return fileItem
    } catch (error: any) {
      console.error('File upload error:', error)
      throw new Error(error.message || `Failed to upload ${file.name}`)
    } finally {
      setUploadProgress(prev => {
        const next = { ...prev }
        delete next[fileId]
        return next
      })
    }
  }, [user?.id, formId, persistToDB])

  // Upload multiple files with better error handling
  const uploadFiles = useCallback(async (fileList: FileList | File[]): Promise<FileUploadItem[]> => {
    const filesToUpload = Array.from(fileList)
    const errors: string[] = []
    const validFiles: File[] = []
    
    // Validate all files first
    filesToUpload.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })
    
    if (errors.length > 0) {
      toast.error(`Upload validation failed:\n${errors.join('\n')}`)
      return []
    }
    
    if (validFiles.length === 0) {
      return []
    }
    
    setIsUploading(true)
    const uploadedFiles: FileUploadItem[] = []
    
    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of validFiles) {
        const fileId = `${Date.now()}_${Math.random().toString(36).substring(2)}`
        
        try {
          const uploadedFile = await uploadFile(file, fileId)
          uploadedFiles.push(uploadedFile)
          
          // Update files state progressively for better UX
          setFiles(prev => [...prev, uploadedFile])
          
          toast.success(`${file.name} uploaded successfully ${uploadedFile.isPersistent ? '(saved to database)' : '(storage only)'}`)
        } catch (error: any) {
          console.error(`Failed to upload ${file.name}:`, error)
          toast.error(`Failed to upload ${file.name}: ${error.message}`)
        }
      }
      
      return uploadedFiles
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, uploadFile])

  // Enhanced remove with proper cleanup
  const removeFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    
    try {
      // If file was saved to database, remove from there first
      if (file.isPersistent && formId) {
        try {
          await supabase.rpc('delete_form_attachment', {
            p_attachment_id: fileId
          })
        } catch (dbError: any) {
          console.error('Failed to delete from database:', dbError)
        }
      }
      
      // Try to delete from storage if it's our uploaded file
      if (file.url.includes('supabase.co/storage')) {
        try {
          const pathMatch = file.url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
          if (pathMatch) {
            const bucketName = pathMatch[1]
            const filePath = pathMatch[2]
            
            await supabase.storage
              .from(bucketName)
              .remove([filePath])
          }
        } catch (storageError: any) {
          console.error('Failed to delete from storage:', storageError)
        }
      }
      
      // Remove from state
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('File removed successfully')
    } catch (error: any) {
      console.error('Failed to remove file:', error)
      // Still remove from UI even if storage deletion fails
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('File removed from form (storage cleanup may have failed)')
    }
  }, [files, formId])

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([])
    setUploadProgress({})
  }, [])

  // Enhanced form file loading with better error handling
  const getFormFiles = useCallback(async (formIdParam: string): Promise<FileUploadItem[]> => {
    if (!formIdParam) return []
    
    try {
      const { data, error } = await supabase
        .from('form_attachments')
        .select('*')
        .eq('form_id', formIdParam)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Failed to load form files:', error)
        return []
      }
      
      const formFiles: FileUploadItem[] = (data || []).map(attachment => ({
        id: attachment.id,
        name: attachment.original_name || attachment.file_name,
        type: attachment.mime_type,
        size: attachment.file_size,
        url: attachment.file_path,
        isImage: attachment.is_image || false,
        isPersistent: true
      }))
      
      setFiles(formFiles)
      return formFiles
    } catch (error: any) {
      console.error('Failed to load form files:', error)
      toast.error('Failed to load attached files')
      return []
    }
  }, [])

  return {
    files,
    isUploading,
    uploadProgress,
    uploadFiles,
    removeFile,
    clearFiles,
    getFormFiles,
    validateFile
  }
}