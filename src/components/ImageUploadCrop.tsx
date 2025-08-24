import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Slider } from '@/components/ui/slider'
import { Upload, Crop, Download, Trash2, RotateCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import './ImageCropper.css'

// Utility function to create image from canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

// Utility function to get cropped image
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: any,
  rotation = 0
): Promise<string> => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  )

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  return canvas.toDataURL('image/jpeg', 0.8)
}

interface ImageUploadCropProps {
  onImageUploaded?: (imageUrl: string) => void
  onImageRemoved?: () => void
  existingImageUrl?: string
  maxSizeInMB?: number
  aspectRatio?: number
  cropWidth?: number
  cropHeight?: number
  allowCrop?: boolean
  bucketName?: string // Add bucket name prop for flexibility
}

export default function ImageUploadCrop({
  onImageUploaded,
  onImageRemoved,
  existingImageUrl,
  maxSizeInMB = 5,
  aspectRatio = 16 / 9,
  cropWidth = 400,
  cropHeight = 300,
  allowCrop = true,
  bucketName = 'qa-images' // Default to qa-images for consistency
}: ImageUploadCropProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(existingImageUrl || null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [imageLoadError, setImageLoadError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle crop completion
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`Image size must be less than ${maxSizeInMB}MB`)
      return
    }

    // Read file and show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string
      setOriginalImageSrc(imageSrc)
      
      if (allowCrop) {
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setRotation(0)
        setShowCropModal(true)
      } else {
        // Upload directly without cropping
        uploadImage(imageSrc)
      }
    }
    reader.readAsDataURL(file)
  }, [maxSizeInMB, allowCrop])

  // Upload image to Supabase storage
  const uploadImage = useCallback(async (imageData: string) => {
    setIsProcessing(true)
    try {
      // Convert base64 to blob
      const response = await fetch(imageData)
      const blob = await response.blob()
      
      // Generate unique filename
      const fileExt = blob.type.split('/')[1] || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false
        })
      
      if (error) {
        console.error('Upload error:', error)
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path)
      
      const uploadedUrl = urlData.publicUrl
      
      setSelectedImage(uploadedUrl)
      setImageLoadError(false) // Reset error state for new image
      onImageUploaded?.(uploadedUrl)
      toast.success('Image uploaded successfully!')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsProcessing(false)
      setShowCropModal(false)
    }
  }, [onImageUploaded])

  // Crop and upload image
  const handleCropAndUpload = useCallback(async () => {
    if (!originalImageSrc || !croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedImage = await getCroppedImg(
        originalImageSrc,
        croppedAreaPixels,
        rotation
      )
      await uploadImage(croppedImage)
    } catch (error) {
      console.error('Crop error:', error)
      toast.error('Failed to crop image')
      setIsProcessing(false)
    }
  }, [originalImageSrc, croppedAreaPixels, rotation, uploadImage])

  // Remove image
  const removeImage = useCallback(() => {
    setSelectedImage(null)
    setOriginalImageSrc(null)
    setImageLoadError(false) // Reset error state
    onImageRemoved?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onImageRemoved])

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Image Upload</CardTitle>
            {selectedImage && (
              <Badge variant="outline" className="text-green-600">
                Image Added
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedImage ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Choose an image file to upload. Max size: {maxSizeInMB}MB
              </p>
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {!imageLoadError ? (
                  <img
                    src={selectedImage}
                    alt="Uploaded"
                    className="w-full h-48 object-cover"
                    onError={() => {
                      console.error('ImageUploadCrop: Image failed to load:', selectedImage)
                      setImageLoadError(true)
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                      setImageLoadError(false)
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Image failed to load</p>
                      <p className="text-xs text-slate-400 mt-1">Try replacing the image</p>
                    </div>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Processing...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </Button>
                {allowCrop && originalImageSrc && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCropModal(true)}
                    disabled={isProcessing}
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Crop Again
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeImage}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Enhanced Crop Modal with react-easy-crop */}
      {showCropModal && originalImageSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Crop Image</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCropModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
              <Cropper
                image={originalImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                rotation={rotation}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
                restrictPosition={false}
                style={{
                  containerStyle: {
                    backgroundColor: 'transparent',
                    cursor: 'grab'
                  },
                  cropAreaStyle: {
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  },
                  mediaStyle: {
                    objectFit: 'contain',
                    userSelect: 'none'
                  }
                }}
                classes={{
                  containerClassName: 'crop-container',
                  mediaClassName: 'crop-media',
                  cropAreaClassName: 'crop-area'
                }}
              />
              
              {/* Drag Instructions Overlay */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Drag to move • Scroll to zoom
              </div>
            </div>
            
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Zoom</Label>
                    <span className="text-xs text-slate-500">{zoom.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    onValueChange={([value]) => setZoom(value)}
                    min={1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>1x</span>
                    <span>3x</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Rotation</Label>
                    <span className="text-xs text-slate-500">{rotation}°</span>
                  </div>
                  <Slider
                    value={[rotation]}
                    onValueChange={([value]) => setRotation(value)}
                    min={-180}
                    max={180}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>-180°</span>
                    <span>+180°</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded p-3">
                <div className="flex items-center space-x-4">
                  <span>Aspect Ratio: {aspectRatio.toFixed(2)}</span>
                  <span>Output: {cropWidth} × {cropHeight}px</span>
                </div>
                <div className="text-xs">
                  💡 Drag the image or crop area to reposition
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCropModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCropAndUpload}
                  disabled={isProcessing || !croppedAreaPixels}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crop className="h-4 w-4 mr-2" />
                      Crop & Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
