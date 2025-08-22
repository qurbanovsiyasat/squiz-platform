import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UploadOptions {
  maxSize?: number // in MB
  folder?: string
}

export function useImageUpload(options: UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const { maxSize = 5, folder = 'images' } = options

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return null
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`)
      return null
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 50) // First 50% for reading
          }
        }
        reader.readAsDataURL(file)
      })

      setUploadProgress(50)

      // Generate unique filename
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('image-upload', {
        body: {
          imageData: base64,
          fileName: fileName,
          folder: folder
        }
      })

      setUploadProgress(100)

      if (error) {
        console.error('Upload error:', error)
        throw new Error(error.message || 'Upload failed')
      }

      if (data?.data?.publicUrl) {
        toast.success('Image uploaded successfully')
        return data.data.publicUrl
      } else {
        throw new Error('No URL returned from upload')
      }
    } catch (error: any) {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Failed to upload image')
      return null
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadImage(file))
    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }

  return {
    uploadImage,
    uploadMultipleImages,
    isUploading,
    uploadProgress
  }
}
