import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// Hook for uploading images to Q&A storage bucket
export function useQAImageUpload() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('User not authenticated')
      
      // Generate unique filename with user ID prefix for security
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${timestamp}.${fileExtension}`
      
      try {
        // Upload file to qa-images bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('qa-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('qa-images')
          .getPublicUrl(fileName)
        
        if (!publicUrl) {
          throw new Error('Failed to get public URL')
        }
        
        return publicUrl
      } catch (error) {
        console.error('Image upload failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success('Image uploaded successfully')
    },
    onError: (error: any) => {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    }
  })
}

// Hook for uploading base64 image data (from cropped images)
export function useQAImageUploadFromBase64() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (base64Data: string): Promise<string> => {
      if (!user) throw new Error('User not authenticated')
      
      try {
        // Convert base64 to blob
        const response = await fetch(base64Data)
        const blob = await response.blob()
        
        // Generate unique filename
        const timestamp = Date.now()
        const fileName = `${user.id}/${timestamp}_cropped.jpg`
        
        // Upload blob to qa-images bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('qa-images')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg'
          })
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('qa-images')
          .getPublicUrl(fileName)
        
        if (!publicUrl) {
          throw new Error('Failed to get public URL')
        }
        
        return publicUrl
      } catch (error) {
        console.error('Image upload failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success('Image uploaded successfully')
    },
    onError: (error: any) => {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    }
  })
}
