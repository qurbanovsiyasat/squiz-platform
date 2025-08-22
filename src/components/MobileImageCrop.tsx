import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Upload, Crop, Download, Trash2, RotateCw, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MobileImageCropProps {
  onImageUploaded?: (imageUrl: string) => void
  onImageRemoved?: () => void
  existingImageUrl?: string
  maxSizeInMB?: number
  aspectRatio?: number
  cropWidth?: number
  cropHeight?: number
  allowCrop?: boolean
  className?: string
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface TouchPoint {
  x: number
  y: number
}

export default function MobileImageCrop({
  onImageUploaded,
  onImageRemoved,
  existingImageUrl,
  maxSizeInMB = 5,
  aspectRatio = 16 / 9,
  cropWidth = 400,
  cropHeight = 300,
  allowCrop = true,
  className
}: MobileImageCropProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(existingImageUrl || null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastTouch, setLastTouch] = useState<TouchPoint | null>(null)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)

  // Handle file selection with enhanced validation
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WebP)')
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
      setSelectedImage(imageSrc)
      
      if (allowCrop) {
        setShowCropModal(true)
        setZoom(1)
        setRotation(0)
      } else {
        uploadImage(imageSrc)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }, [maxSizeInMB, allowCrop])

  // Handle image load in crop modal
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return
    
    const img = imageRef.current
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    
    // Initialize crop area in center
    const containerRect = cropContainerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const centerX = containerRect.width / 2 - cropWidth / 4
      const centerY = containerRect.height / 2 - cropHeight / 4
      setCropArea({
        x: Math.max(0, centerX),
        y: Math.max(0, centerY),
        width: cropWidth / 2,
        height: cropHeight / 2
      })
    }
  }, [cropWidth, cropHeight])

  // Touch handlers for mobile cropping
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setLastTouch({ x: touch.clientX, y: touch.clientY })
      setIsDragging(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDragging || !lastTouch || e.touches.length !== 1) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - lastTouch.x
    const deltaY = touch.clientY - lastTouch.y
    
    setCropArea(prev => {
      const containerRect = cropContainerRef.current?.getBoundingClientRect()
      if (!containerRect) return prev
      
      const newX = Math.max(0, Math.min(containerRect.width - prev.width, prev.x + deltaX))
      const newY = Math.max(0, Math.min(containerRect.height - prev.height, prev.y + deltaY))
      
      return { ...prev, x: newX, y: newY }
    })
    
    setLastTouch({ x: touch.clientX, y: touch.clientY })
  }, [isDragging, lastTouch])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setLastTouch(null)
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(3, prev + 0.2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.5, prev - 0.2))
  }, [])

  // Rotation control
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  // Crop and upload image
  const cropImage = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    if (!ctx) return

    setIsProcessing(true)
    
    try {
      // Set canvas dimensions
      canvas.width = cropWidth
      canvas.height = cropHeight

      // Clear canvas
      ctx.clearRect(0, 0, cropWidth, cropHeight)

      // Calculate crop area relative to original image
      const containerRect = cropContainerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const scaleX = img.naturalWidth / containerRect.width
      const scaleY = img.naturalHeight / containerRect.height

      const sourceX = cropArea.x * scaleX
      const sourceY = cropArea.y * scaleY
      const sourceWidth = cropArea.width * scaleX
      const sourceHeight = cropArea.height * scaleY

      // Apply transformations
      ctx.save()
      
      // Center the canvas for rotation
      ctx.translate(cropWidth / 2, cropHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom, zoom)
      
      // Draw cropped and transformed image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight
      )
      
      ctx.restore()

      // Get cropped image data
      const croppedImageData = canvas.toDataURL('image/jpeg', 0.85)
      await uploadImage(croppedImageData)
    } catch (error) {
      console.error('Crop error:', error)
      toast.error('Failed to crop image')
    } finally {
      setIsProcessing(false)
    }
  }, [cropArea, cropWidth, cropHeight, rotation, zoom])

  // Upload image function
  const uploadImage = useCallback(async (imageData: string) => {
    try {
      // For now, just return the base64 data
      // In a real app, you'd upload to your storage service
      const uploadedUrl = imageData
      
      setSelectedImage(uploadedUrl)
      onImageUploaded?.(uploadedUrl)
      setShowCropModal(false)
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    }
  }, [onImageUploaded])

  // Remove image
  const removeImage = useCallback(() => {
    setSelectedImage(null)
    onImageRemoved?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.success('Image removed')
  }, [onImageRemoved])

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Image Upload</CardTitle>
            {selectedImage && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                Image Added
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedImage ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center touch-manipulation">
              <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Choose an image file to upload. Max size: {maxSizeInMB}MB
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="touch-manipulation min-h-[44px]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src={selectedImage}
                  alt="Uploaded"
                  className="w-full h-48 object-cover"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Processing...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="touch-manipulation min-h-[44px] flex-1 min-w-[120px]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </Button>
                {allowCrop && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCropModal(true)}
                    disabled={isProcessing}
                    className="touch-manipulation min-h-[44px] flex-1 min-w-[120px]"
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={removeImage}
                  disabled={isProcessing}
                  className="touch-manipulation min-h-[44px] flex-1 min-w-[120px]"
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

      {/* Mobile-Optimized Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 touch-manipulation">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">Edit Image</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCropModal(false)}
                className="touch-manipulation min-h-[44px] min-w-[44px]"
              >
                ×
              </Button>
            </div>
            
            <div className="flex-1 relative overflow-hidden" ref={cropContainerRef}>
              <img
                ref={imageRef}
                src={selectedImage}
                alt="To crop"
                className="w-full h-full object-contain select-none"
                onLoad={handleImageLoad}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              
              {/* Crop overlay */}
              <div
                className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                  pointerEvents: 'none'
                }}
              />
            </div>
            
            {/* Mobile Controls */}
            <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="touch-manipulation min-h-[44px] min-w-[44px]"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="touch-manipulation min-h-[44px] min-w-[44px]"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  className="touch-manipulation min-h-[44px] min-w-[44px]"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 touch-manipulation min-h-[44px]"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={cropImage}
                  disabled={isProcessing}
                  className="flex-1 touch-manipulation min-h-[44px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crop className="h-4 w-4 mr-2" />
                      Apply
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      )}
    </>
  )
}
