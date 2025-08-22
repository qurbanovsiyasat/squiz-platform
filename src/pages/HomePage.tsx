import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { BookOpen, Users, Brain, Award, Zap, Shield } from 'lucide-react'
import SocialMediaLinks from '@/components/SocialMediaLinks'
import CreatorInfo from '@/components/CreatorInfo'

const features = [
  {
    name: 'AI Köməkçisi',
    description: 'AI ilə avtomatik sual generasiya edin və öyrənmə köməyi alın',
    icon: Brain,
  },
  {
    name: 'İnteraktiv Quizlər',
    description: 'Müxtəlif tipli suallarla maraqlı və təhsil edici quizlər yaradın',
    icon: BookOpen,
  },
  {
    name: 'İcma Platforması',
    description: 'Forum və Q&A bölmələrində digər istifadəçilərlə əlaqə qurun',
    icon: Users,
  },
  {
    name: 'Nəticə Analitikasi',
    description: 'Dətaillı performans hesabatları və tərəqqi izləməsi',
    icon: Award,
  },
  {
    name: 'Real-time Yoxlama',
    description: 'Sualları real vaxtda yoxlayın və dərhal geribildirim alın',
    icon: Zap,
  },
  {
    name: 'Təhlükəsiz Platform',
    description: 'Məlumatlarınızın təhlükəsizliyi bizim üçün ən vacibd i',
    icon: Shield,
  },
]

const stats = [
  { id: 1, name: 'Aktiv İstifadəçi', value: '2,500+' },
  { id: 2, name: 'Yaradılmış Quiz', value: '10,000+' },
  { id: 3, name: 'Cavablanmış Sual', value: '500,000+' },
  { id: 4, name: 'Ölkə Daxilində', value: '50+' },
]

export default function HomePage() {
  const { user, loading } = useAuth()
  
  // Redirect authenticated users to dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (user) {
    return <Navigate to="/quizzes" replace />
  }
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-7xl">
              <span className="gradient-text">Squiz</span> ilə 
              <br />
              Öyrənməyə Yeni Baxış
            </h1>
            
            {/* Social Media Links */}
            <div className="mt-8">
              <SocialMediaLinks />
            </div>
            
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              AI dəstəkli quiz platforması ilə interaktiv öyrənmə təcrübəsi yaşayın. 
              Suallar yaradın, biliklərinizi sınayın və icma ilə əlaqə qurun.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 flex items-center justify-center gap-x-6"
          >
            <Link to="/register">
              <Button size="lg" className="px-8 py-3 text-base">
                İndi Başlayın
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8 py-3 text-base">
                Giriş edin
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Statistikalarla tanışın
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Mindərlə istifadəçi ilə böyükən platformamız
              </p>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: stat.id * 0.1 }}
                  className="flex flex-col bg-slate-50 dark:bg-slate-700 p-8"
                >
                  <dt className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {stat.name}
                  </dt>
                  <dd className="order-first text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Güclü Xüsusiyyətlər
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Squiz platformasının təqdim etdiyi bütün xüsusiyyətlərlə tanış ol
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex flex-col"
                >
                  <Card className="h-full card-hover">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 rounded-lg dark:bg-primary-900">
                          <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <CardTitle className="text-xl">{feature.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Creator Information Section */}
      <section className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4"
            >
              Komandamızla Tanış Olun
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-300"
            >
              Təhsildə fərqlılıq yaradan və Squiz platformasını həyata keçirən
            </motion.p>
          </div>
          <CreatorInfo />
        </div>
      </section>

      // {/* CTA Section tamamilə silindi */}
    </div>
  )
}