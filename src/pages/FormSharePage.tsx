import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from '@/hooks/useForms'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Separator } from '@/components/ui/Separator'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { motion } from 'framer-motion'
import { 
  Share2, 
  Copy, 
  Mail, 
  MessageCircle, 
  ExternalLink,
  Eye,
  Calendar,
  User,
  ArrowLeft,
  CheckCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function FormSharePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: form, isLoading } = useForm(id!)
  const [copied, setCopied] = useState(false)

  if (isLoading) {
    return (
      <PageWrapper title="Form Paylaş" description="Formunuzu paylaşın">
        <div className="max-w-4xl mx-auto">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  if (!form) {
    return (
      <PageWrapper title="Form Tapılmadı" description="Axtardığınız form mövcud deyil">
        <div className="max-w-4xl mx-auto text-center">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Form Tapılmadı</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Bu form mövcud deyil və ya silinib.
              </p>
              <Link to="/forms">
              <Button>Formlara Qayıt</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  const shareUrl = `${window.location.origin}/form/${form.id}`
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link kopyalandı!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Link kopyalanarkən xəta baş verdi')
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Form: ${form.title}`)
    const body = encodeURIComponent(`Bu forma baxın: ${shareUrl}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaSocialMedia = (platform: string) => {
    const text = encodeURIComponent(`"${form.title}" formasına baxın`)
    const url = encodeURIComponent(shareUrl)
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    }
    
    if (urls[platform as keyof typeof urls]) {
      window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400')
    }
  }

  const getDisplayName = (author: any) => {
    if (!author) return 'Anonim'
    if (author.is_private) return 'Abituriyent'
    return author.full_name || 'Abituriyent'
  }

  return (
    <PageWrapper title="Form Paylaş" description="Formunuzu paylaşın">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center space-x-4">
          <Link to={`/form/${form.id}`}>
          <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Forma Qayıt
          </Button>
          </Link>
        </div>

        {/* Form Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{form.title}</CardTitle>
                  <CardDescription>{form.description}</CardDescription>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{getDisplayName(form.creator)}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(form.created_at)}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{form.view_count || 0} baxış</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {(form as any).category && (
                    <Badge variant="secondary">{(form as any).category}</Badge>
                  )}
                  {form.is_public ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Açıq
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Gizli
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p>{form.description}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Share Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="h-5 w-5" />
                <span>Formu Paylaş</span>
              </CardTitle>
              <CardDescription>
                Bu formu başqaları ilə paylaşın
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Direct Link */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Form Linki</Label>
                <div className="flex space-x-2">
                  <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono text-sm break-all">
                    {shareUrl}
                  </div>
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="min-w-[100px]"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopyala
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Share Methods */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Paylaşma Üsulları</Label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={shareViaEmail}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Mail className="h-6 w-6" />
                    <span className="text-sm">E-mail</span>
                  </Button>
                  
                  <Button
                    onClick={() => shareViaSocialMedia('whatsapp')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <MessageCircle className="h-6 w-6" />
                    <span className="text-sm">WhatsApp</span>
                  </Button>
                  
                  <Button
                    onClick={() => shareViaSocialMedia('facebook')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <ExternalLink className="h-6 w-6" />
                    <span className="text-sm">Facebook</span>
                  </Button>
                  
                  <Button
                    onClick={() => shareViaSocialMedia('twitter')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <ExternalLink className="h-6 w-6" />
                    <span className="text-sm">Twitter</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Paylaşma Təlimatları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <p>• Formu paylaşmaq üçün yuxarıdakı linki kopyalayın və istədiyiniz yerdə istifadə edin</p>
                <p>• Form {form.is_public ? 'hər kəs tərəfindən görülə bilər' : 'yalnız linki olanlar tərəfindən görülə bilər'}</p>
                <p>• Paylaşılan formun statistikalarını admin paneldən izləyə bilərsiniz</p>
                <p>• Form cavablarını yalnız form yaradıcısı görə bilər</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
