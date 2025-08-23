import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Brain, 
  BookOpen, 
  Users, 
  Award, 
  Zap, 
  Shield, 
  BarChart, 
  MessageCircle,
  FileText,
  Clock,
  Globe,
  Smartphone,
  CheckCircle,
  Star,
  Target,
  TrendingUp
} from 'lucide-react'

const mainFeatures = [
  {
    name: 'AI Köməkçisi',
    description: 'Müəyyən mövzularda avtomatik sual yaradın və şəxsi öyrənmə köməyi alın',
    icon: Brain,
    details: [
      'AI texnologiyası ilə sual generasiyası',
      'Şəxsi öyrənmə məsləhətləri',
      'Real-time cavab yardımı',
      'Çətinlik səviyyəsinə görə məzmun'
    ]
  },
  {
    name: 'İnteraktiv Quizlər',
    description: 'Müxtəlif tipli suallarla maraqlı və təhsil edici quizlər yaradın',
    icon: BookOpen,
    details: [
      'Çoxseçimli suallar',
      'Doğru/Yanlış sualları',
      'Mətn cavabı sualları',
      'Riyaziyyat sualları (LaTeX dəstəyi)'
    ]
  },
  {
    name: 'İcma Platforması',
    description: 'Forum və Q&A bölmələrində digər istifadəçilərlə əlaqə qurun',
    icon: Users,
    details: [
      'Aktiv forum müzakirələri',
      'Sual-cavab platforması',
      'Bilik paylaşımı',
      'Təhsil topluluğu'
    ]
  },
  {
    name: 'Detallı Analitika',
    description: 'Performans hesabatları və tərəqqi izləməsi ilə inkişafınızı görün',
    icon: BarChart,
    details: [
      'Nəticə analizi',
      'Tərəqqi izləmə',
      'Güclü və zəif sahələrin müəyyənləşdirilməsi',
      'Performans hesabatları'
    ]
  },
  {
    name: 'Real-time Yoxlama',
    description: 'Sualları real vaxtda yoxlayın və dərhal geribildirim alın',
    icon: Zap,
    details: [
      'Ani nəticə göstərici',
      'Detallı izahat',
      'Avtomatik qiymətləndirmə',
      'Tərəqqi izləmə'
    ]
  },
  {
    name: 'Təhlükəsiz Platform',
    description: 'Məlumatlarınızın təhlükəsizliyi və məxfiliyi bizim üçün ən vacibdir',
    icon: Shield,
    details: [
      'Güclü şifrələmə',
      'JWT autentifikasiya',
      'Məlumat məxfiliyi',
      'GDPR uyğunluğu'
    ]
  }
]

const additionalFeatures = [
  { name: 'Fayl Yükləmə Dəstəyi', icon: FileText },
  { name: 'Vaxt Məhdudiyyəti', icon: Clock },
  { name: 'Çoxdilli Dəstək', icon: Globe },
  { name: 'Mobil Uyğunluq', icon: Smartphone },
  { name: 'Avtomatik Saxlama', icon: CheckCircle },
  { name: 'Qiymətləndirmə Sistemi', icon: Star },
  { name: 'Çətinlik Səviyyələri', icon: Target },
  { name: 'Tərəqqi İzləmə', icon: TrendingUp }
]

const plans = [
  {
    name: 'Pulsuz',
    price: '0',
    description: 'Başlanğıc istifadəçilər üçün',
    features: [
      '5 quiz yaratma',
      'Əsas AI köməkçisi',
      'Forum daxilolması',
      'Əsas analitika'
    ],
    buttonText: 'İndi Başlayın',
    popular: false
  },
  {
    name: 'Pro',
    price: '9.99',
    description: 'Aktiv öyrənənlər üçün',
    features: [
      'Sınırsız quiz',
      'Təkmil AI köməkçisi',
      'Prioritet dəstək',
      'Detallı analitika',
      'Fayl yükləmə',
      'Özəl kateqoriyalar'
    ],
    buttonText: 'Pro Alın',
    popular: true
  },
  {
    name: 'Təhsil',
    price: '19.99',
    description: 'Məktəb və kolleclər üçün',
    features: [
      'Bütün Pro funksiyalar',
      'Tələbə idarəetməsi',
      'Sinif analitikası',
      'Toplu əməliyyatlar',
      'API girişi',
      '24/7 dəstək'
    ],
    buttonText: 'Əlaqə Qurun',
    popular: false
  }
]

export default function FeaturesPage() {
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
              Xüsusiyyətlər
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              <span className="gradient-text">Güclü</span> Öyrənmə Alətləri
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Squiz platformasının təklif etdiyi yenilikçi funksiyalar ilə öyrənmə təcrübənizi 
              növbəti səviyyəyə çıxarın. AI dəstəyi, interaktiv quizlər və güclü analitika.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Əsas Xüsusiyyətlər
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Öyrənmənizi daha təsirli etmək üçün dizayn edilmiş funksiyalar
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Icon className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-3" />
                      <CardTitle className="text-xl">{feature.name}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.details.map((detail, i) => (
                          <li key={i} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Əlavə İmkanlar
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Platformanızın bütün ehtiyaclarını qarşılayan geniş funksiya yelpazəsi
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {feature.name}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Qiymət Planları
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Ehtiyaclarınıza uyğun planı seçin və öyrənməyə başlayın
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative ${plan.popular ? 'lg:scale-105' : ''}`}
              >
                <Card className={`h-full ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white">
                        Məşhur
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">/ay</span>
                    </div>
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              İndi Başlayın
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Bütün bu güclü alətləri pulsuz olaraq sınayın
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <motion.a
                href="/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
              >
                Pulsuz Qeydiyyat
              </motion.a>
              <motion.a
                href="/about"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 text-base font-medium text-white hover:bg-white hover:text-blue-600 transition-colors"
              >
                Daha Ətraflı
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
