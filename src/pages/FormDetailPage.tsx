import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFormAttachments } from '@/hooks/useForms'
import { useFormStats, useRecordFormView } from '@/hooks/useFormLikes'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import MathRenderer from '@/components/MathRenderer'
import { FormLikeButton } from '@/components/ui/FormLikeButton'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { 
  ArrowLeft, 
  Eye, 
  Calendar,
  User,
  Loader2,
  Lock,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  FileType,
  ExternalLink,
  BookOpen,
  Calculator,
  Share2,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { t } = useLanguage()
  const { data: form, isLoading, error } = useForm(id!)
  const { data: stats } = useFormStats(id!)
  const recordViewMutation = useRecordFormView()
  const { data: attachments = [] } = useFormAttachments(id!)
  
  const [accessCode, setAccessCode] = useState('')
  const [hasAccess, setHasAccess] = useState(false)
  
  // Check access and record view (session-based)
  useEffect(() => {
    if (form && form.is_public) {
      setHasAccess(true)
      // Record view using enhanced tracking
      recordViewMutation.mutate(form.id)
    } else if (form && !form.is_public && accessCode === form.access_code) {
      setHasAccess(true)
      // Record view for private forms too
      recordViewMutation.mutate(form.id)
    }
  }, [form, accessCode])
  
  const handleAccessCodeSubmit = () => {
    if (!form) return
    
    if (accessCode === form.access_code) {
      setHasAccess(true)
      recordViewMutation.mutate(form.id)
      toast.success(t('common.accessGranted') || 'Access granted!')
    } else {
      toast.error(t('common.invalidAccessCode') || 'Invalid access code')
    }
  }

  const renderFileAttachment = (attachment: any) => {
    const isImage = attachment.mime_type?.startsWith('image/') || attachment.is_image
    const isPdf = attachment.mime_type === 'application/pdf'
    const fileUrl = attachment.file_path || attachment.url
    
    if (!fileUrl) {
      return null
    }
    
    return (
      <div
        key={attachment.id}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300"
      >
        {/* File Preview/Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center relative overflow-hidden">
          {isImage ? (
            <ImageViewer
              src={fileUrl}
              alt={attachment.original_name || attachment.name}
              title={attachment.original_name || attachment.name}
              className="w-full h-full"
              showControls={true}
            >
              <img
                src={fileUrl}
                alt={attachment.original_name || attachment.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            </ImageViewer>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6">
              {isPdf ? (
                <FileText className="h-16 w-16 text-red-500 mb-3" />
              ) : (
                <FileType className="h-16 w-16 mb-3" />
              )}
              <span className="text-sm font-medium text-center max-w-full truncate px-2">
                {attachment.original_name || attachment.name}
              </span>
            </div>
          )}
          
          {/* Fallback icon for failed images */}
          {isImage && (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6" 
              style={{ display: 'none' }}
            >
              <ImageIcon className="h-16 w-16 text-blue-500 mb-3" />
              <span className="text-sm font-medium text-center">Image</span>
            </div>
          )}
        </div>
        
        {/* File Info */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {attachment.original_name || attachment.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                {isImage && (
                  <Badge variant="secondary" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Image
                  </Badge>
                )}
                {isPdf && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                  </Badge>
                )}
                {attachment.file_size && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {isImage ? (
                <ImageViewer
                  src={fileUrl}
                  alt={attachment.original_name || attachment.name}
                  title={attachment.original_name || attachment.name}
                  showControls={true}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View</span>
                  </Button>
                </ImageViewer>
              ) : isPdf ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="flex items-center space-x-1 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View</span>
                </Button>
              ) : null}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = fileUrl
                  link.download = attachment.original_name || attachment.name
                  link.target = '_blank'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="flex items-center space-x-1 text-xs"
              >
                <Download className="h-3 w-3" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading form...</p>
        </div>
      </div>
    )
  }
  
  // Simplified error handling
  if (error && !isLoading) {
    console.error('Form loading error:', error)
    return (
      <div className="max-w-2xl mx-auto text-center px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Error Loading Form</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              There was an error loading this form. Please try again.
            </p>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              <Button variant="outline" onClick={() => navigate('/forms')}>Back to Forms</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Show "not found" if we're done loading and there's no form
  if (!isLoading && !form) {
    return (
      <div className="max-w-2xl mx-auto text-center px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Form Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This form doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/forms')}>Back to Forms</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Access code required
  if (!form.is_public && !hasAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle>Access Code Required</CardTitle>
            <CardDescription>
              This form is private. Please enter the access code to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="access-code">Access Code</Label>
              <Input
                id="access-code"
                type="text"
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAccessCodeSubmit()}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => navigate('/forms')} 
                variant="outline" 
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleAccessCodeSubmit}
                disabled={!accessCode.trim()}
                className="flex-1"
              >
                Access Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const allAttachments = [
    ...(attachments || []),
    ...(form?.settings?.attachments || [])
  ]
  
  return (
    <div className="mobile-container mobile-safe space-y-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <Badge variant="secondary">Information Sharing</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {form.title}
            </h1>
            {form.description && (
              <div className="mt-3 text-slate-600 dark:text-slate-400">
                <MathRenderer>{form.description}</MathRenderer>
              </div>
            )}
          </div>
        </div>
        
        {/* Form Meta and Actions */}
        <div className="mobile-qa-stats text-sm text-slate-600 dark:text-slate-400 mb-4">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{form.creator?.full_name || 'Anonymous'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>{stats?.total_views || form.view_count || 0} {t('common.views')}</span>
          </div>
          <Badge variant={form.is_public ? "default" : "secondary"}>
            {form.is_public ? t('quiz.public') : t('quiz.private')}
          </Badge>
        </div>
        
        {/* Form Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <FormLikeButton 
              formId={form.id} 
              variant="button" 
              showViewCount={false}
            />
            
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>{t('common.share')}</span>
            </Button>
          </div>
          
          {isAdmin && (
            <AdminDeleteButton
              itemType="form"
              itemId={form.id}
              itemName={form.title}
              onDeleted={() => navigate('/forms')}
              size="sm"
              variant="button"
              className="ml-4"
            />
          )}
        </div>
      </motion.div>
      
      {/* Form Content */}
      {form.settings?.content && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Content</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <MathRenderer>{form.settings.content}</MathRenderer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Form Attachments */}
      {allAttachments && allAttachments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Attachments</span>
                <Badge variant="outline">{allAttachments.length}</Badge>
              </CardTitle>
              <CardDescription>
                Files shared with this information post
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allAttachments.map((attachment, index) => renderFileAttachment(attachment))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Information Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
              <Info className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-sm">
                  This information was shared on {new Date(form.created_at).toLocaleDateString()} by {form.creator?.full_name || 'Anonymous'}.
                  {(form as any).category_name && (
                    <span className="ml-1">
                      Filed under <Badge variant="outline" className="ml-1">{(form as any).category_name}</Badge>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}