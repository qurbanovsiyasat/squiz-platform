import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Download, ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageViewerProps {
  src: string
  alt: string
  title?: string
  className?: string
  showControls?: boolean
  children?: React.ReactNode
}

export function ImageViewer({ 
  src, 
  alt, 
  title, 
  className,
  showControls = true,
  children 
}: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = title || alt || 'image'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenExternal = () => {
    window.open(src, '_blank')
  }

  const resetZoom = () => setZoom(1)
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))

  const trigger = children || (
    <div className={cn(
      "relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200",
      className
    )}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95 border-slate-800">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                {title && (
                  <h3 className="font-medium truncate">{title}</h3>
                )}
                <p className="text-sm text-slate-300">{alt}</p>
              </div>
              
              {showControls && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomOut}
                    disabled={zoom <= 0.25}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetZoom}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomIn}
                    disabled={zoom >= 3}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="bg-black/50 border-slate-600 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div className="relative max-w-full max-h-full overflow-auto">
              <img
                src={src}
                alt={alt}
                className="max-w-none transition-transform duration-200 select-none"
                style={{ 
                  transform: `scale(${zoom})`,
                  maxHeight: zoom === 1 ? '100%' : 'none',
                  maxWidth: zoom === 1 ? '100%' : 'none'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-center text-sm text-slate-300">
              Click and drag to pan • Scroll to zoom • Press ESC to close
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImageViewer