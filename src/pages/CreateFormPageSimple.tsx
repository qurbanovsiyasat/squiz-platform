import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateForm } from '@/hooks/useForms'
import { useAuth } from '@/contexts/AuthContext'
import { CategorySelect } from '@/components/admin/CategorySelect'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/Switch'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { 
  Save, 
  ArrowLeft, 
  Share2,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import FileUpload, { FileItem } from '@/components/FileUpload'

// Simplified form schema without complex mathematical content
const formSchema = z.object({
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  content: z.string().optional(),
  category_id: z.string().optional(),
  is_public: z.boolean().default(true),
  access_code: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export default function CreateFormPageSimple() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([])
  const createFormMutation = useCreateForm()
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      category_id: '',
      is_public: true,
      access_code: ''
    }
  })
  
  const watchedForm = form.watch()
  
  const onSubmit = async (data: FormData) => {
    try {
      const result = await createFormMutation.mutateAsync({
        title: data.title,
        description: data.description || '',
        is_public: data.is_public,
        access_code: data.access_code || null,
        settings: {
          content: data.content || '',
          attachments: attachedFiles.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url,
            isImage: file.isImage
          }))
        },
        category_id: (selectedCategory && selectedCategory !== '' && selectedCategory !== '__none__') ? selectedCategory : null
      })
      
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
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Share2 className="h-6 w-6 text-blue-600" />
            <Badge variant="secondary">Information Sharing</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Create Information Post
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Share content, images, and documents with your community
          </p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Content</Label>
              <Textarea
                {...form.register('content')}
                placeholder="Share your main content, explanations, or detailed information here..."
                rows={8}
                className="min-h-[200px]"
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
            </div>
            
            <div>
              <CategorySelect
                type="form"
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="Select a category (optional)"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* File Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">File Attachments</CardTitle>
            <CardDescription>
              Upload images, PDFs, and documents to share alongside your content. Maximum 10 files, 20MB each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesUploaded={setAttachedFiles}
              onFileRemoved={(fileId) => {
                setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
              }}
              existingFiles={attachedFiles}
              maxFiles={10}
              maxSizeInMB={20}
              showPreview={true}
              persistToDB={false}
            />
          </CardContent>
        </Card>
        
        {/* Access Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Access Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                />
                <p className="text-xs text-slate-500 mt-1">
                  Users will need this code to view your private information post
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createFormMutation.isPending || !watchedForm.title}
            className="min-w-[140px]"
          >
            {createFormMutation.isPending ? (
              'Creating...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Post
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
