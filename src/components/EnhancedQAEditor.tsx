import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VisualMathEditor from '@/components/VisualMathEditor'
import MathRenderer from '@/components/MathRenderer'
import { useFileUpload, FileUploadItem } from '@/hooks/useFileUpload'
import { 
  Calculator, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Upload,
  X,
  Plus,
  Save,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface EnhancedQAEditorProps {
  mode: 'question' | 'answer'
  title?: string
  content?: string
  imageUrl?: string
  onTitleChange?: (title: string) => void
  onContentChange: (content: string) => void
  onImageChange?: (imageUrl: string | null) => void
  onSubmit: () => void
  onCancel?: () => void
  isSubmitting?: boolean
  placeholder?: string
  className?: string
  showMathEditor?: boolean
  allowImageUpload?: boolean
}

interface MathBlock {
  id: string
  latex: string
  position: number
}

export default function EnhancedQAEditor({
  mode,
  title = '',
  content = '',
  imageUrl = '',
  onTitleChange,
  onContentChange,
  onImageChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  placeholder,
  className,
  showMathEditor = true,
  allowImageUpload = true
}: EnhancedQAEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const [showMathInput, setShowMathInput] = useState(false)
  const [mathBlocks, setMathBlocks] = useState<MathBlock[]>([])
  const [currentMath, setCurrentMath] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState(imageUrl)
  
  const { uploadFiles, isUploading } = useFileUpload({
    maxFiles: 1,
    maxSizeInMB: 10,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    persistToDB: false // We'll handle image URLs directly
  })
  
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const uploadedFiles = await uploadFiles([file])
      if (uploadedFiles.length > 0) {
        const imageUrl = uploadedFiles[0].url
        setUploadedImageUrl(imageUrl)
        onImageChange?.(imageUrl)
        toast.success('Image uploaded successfully')
      }
    } catch (error) {
      toast.error('Failed to upload image')
    }
  }, [uploadFiles, onImageChange])
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImageFile(file)
      handleImageUpload(file)
    }
  }
  
  const removeImage = () => {
    setUploadedImageUrl('')
    setSelectedImageFile(null)
    onImageChange?.(null)
  }
  
  const insertMathBlock = useCallback(() => {
    if (!currentMath.trim()) {
      toast.error('Please enter a mathematical expression')
      return
    }
    
    const newBlock: MathBlock = {
      id: `math-${Date.now()}`,
      latex: currentMath,
      position: content.length
    }
    
    const mathPlaceholder = `[MATH:${newBlock.id}]`
    const newContent = content + '\n\n' + mathPlaceholder + '\n\n'
    
    setMathBlocks(prev => [...prev, newBlock])
    onContentChange(newContent)
    setCurrentMath('')
    setShowMathInput(false)
    
    toast.success('Mathematical expression added')
  }, [currentMath, content, onContentChange])
  
  const removeMathBlock = useCallback((blockId: string) => {
    setMathBlocks(prev => prev.filter(block => block.id !== blockId))
    
    // Remove from content
    const updatedContent = content.replace(`[MATH:${blockId}]`, '')
    onContentChange(updatedContent.replace(/\n\n\n+/g, '\n\n')) // Clean up extra newlines
    
    toast.success('Mathematical expression removed')
  }, [content, onContentChange])
  
  const renderPreview = useCallback(() => {
    let previewContent = content
    
    // Replace math blocks with rendered math
    mathBlocks.forEach(block => {
      const placeholder = `[MATH:${block.id}]`
      const mathHtml = `<div class="math-block my-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border"><div class="math-expression"><MathRenderer>${block.latex}</MathRenderer></div></div>`
      previewContent = previewContent.replace(placeholder, mathHtml)
    })
    
    return previewContent
  }, [content, mathBlocks])
  
  const handleSubmit = () => {
    if (mode === 'question' && !title.trim()) {
      toast.error('Question title is required')
      return
    }
    
    if (!content.trim()) {
      toast.error(`${mode === 'question' ? 'Question' : 'Answer'} content is required`)
      return
    }
    
    onSubmit()
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {mode === 'question' ? 'Ask a Question' : 'Write Your Answer'}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {mode === 'question' ? 'Question' : 'Answer'}
            </Badge>
            
            {showMathEditor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMathInput(!showMathInput)}
                className="text-xs"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Math
              </Button>
            )}
            
            {allowImageUpload && (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUploading}
                  className="text-xs"
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Image
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Title input for questions */}
        {mode === 'question' && onTitleChange && (
          <div className="space-y-2">
            <Label htmlFor="question-title">Question Title *</Label>
            <Input
              id="question-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="What's your question?"
              className="text-lg font-medium"
            />
          </div>
        )}
        
        {/* Math input section */}
        {showMathInput && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Add Mathematical Expression</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMathInput(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <VisualMathEditor
                value={currentMath}
                onChange={setCurrentMath}
                placeholder="Enter LaTeX expression (e.g., \frac{1}{2} or x^2 + y^2 = z^2)"
                showPreview
                compact
              />
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentMath('')
                    setShowMathInput(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={insertMathBlock}
                  disabled={!currentMath.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Insert Math
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Content editor with tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Content *</Label>
            
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-auto">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="write" className="text-xs px-3">Write</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-3">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsContent value="write" className="mt-0">
              <Textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={placeholder || `Describe your ${mode === 'question' ? 'problem or question in detail' : 'answer thoroughly'}...`}
                rows={8}
                className="resize-none"
              />
              
              {/* Math blocks display */}
              {mathBlocks.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Mathematical Expressions:
                  </div>
                  <div className="space-y-2">
                    {mathBlocks.map((block) => (
                      <div key={block.id} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded border">
                        <div className="flex-1">
                          <MathRenderer inline>{block.latex}</MathRenderer>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMathBlock(block.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[200px] p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                {mode === 'question' && title && (
                  <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                    {title}
                  </h2>
                )}
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {content ? (
                    <div className="whitespace-pre-wrap">
                      <MathRenderer>{renderPreview()}</MathRenderer>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Preview will appear here...</p>
                  )}
                </div>
                
                {uploadedImageUrl && (
                  <div className="mt-4">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Question/Answer illustration" 
                      className="max-w-full h-auto rounded border shadow-sm"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Image upload section */}
        {allowImageUpload && (uploadedImageUrl || selectedImageFile) && (
          <div className="space-y-2">
            <Label>Attached Image</Label>
            <div className="relative inline-block">
              {uploadedImageUrl ? (
                <div className="relative">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Uploaded" 
                    className="max-w-xs h-auto rounded border shadow-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : isUploading ? (
                <div className="flex items-center justify-center w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded border border-dashed">
                  <div className="text-center">
                    <Upload className="h-6 w-6 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-slate-500">Uploading...</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <AlertCircle className="h-4 w-4" />
            <span>Supports text, math expressions{allowImageUpload ? ', and images' : ''}</span>
          </div>
          
          <div className="flex space-x-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() || (mode === 'question' && !title.trim()))}
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {mode === 'question' ? 'Post Question' : 'Post Answer'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
