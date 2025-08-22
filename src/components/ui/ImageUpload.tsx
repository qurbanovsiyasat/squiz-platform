import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploadProps {
  value?: string
  onChange: (imageUrl: string | null) => void
  maxSize?: number // in MB
  accept?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  maxSize = 5,
  accept = 'image/*',
  placeholder = 'Click to upload an image or drag and drop',
  className,
  disabled = false
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`)
      return
    }

    setIsUploading(true)
    try {
      // Convert file to base64 for upload
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload via edge function
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase.functions.invoke('image-upload', {
        body: {
          imageData: base64,
          fileName: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        }
      })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(error.message || 'Upload failed')
      }

      if (data?.data?.publicUrl) {
        onChange(data.data.publicUrl)
        toast.success('Image uploaded successfully')
      } else {
        throw new Error('No URL returned from upload')
      }
    } catch (error: any) {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleRemove = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      {value ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-2">
            <div className="relative group">
              <img
                src={value}
                alt="Uploaded image"
                className="w-full h-40 object-cover rounded"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded" />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            'border-2 border-dashed transition-colors duration-200 cursor-pointer',
            isDragOver && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && !isDragOver && 'hover:border-gray-400'
          )}
          onClick={openFileDialog}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading image...
                </p>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {placeholder}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maximum file size: {maxSize}MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  disabled={disabled}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Multiple image upload component
interface MultipleImageUploadProps {
  value?: string[]
  onChange: (imageUrls: string[]) => void
  maxImages?: number
  maxSize?: number
  className?: string
  disabled?: boolean
}

export function MultipleImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  maxSize = 5,
  className,
  disabled = false
}: MultipleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleSingleUpload = (imageUrl: string | null) => {
    if (imageUrl && value.length < maxImages) {
      onChange([...value, imageUrl])
    }
  }

  const handleRemove = (index: number) => {
    const newImages = [...value]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const canAddMore = value.length < maxImages

  return (
    <div className={cn('space-y-4', className)}>
      {/* Existing images */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((imageUrl, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-2">
                <div className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Upload new image */}
      {canAddMore && (
        <ImageUpload
          value={undefined}
          onChange={handleSingleUpload}
          maxSize={maxSize}
          placeholder={`Upload image (${value.length}/${maxImages})`}
          disabled={disabled || isUploading}
        />
      )}
    </div>
  )
}
