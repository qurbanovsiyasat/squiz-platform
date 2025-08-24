import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreateForumPost, useShareQuizToForum } from '@/hooks/useForum'
import { useQuizzes } from '@/hooks/useQuiz'
import { uploadImage } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2, Upload, X, Plus, Image, BookOpen, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  title: string
  content: string
  category: string
  tags: string[]
  shareQuiz: boolean
  sharedQuizId?: string
  images: File[]
}

export default function CreateForumPostPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const createPostMutation = useCreateForumPost()
  const shareQuizMutation = useShareQuizToForum()
  const { data: quizzes = [] } = useQuizzes()
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    category: '',
    tags: [],
    shareQuiz: false,
    sharedQuizId: '',
    images: []
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const categories = [
    'Ümumi', 'Suallar', 'Müzakirə', 'Köməklik', 
    'Təkliflər', 'Quiz Paylaşımı', 'Digər'
  ]

  const handleInputChange = (field: keyof FormData, value: any) => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: File[] = []
    const newPreviews: string[] = []
    
    // Limit to 4 images total
    const remainingSlots = 4 - formData.images.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    filesToProcess.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" şəkil faylı deyil`)
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" 5MB-dan böyükdür`)
        return
      }
      
      newImages.push(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string)
          if (newPreviews.length === filesToProcess.length) {
            setImagePreviews(prev => [...prev, ...newPreviews])
          }
        }
      }
      reader.readAsDataURL(file)
    })
    
    if (newImages.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }))
    }
    
    if (filesToProcess.length < files.length) {
      toast.error(`Maksimum 4 şəkil əlavə edə bilərsiniz. ${files.length - filesToProcess.length} şəkil atlandı.`)
    }
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Başlıq tələb olunur'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Başlıq ən az 5 simvol olmalıdır'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Başlıq maksimum 200 simvol ola bilər'
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Məzmun tələb olunur'
    } else if (formData.content.length < 10) {
      newErrors.content = 'Məzmun ən az 10 simvol olmalıdır'
    }
    
    if (formData.shareQuiz && !formData.sharedQuizId) {
      newErrors.sharedQuizId = 'Paylaşmaq üçün quiz seçin'
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
      // Upload images to Supabase Storage
      const imageUrls: string[] = []
      
      if (formData.images.length > 0) {
        toast.info(`Şəkillər yüklənir... (${formData.images.length} şəkil)`)
        
        for (const image of formData.images) {
          try {
            const imageUrl = await uploadImage(image, 'forum-posts')
            imageUrls.push(imageUrl)
          } catch (error) {
            console.error('Error uploading image:', error)
            toast.error(`Şəkil yüklənərkən xəta: ${image.name}`)
            // Continue with other images even if one fails
          }
        }
        
        if (imageUrls.length > 0) {
          toast.success(`${imageUrls.length} şəkil uğurla yükləndi`)
        }
      }
      
      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category || 'Ümumi',
        tags: formData.tags,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        shared_quiz_id: formData.shareQuiz ? formData.sharedQuizId : null
      }
      
      let result
      if (formData.shareQuiz && formData.sharedQuizId) {
        result = await shareQuizMutation.mutateAsync({
          quizId: formData.sharedQuizId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category || 'Quiz Paylaşımı'
        })
      } else {
        result = await createPostMutation.mutateAsync(postData)
      }
      
      toast.success('Forum yazısı uğurla yaradıldı!')
      navigate(`/forum/${result.id}`)
    } catch (error) {
      console.error('Create post error:', error)
      toast.error('Forum yazısı yaradılarkən xəta baş verdi')
    }
  }

  const selectedQuiz = quizzes.find(q => q.id === formData.sharedQuizId)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/forum" 
          className="inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Foruma qayıt
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
            Yeni Forum Yazısı
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Fikirlərinizi paylaşın, suallarınızı soruşun və icma ilə əlaqə qurun
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Yazı Məlumatları</CardTitle>
            <CardDescription>
              Yazınızı aşağıdakı sahələri dolduraraq əlavə edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Başlıq *</Label>
                <Input
                  id="title"
                  placeholder="Yazınızın başlığını qısa və aydın şəkildə yazın..."
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
              <div className="space-y-2">
                <Label htmlFor="category">Kateqoriya</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kateqoriya seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quiz Sharing Option */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shareQuiz"
                    checked={formData.shareQuiz}
                    onCheckedChange={(checked) => {
                      handleInputChange('shareQuiz', checked as boolean)
                      if (!checked) {
                        handleInputChange('sharedQuizId', '')
                      }
                    }}
                  />
                  <Label htmlFor="shareQuiz" className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Quiz paylaş</span>
                  </Label>
                </div>
                
                {formData.shareQuiz && (
                  <div className="space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                    <Select 
                      value={formData.sharedQuizId} 
                      onValueChange={(value) => handleInputChange('sharedQuizId', value)}
                    >
                      <SelectTrigger className={errors.sharedQuizId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Paylaşmaq üçün quiz seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {quizzes.map(quiz => (
                          <SelectItem key={quiz.id} value={quiz.id}>
                            {quiz.title} ({quiz.difficulty})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sharedQuizId && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.sharedQuizId}</p>
                    )}
                    
                    {selectedQuiz && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            Seçilən Quiz
                          </span>
                          <Badge variant="outline">{selectedQuiz.difficulty}</Badge>
                        </div>
                        <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                          {selectedQuiz.title}
                        </h4>
                        {selectedQuiz.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {selectedQuiz.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Məzmun *</Label>
                <Textarea
                  id="content"
                  placeholder="Yazınızı burada detaylı şəkildə izah edin..."
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`min-h-[200px] ${errors.content ? 'border-red-500' : ''}`}
                  rows={8}
                />
                {errors.content && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.content}</p>
                )}
                <p className="text-xs text-slate-500">
                  {formData.content.length} simvol (ən az 10 tələb olunur)
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-3">
                <Label>Şəkillər (isteğe bağlı)</Label>
                
                {/* Upload Button */}
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={formData.images.length >= 4}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Şəkil əlavə et
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <span className="text-xs text-slate-500">
                    Maksimum 4 şəkil, hər biri 5MB-a qədər
                  </span>
                </div>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.images.length === 0 && (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                    <Image className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Şəkil əlavə etmək üçün "Şəkil əlavə et" düyməsini basın</p>
                  </div>
                )}
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
                    placeholder="Etiket əlavə edin (məsələn: kömək, sual)"
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
                  Maksimum 5 etiket əlavə edə bilərsiniz. Etiketlər başqalarının yazınızı tapmasına kömək edir.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/forum')}
                  disabled={createPostMutation.isPending || shareQuizMutation.isPending}
                >
                  Ləğv et
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    createPostMutation.isPending || 
                    shareQuizMutation.isPending || 
                    !formData.title.trim() || 
                    !formData.content.trim()
                  }
                >
                  {(createPostMutation.isPending || shareQuizMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Yaradılır...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Yazını paylaş
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Forum Yazısı Yazma Təklifləri:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Başlığı açıq və mövzuya uyğun seçin</li>
                  <li>• Məzmunu detaylı və faydalı yazın</li>
                  <li>• Uyğun etiketlər əlavə edin ki, başqaları tapa bilsin</li>
                  <li>• Quiz paylaşarkən nə haqqında olduğunu izah edin</li>
                  <li>• Şəkillərinizin mövzuya uyğun olduğundan əmin olun</li>
                  <li>• Digər istifadəçilərə hörmətli olun</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}