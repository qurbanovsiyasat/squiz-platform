import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreateQAQuestion } from '@/hooks/useQA'
import { uploadImage } from '@/lib/supabase'
import { CategorySelect } from '@/components/admin/CategorySelect'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import MathInput from '@/components/MathInput'
import MathRenderer from '@/components/MathRenderer'
import ImageUploadCrop from '@/components/ImageUploadCrop'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2, Plus, X, HelpCircle, Image, Calculator } from 'lucide-react'
import { toast } from 'sonner'

export default function CreateQAQuestionPage() {
  const navigate = useNavigate()
  const createQuestionMutation = useCreateQAQuestion()
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
    image_url: ''
  })
  const [useMathEditor, setUseMathEditor] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [questionImageUrl, setQuestionImageUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, tag] 
      }))
      setNewTag('')
    } else if (formData.tags.length >= 5) {
      toast.error('Maksimum 5 etiket əlavə edə bilərsiniz')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Sual başlığı tələb olunur'
    } else if (formData.title.length < 10) {
      newErrors.title = 'Başlıq ən az 10 simvol olmalıdır'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Başlıq maksimum 200 simvol ola bilər'
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Sual məzmunu tələb olunur'
    } else if (formData.content.length < 20) {
      newErrors.content = 'Məzmun ən az 20 simvol olmalıdır'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Formu düzgün doldurun')
      return
    }
    
    try {
      const result = await createQuestionMutation.mutateAsync({
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags,
        category: (formData.category && formData.category !== '' && formData.category !== '__none__') ? formData.category : undefined,
        image_url: questionImageUrl || undefined
      })
      
      toast.success('Sual uğurla yaradıldı!')
      navigate(`/qa/${result.id}`)
    } catch (error: any) {
      console.error('Question creation error:', error)
      toast.error(error.message || 'Sual yaradılarkən xəta baş verdi')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/qa" 
          className="inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sual-Cavaba qayıt
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Yeni Sual Ver
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sualınızı aşağıdakı formda detaylı şəkildə yazaraq digər istifadəçilərdən kömək alın
          </p>
        </div>
      </motion.div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Yaxşı sual yazma tövsiyələri:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Açıq və konkret başlıq seçin</li>
                  <li>• Probleminizi detaylı şəkildə izah edin</li>
                  <li>• Nə cəhd etdiyinizi və hansı nəticəni gözlədiyinizi qeyd edin</li>
                  <li>• Uygun etiketlər əlavə edin</li>
                  <li>• Diğər istifadəçilərə hörmətli olun</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Sual Məlumatları</CardTitle>
            <CardDescription>
              Sualınızı aşağıdakı sahələri dolduraraq əlavə edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Sual Başlığı *</Label>
                <Input
                  id="title"
                  placeholder="Sualınızı qısa və açıq şəkildə yazın..."
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={errors.title ? 'border-red-500' : ''}
                  maxLength={200}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                )}
                <p className="text-xs text-slate-500">
                  {formData.title.length}/200 simvol
                </p>
              </div>

              {/* Category */}
              <CategorySelect
                type="qa"
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                placeholder="Kateqoriya seçin (məcburi deyil)"
              />

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Sual Məzmunu *</Label>
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <Label htmlFor="math-toggle" className="text-sm">Riyazi düstur redaktoru</Label>
                    <Switch 
                      id="math-toggle"
                      checked={useMathEditor}
                      onCheckedChange={setUseMathEditor}
                    />
                  </div>
                </div>
                
                {useMathEditor ? (
                  <div className="space-y-2">
                    <MathInput
                      value={formData.content}
                      onChange={(value) => handleInputChange('content', value)}
                      placeholder="LaTeX syntax istifadə edərək riyazi düsturlarınızı yazın (məs: \frac{1}{2}, x^2, \sqrt{x})"
                      label=""
                    />
                    {formData.content && (
                      <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Önizləmə:</p>
                        <MathRenderer>{formData.content}</MathRenderer>
                      </div>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="content"
                    placeholder="Sualınızı burada detaylı şəkildə izah edin. Nə etmək istədiyinizi, hansı problemlə qarşılaşdığınızı və nə cəhd etdiyinizi qeyd edin..."
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className={`min-h-[200px] ${errors.content ? 'border-red-500' : ''}`}
                    rows={8}
                  />
                )}
                
                {errors.content && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.content}</p>
                )}
                <p className="text-xs text-slate-500">
                  {formData.content.length} simvol (ən az 20 tələb olunur)
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <Label>Etiketlər</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Etiket əlavə edin (məsələn: riyaziyyat, cəbr)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    maxLength={20}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addTag}
                    disabled={!newTag.trim() || formData.tags.length >= 5}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Maksimum 5 etiket əlavə edə bilərsiniz. Etiketlər başqalarının sualınızı tapmasına kömək edir.
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Şəkil əlavə et (isteğe bağlı)
                </Label>
                <ImageUploadCrop
                  onImageUploaded={setQuestionImageUrl}
                  onImageRemoved={() => setQuestionImageUrl('')}
                  existingImageUrl={questionImageUrl}
                  maxSizeInMB={5}
                  aspectRatio={4 / 3}
                  cropWidth={600}
                  cropHeight={450}
                  allowCrop={true}
                  bucketName="qa-images"
                />
                <p className="text-xs text-slate-500">
                  Şəkil sualınızı daha aydın etməyə kömək edəcək.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/qa')}
                  disabled={createQuestionMutation.isPending}
                >
                  Ləğv et
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestionMutation.isPending || !formData.title.trim() || !formData.content.trim()}
                >
                  {createQuestionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Yaradılır...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sualı yarat
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
