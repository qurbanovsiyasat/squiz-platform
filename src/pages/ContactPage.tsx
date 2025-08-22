import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageCircle,
  HelpCircle,
  Bug,
  Lightbulb,
  Send
} from 'lucide-react'
import { toast } from 'sonner'

const contactInfo = [
  {
    name: 'E-poçt',
    value: 'info@squiz.az',
    icon: Mail,
    description: 'Ümumi sorğular və dəstək üçün'
  },
  {
    name: 'Telefon',
    value: '+994 12 345 67 89',
    icon: Phone,
    description: 'İş saatlarında telefon dəstəyi'
  },
  {
    name: 'Ünvan',
    value: 'Bakı, Azərbaycan',
    icon: MapPin,
    description: 'Fiziki ünvan'
  },
  {
    name: 'İş Saatları',
    value: 'B.e - Cümə: 09:00-18:00',
    icon: Clock,
    description: 'Dəstək komandamızın iş vaxtı'
  }
]

const inquiryTypes = [
  { value: 'general', label: 'Ümumi sorğu', icon: MessageCircle },
  { value: 'support', label: 'Texniki dəstək', icon: HelpCircle },
  { value: 'bug', label: 'Xəta bildirişi', icon: Bug },
  { value: 'feature', label: 'Təklif/Fikir', icon: Lightbulb }
]

const faqs = [
  {
    question: 'Platformadan necə istifadə edə bilərəm?',
    answer: 'Squiz platformasından istifadə etmək üçün sadəcə qeydiyyatdan keçin və dərhal quiz yaratmağa başlayın.'
  },
  {
    question: 'AI köməkçisi necə işləyir?',
    answer: 'AI köməkçimiz OpenAI texnologiyasından istifadə edərək sizin üçün suallar yaradır və öyrənmə prosesində yardım edir.'
  },
  {
    question: 'Pulsuz versiyada hansı məhdudiyyətlər var?',
    answer: 'Pulsuz versiyada 5 quiz yaratma imkanı, əsas AI köməkçisi və forum girişi var. Pro versiya ilə bütün funksiyalara çıxış əldə edə bilərsiniz.'
  },
  {
    question: 'Məlumatlarımın təhlükəsizliyi necə təmin edilir?',
    answer: 'Biz yüksək səviyyəli şifrələmə və təhlükəsizlik protokollarından istifadə edirik. Məlumatlarınız tamamilə qorunur.'
  }
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    type: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success('Mesajınız uğurla göndərildi! Tezliklə sizinlə əlaqə saxlayacağıq.')
    setFormData({
      name: '',
      email: '',
      subject: '',
      type: '',
      message: ''
    })
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4">
              Əlaqə
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              Bizimlə <span className="gradient-text">Əlaqə</span> Saxlayın
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Suallarınız, təklifləriniz və ya hər hansı bir yardıma ehtiyacınız varsa, 
              biz sizin üçün buradayıq. Komandamız sizə kömək etməkdən məmnun olacaq.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info, index) => {
              const Icon = info.icon
              return (
                <motion.div
                  key={info.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="text-center h-full">
                    <CardContent className="pt-6">
                      <Icon className="h-8 w-8 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {info.name}
                      </h3>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        {info.value}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {info.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Mesaj Göndərin</CardTitle>
                  <CardDescription>
                    Formu doldurun və biz 24 saat ərzində sizinlə əlaqə saxlayacağıq
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Ad Soyad</Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-poçt</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="type">Sorğu Növü</Label>
                      <Select onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sorğu növünü seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {inquiryTypes.map((type) => {
                            const Icon = type.icon
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center">
                                  <Icon className="h-4 w-4 mr-2" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subject">Mövzu</Label>
                      <Input
                        id="subject"
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Mesaj</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        required
                        rows={6}
                        className="mt-1"
                        placeholder="Mesajınızı buraya yazın..."
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>Göndərilir...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Mesaj Göndər
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Tez-tez Verilən Suallar
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Ən çox soruşulan sualların cavabları
                  </p>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <Card>
                        <CardContent className="pt-6">
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                            {faq.question}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {faq.answer}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start">
                      <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                          Daha Sürətli Cavab İstəyirsiniz?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          Canlı chat sistemimizlə dərhal yardım alın
                        </p>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Canlı Chat Başlat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Hələ Sualınız Var?
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Əgər axtardığınız cavabı tapa bilmədinizsə, bizimlə birbaşa əlaqə saxlayın
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild>
                <a href="mailto:info@squiz.az">
                  <Mail className="h-4 w-4 mr-2" />
                  E-poçt Göndər
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="tel:+994123456789">
                  <Phone className="h-4 w-4 mr-2" />
                  Telefon Et
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
