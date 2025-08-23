import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateForm } from '@/hooks/useForms'
import { useAuth } from '@/contexts/AuthContext'
import { useDraftPersistence } from '@/utils/persistence'
import { CategorySelect } from '@/components/admin/CategorySelect'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/Switch'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Save, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  BookOpen,
  FileText,
  Type,
  PlusCircle,
  Share2,
  Upload,
  Calculator,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import FileUpload, { FileItem } from '@/components/FileUpload'
import ImageUploadCrop from '@/components/ImageUploadCrop'
import MathEditor from '@/components/MathEditor'

// Enhanced form schema with rich content support
const formSchema = z.object({
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  content: z.string().optional(),
  mathContent: z.string().optional(),
  mathDescription: z.string().optional(),
  category_id: z.string().optional(),
  is_public: z.boolean().default(true),
  access_code: z.string().optional(),
  useMathContent: z.boolean().default(false),
  useMathDescription: z.boolean().default(false),
  hero_image_url: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export default function CreateFormPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [currentTab, setCurrentTab] = useState('basic')
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([])
  const [heroImageUrl, setHeroImageUrl] = useState<string>('')
  const createFormMutation = useCreateForm()
  
  // Draft management
  const { saveDraft, loadDraft, deleteDraft, getAllDrafts, autoSaveDraft } = useDraftPersistence()
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [availableDrafts, setAvailableDrafts] = useState<any[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      mathContent: '',
      mathDescription: '',
      category_id: '',
      is_public: true,
      access_code: '',
      useMathContent: false,
      useMathDescription: false,
      hero_image_url: ''
    }
  })
  
  const watchedForm = form.watch()
  
  // Check for existing drafts on component mount
  useEffect(() => {
    const drafts = getAllDrafts('form')
    if (drafts.length > 0) {
      setAvailableDrafts(drafts)
      setShowDraftDialog(true)
    }
  }, [])
  
  // Collect current form data for persistence
  const getCurrentFormData = () => {
    const formValues = form.getValues()
    return {
      formData: formValues,
      selectedCategory,
      attachedFiles,
      heroImageUrl,
      currentTab,
      previewMode
    }
  }
  
  // Auto-save functionality
  useEffect(() => {
    if (currentDraftId && user) {
      const formData = getCurrentFormData()
      // Only auto-save if there's actual content
      if (formData.formData.title?.trim() || formData.formData.content?.trim() || formData.formData.mathContent?.trim()) {
        autoSaveDraft('form', formData, currentDraftId, 3000) // 3-second delay
      }
    }
  }, [watchedForm, selectedCategory, attachedFiles, heroImageUrl, currentTab, currentDraftId, user])
  
  // Load draft data
  const loadDraftData = (draftData: any) => {
    if (draftData.formData) {
      // Reset form with draft data
      form.reset(draftData.formData)
    }
    
    if (draftData.selectedCategory) {
      setSelectedCategory(draftData.selectedCategory)
    }
    
    if (draftData.attachedFiles) {
      setAttachedFiles(draftData.attachedFiles)
    }
    
    if (draftData.heroImageUrl) {
      setHeroImageUrl(draftData.heroImageUrl)
    }
    
    if (draftData.currentTab) {
      setCurrentTab(draftData.currentTab)
    }
  }
  
  // Save draft manually
  const handleSaveDraft = async () => {
    if (!user) {
      toast.error('Login required to save drafts')
      return
    }
    
    setSavingDraft(true)
    try {
      const formData = getCurrentFormData()
      const draftId = currentDraftId || `form_${user.id}_${Date.now()}`
      saveDraft('form', formData, draftId)
      setCurrentDraftId(draftId)
      setLastSaved(new Date())
      toast.success('Draft saved successfully!')
    } catch (error) {
      toast.error('Failed to save draft')
      console.error('Failed to save draft:', error)
    } finally {
      setSavingDraft(false)
    }
  }
  
  // Load selected draft
  const handleLoadDraft = (draftId: string) => {
    const draftData = loadDraft('form', draftId)
    if (draftData) {
      loadDraftData(draftData)
      setCurrentDraftId(draftId)
      setLastSaved(new Date(draftData.timestamp || Date.now()))
      toast.success('Draft loaded!')
    }
    setShowDraftDialog(false)
  }
  
  // Delete draft
  const handleDeleteDraft = (draftId: string) => {
    deleteDraft('form', draftId)
    const updatedDrafts = availableDrafts.filter(draft => draft.id !== draftId)
    setAvailableDrafts(updatedDrafts)
    
    if (currentDraftId === draftId) {
      setCurrentDraftId(null)
      setLastSaved(null)
    }
    
    toast.success('Draft deleted')
  }
  
  const onSubmit = async (data: FormData) => {
    try {
      const result = await createFormMutation.mutateAsync({
        title: data.title,
        description: data.description || '',
        is_public: data.is_public,
        access_code: data.access_code || null,
        settings: {
          content: data.useMathContent ? data.mathContent || '' : data.content || '',
          mathContent: data.mathContent || '',
          mathDescription: data.mathDescription || '',
          attachments: attachedFiles.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url,
            isImage: file.isImage
          })),
          useMathContent: data.useMathContent,
          useMathDescription: data.useMathDescription,
          hero_image_url: heroImageUrl
        },
        category_id: selectedCategory && selectedCategory !== '' && selectedCategory !== '__none__' ? selectedCategory : null
      })
      
      // Clean up draft after successful creation
      if (currentDraftId) {
        deleteDraft('form', currentDraftId)
      }
      
      toast.success('Information post created successfully!')
      navigate(`/form/${result.id}`)
    } catch (error) {
      console.error('Form creation error:', error)
      toast.error('Failed to create information post')
    }
  }
  
  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Please login to create information posts.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full sm:w-auto">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Draft Dialog */}
      {showDraftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Saved Drafts</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDraftDialog(false)}
                >
                  ✕
                </Button>
              </div>
              
              <p className="text-gray-600 mb-4">
                You have previously saved drafts. Choose one to continue or start a new post.
              </p>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableDrafts.map((draft) => {
                  const draftTitle = draft.data?.formData?.title || 'Untitled Draft'
                  const draftDate = new Date(draft.timestamp).toLocaleString()
                  const hasContent = draft.data?.formData?.content || draft.data?.formData?.mathContent
                  
                  return (
                    <div key={draft.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{draftTitle}</h4>
                          <p className="text-sm text-gray-600">
                            {hasContent ? 'Has content' : 'No content'} • {draftDate}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleLoadDraft(draft.id)}
                            className="text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDraftDialog(false)
                    // Start new draft with current user
                    if (user) {
                      setCurrentDraftId(`form_${user.id}_${Date.now()}`)
                    }
                  }}
                >
                  Start New Post
                </Button>
                <Button variant="ghost" onClick={() => setShowDraftDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Share2 className="h-6 w-6 text-blue-600" />
              <Badge variant="secondary">Information Sharing</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Create Information Post</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Share content and information with your community
            </p>
            
            {/* Draft status indicator */}
            {currentDraftId && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <RefreshCw className={`h-3 w-3 mr-1 ${savingDraft ? 'animate-spin' : ''}`} />
                {lastSaved ? (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                ) : (
                  <span>Draft in progress...</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Save Draft Button */}
            <Button 
              type="button"
              variant="ghost" 
              onClick={handleSaveDraft} 
              disabled={savingDraft}
              className="text-blue-600 hover:text-blue-700"
            >
              {savingDraft ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Content Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={currentTab === 'basic' ? 'default' : 'ghost'}
                onClick={() => setCurrentTab('basic')}
                className="w-full justify-start"
                size="sm"
              >
                <Type className="h-4 w-4 mr-2" />
                Basic Info
              </Button>
              <Button
                variant={currentTab === 'content' ? 'default' : 'ghost'}
                onClick={() => setCurrentTab('content')}
                className="w-full justify-start"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Content
              </Button>
              <Button
                variant={currentTab === 'hero-image' ? 'default' : 'ghost'}
                onClick={() => setCurrentTab('hero-image')}
                className="w-full justify-start"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Hero Image
              </Button>
              <Button
                variant={currentTab === 'attachments' ? 'default' : 'ghost'}
                onClick={() => setCurrentTab('attachments')}
                className="w-full justify-start"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Attachments
              </Button>
              <Button
                variant={currentTab === 'settings' ? 'default' : 'ghost'}
                onClick={() => setCurrentTab('settings')}
                className="w-full justify-start"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {previewMode ? (
              /* Preview Mode */
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <Badge variant="secondary">Preview</Badge>
                  </div>
                  <CardTitle className="text-2xl">{watchedForm.title || 'Untitled Information Post'}</CardTitle>
                  {watchedForm.description && (
                    <CardDescription className="text-base mt-2">
                      <p>{watchedForm.description}</p>
                    </CardDescription>
                  )}
                  
                  {/* Hero Image Preview */}
                  {heroImageUrl && (
                    <div className="mt-4">
                      <img 
                        src={heroImageUrl} 
                        alt="Hero image preview" 
                        className="w-full max-w-2xl h-auto rounded-lg border"
                      />
                    </div>
                  )}
                </CardHeader>
                
                {((watchedForm.useMathContent && watchedForm.mathContent) || watchedForm.content) && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        {watchedForm.useMathContent ? (
                          <Calculator className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                        <Label className="text-sm font-medium">
                          {watchedForm.useMathContent ? 'Mathematical Content' : 'Content'}
                        </Label>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        {watchedForm.useMathContent && watchedForm.mathContent ? (
                          <div 
                            className="katex-preview"
                            title="Mathematical content will render when saved"
                          >
                            <code className="text-sm">{watchedForm.mathContent}</code>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{watchedForm.content}</p>
                        )}
                      </div>
                    </div>
                    
                    {attachedFiles.length > 0 && (
                      <div className="space-y-4 mt-4">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-5 w-5" />
                          <Label className="text-sm font-medium">Attachments ({attachedFiles.length})</Label>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {attachedFiles.map((file) => (
                            <div key={file.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800">
                              <div className="flex flex-col items-center space-y-2">
                                {/* File Preview/Icon */}
                                {file.isImage && file.url ? (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    {file.type === 'application/pdf' ? (
                                      <FileText className="h-8 w-8 text-red-500" />
                                    ) : (
                                      <FileText className="h-8 w-8 text-gray-500" />
                                    )}
                                  </div>
                                )}
                                
                                {/* File Info */}
                                <div className="text-center w-full">
                                  <p className="text-xs font-medium truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {file.type === 'application/pdf' ? 'PDF' : file.isImage ? 'Image' : 'File'}
                                  </p>
                                </div>
                                
                                {/* Quick Actions */}
                                {file.url && (
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const link = document.createElement('a')
                                        link.href = file.url
                                        link.target = '_blank'
                                        link.click()
                                      }}
                                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                                      title="View file"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ) : (
              /* Edit Mode */
              <Card>
                <CardContent className="pt-6">
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
                    <TabsContent value="basic" className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Title *</Label>
                          <Input
                            {...form.register('title')}
                            placeholder="Enter a descriptive title for your information post"
                            onKeyDown={(e) => {
                              // Prevent Enter key from submitting form in title input
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                return;
                              }
                            }}
                          />
                          {form.formState.errors.title && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.title.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            {...form.register('description')}
                            placeholder="Brief description of your information post"
                            rows={3}
                            onKeyDown={(e) => {
                              // Allow Shift+Enter for new lines, prevent plain Enter from submitting
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                return;
                              }
                            }}
                          />
                        </div>
                        
                        <div>
                          <CategorySelect
                            type="form"
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                            placeholder="Select a category (optional)"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="content" className="space-y-6">
                      <div className="space-y-6">
                        <div>
                          <Label className="text-base font-medium">Main Content</Label>
                          <p className="text-sm text-slate-500">
                            Share detailed information, explanations, or educational content
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Content Type</Label>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={watchedForm.useMathContent}
                                onCheckedChange={(checked) => form.setValue('useMathContent', checked)}
                              />
                              <Label className="text-sm flex items-center space-x-1">
                                <Calculator className="h-4 w-4" />
                                <span>Mathematical Content</span>
                              </Label>
                            </div>
                          </div>
                          
                          {watchedForm.useMathContent ? (
                            <div className="space-y-4">
                              <MathEditor
                                value={form.watch('mathContent') || ''}
                                onChange={(latex, isValid) => {
                                  form.setValue('mathContent', latex)
                                }}
                                placeholder="Enter mathematical expressions using LaTeX notation..."
                                showPreview={true}
                                className="min-h-[300px]"
                              />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Textarea
                                {...form.register('content')}
                                placeholder="Share your main content, explanations, or detailed information here..."
                                rows={12}
                                className="min-h-[300px]"
                                onKeyDown={(e) => {
                                  // Only prevent unwanted form submission, no auto-submit
                                  // Users must click the submit button explicitly
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    // Remove automatic submission - users must click submit button
                                    e.preventDefault();
                                    return;
                                  }
                                }}
                              />
                              
                              {form.watch('content') && (
                                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                                  <div className="prose prose-slate dark:prose-invert max-w-none">
                                    <p className="whitespace-pre-wrap">{form.watch('content')}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Enhanced Description</Label>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={watchedForm.useMathDescription}
                                onCheckedChange={(checked) => form.setValue('useMathDescription', checked)}
                              />
                              <Label className="text-sm flex items-center space-x-1">
                                <Calculator className="h-4 w-4" />
                                <span>Math Description</span>
                              </Label>
                            </div>
                          </div>
                          
                          {watchedForm.useMathDescription && (
                            <MathEditor
                              value={form.watch('mathDescription') || ''}
                              onChange={(latex, isValid) => {
                                form.setValue('mathDescription', latex)
                              }}
                              placeholder="Enter mathematical description using LaTeX..."
                              compact={true}
                            />
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="hero-image" className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Hero Image</Label>
                          <p className="text-sm text-slate-500">
                            Upload a hero image for your information post to make it more engaging
                          </p>
                        </div>
                        
                        <ImageUploadCrop
                          onImageUploaded={setHeroImageUrl}
                          onImageRemoved={() => setHeroImageUrl('')}
                          existingImageUrl={heroImageUrl}
                          maxSizeInMB={5}
                          aspectRatio={16 / 9}
                          cropWidth={800}
                          cropHeight={450}
                          allowCrop={true}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="attachments" className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">File Attachments</Label>
                          <p className="text-sm text-slate-500">
                            Upload images, PDFs, and documents to share alongside your content
                          </p>
                        </div>
                        
                        <FileUpload
                          onFilesUploaded={setAttachedFiles}
                          onFileRemoved={(fileId) => {
                            setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
                          }}
                          existingFiles={attachedFiles}
                          maxFiles={10}
                          maxSizeInMB={30}
                          showPreview={true}
                          persistToDB={false}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="settings" className="space-y-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Public Information Post</Label>
                            <p className="text-sm text-slate-500">Allow anyone to view this information</p>
                          </div>
                          <Switch
                            checked={watchedForm.is_public}
                            onCheckedChange={(checked) => form.setValue('is_public', checked)}
                          />
                        </div>
                        
                        {!watchedForm.is_public && (
                          <div>
                            <Label>Access Code</Label>
                            <Input
                              {...form.register('access_code')}
                              placeholder="Enter access code for private posts"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                }
                              }}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Users will need this code to view your private information post
                            </p>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                          <h3 className="font-medium mb-2">Content Summary</h3>
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <p>• Title: {watchedForm.title ? 'Set' : 'Not set'}</p>
                            <p>• Description: {watchedForm.description ? 'Set' : 'Not set'}</p>
                            <p>• Main Content: {(watchedForm.useMathContent && watchedForm.mathContent) || watchedForm.content ? 'Set' : 'Not set'}</p>
                            <p>• Mathematical Content: {watchedForm.useMathContent ? 'Enabled' : 'Disabled'}</p>
                            <p>• File Attachments: {attachedFiles.length} file(s)</p>
                            <p>• Visibility: {watchedForm.is_public ? 'Public' : 'Private'}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
            
            {!previewMode && (
              <div className="flex justify-end space-x-2">
                <Button
                  type="submit"
                  disabled={createFormMutation.isPending || !watchedForm.title}
                  className="min-w-[140px]"
                >
                  {createFormMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Post
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
