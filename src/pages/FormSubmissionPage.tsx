import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase, uploadImage } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { toast } from 'sonner'
import { 
  Send, 
  Upload, 
  File, 
  Clock, 
  Users, 
  CheckCircle,
  X,
  ImageIcon,
  FileText,
  Calendar
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'

interface FormField {
  id: string
  type: string
  label: string
  required: boolean
  options?: string[]
}

interface Form {
  id: string
  title: string
  description?: string
  creator_id: string
  is_public: boolean
  access_code?: string
  settings: {
    allow_multiple_submissions?: boolean
    collect_email?: boolean
    show_progress?: boolean
  }
  created_at: string
  updated_at: string
}

function FormSubmissionContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [accessCode, setAccessCode] = useState('')
  const [showAccessCodeForm, setShowAccessCodeForm] = useState(false)

  useEffect(() => {
    if (id) {
      loadForm()
    }
  }, [id])

  const loadForm = async () => {
    try {
      setLoading(true)
      
      // First, try to load the form
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (formError) throw formError
      if (!formData) {
        toast.error('Form tapılmadı')
        navigate('/forms')
        return
      }

      // Check if form requires access code and user is not the creator
      if (!formData.is_public && formData.access_code && user?.id !== formData.creator_id) {
        setShowAccessCodeForm(true)
        setForm(formData)
        setLoading(false)
        return
      }

      // Load form fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', id)
        .order('order_index')

      if (fieldsError) throw fieldsError

      setForm(formData)
      setFormFields(fieldsData || [])
    } catch (error: any) {
      console.error('Error loading form:', error)
      toast.error(error.message || 'Form yüklənmədi')
      navigate('/forms')
    } finally {
      setLoading(false)
    }
  }

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !accessCode) return

    if (accessCode === form.access_code) {
      setShowAccessCodeForm(false)
      // Load form fields after access granted
      try {
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', id)
          .order('order_index')

        if (fieldsError) throw fieldsError
        setFormFields(fieldsData || [])
      } catch (error: any) {
        console.error('Error loading form fields:', error)
        toast.error('Form sahələri yüklənmədi')
      }
    } else {
      toast.error('Yanlış giriş kodu')
    }
  }

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!file) return

    // Validate file size (20MB limit)
    if (file.size > 20971520) {
      toast.error('Fayl ölçüsü 20MB-dan çox ola bilməz')
      return
    }

    setUploading(prev => ({ ...prev, [fieldId]: true }))
    try {
      const imageUrl = await uploadImage(file, 'forms')
      setUploadedFiles(prev => ({ ...prev, [fieldId]: imageUrl }))
      handleInputChange(fieldId, imageUrl)
      toast.success('Fayl uğurla yükləndi')
    } catch (error: any) {
      console.error('File upload error:', error)
      toast.error(error.message || 'Fayl yüklənmədi')
    } finally {
      setUploading(prev => ({ ...prev, [fieldId]: false }))
    }
  }

  const removeUploadedFile = (fieldId: string) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[fieldId]
      return newFiles
    })
    handleInputChange(fieldId, null)
  }

  const validateForm = (): boolean => {
    const requiredFields = formFields.filter(field => field.required)
    
    for (const field of requiredFields) {
      const value = responses[field.id]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`"${field.label}" sahəsi tələb olunur`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !user) return

    if (!validateForm()) return

    setSubmitting(true)
    try {
      // Create form submission
      const submissionData = {
        form_id: form.id,
        submitter_id: user.id,
        responses: responses,
        submitted_at: new Date().toISOString()
      }

      const { error: submissionError } = await supabase
        .from('form_submissions')
        .insert([submissionData])

      if (submissionError) throw submissionError

      toast.success('Form uğurla göndərildi!')
      navigate('/forms')
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(error.message || 'Form göndərilmədi')
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const fieldId = field.id
    const value = responses[fieldId] || ''

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={`${field.label} daxil edin...`}
            required={field.required}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={`${field.label} daxil edin...`}
            rows={4}
            required={field.required}
          />
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            required={field.required}
          >
            <option value="">Seçin...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={fieldId}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(fieldId, e.target.value)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  required={field.required}
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkboxValues, option]
                      : checkboxValues.filter((v: string) => v !== option)
                    handleInputChange(fieldId, newValues)
                  }}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'file':
      case 'image':
        return (
          <div className="space-y-3">
            {uploadedFiles[fieldId] ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  {field.type === 'image' ? (
                    <ImageIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-green-600" />
                  )}
                  <span className="text-sm text-green-800">Fayl yükləndi</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadedFile(fieldId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor={`file-${fieldId}`} className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {field.type === 'image' ? 'Şəkil yükləyin' : 'Fayl yükləyin'}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Maksimum 20MB
                      </span>
                    </label>
                    <input
                      id={`file-${fieldId}`}
                      type="file"
                      accept={field.type === 'image' ? 'image/*' : '*/*'}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(fieldId, file)
                      }}
                      className="sr-only"
                      required={field.required && !uploadedFiles[fieldId]}
                    />
                  </div>
                  {uploading[fieldId] && (
                    <div className="mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-1">Yüklənir...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            required={field.required}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={`${field.label} daxil edin...`}
            required={field.required}
          />
        )

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={`${field.label} daxil edin...`}
            required={field.required}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form tapılmadı</h1>
          <p className="text-gray-600 mb-4">Axtardığınız form mövcud deyil.</p>
          <Button onClick={() => navigate('/forms')}>Formlara qayıt</Button>
        </div>
      </div>
    )
  }

  if (showAccessCodeForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <File className="h-6 w-6 text-purple-600" />
              <span>Giriş kodu tələb olunur</span>
            </CardTitle>
            <CardDescription>
              Bu form məxfidir və giriş kodu tələb edir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="access-code">Giriş kodu</Label>
                <Input
                  id="access-code"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Giriş kodunu daxil edin"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Təsdiq et
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/forms')}
                >
                  Ləğv et
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
              {form.description && (
                <p className="text-gray-600 mt-2">{form.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!form.is_public && (
                <Badge variant="outline">Məxfi</Badge>
              )}
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(form.created_at)}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Form doldurun</span>
            </CardTitle>
            <CardDescription>
              Bütün tələb olunan sahələri doldurun və formu göndərin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formFields.map((field, index) => (
                <div key={field.id}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Label htmlFor={field.id} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {field.required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </div>
                  {renderField(field)}
                  {index < formFields.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/forms')}
                >
                  Ləğv et
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Göndərilir...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('forms.submitForm')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function FormSubmissionPage() {
  return (
    <ErrorBoundary>
      <FormSubmissionContent />
    </ErrorBoundary>
  )
}
