import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Users, Target, Globe, Heart, Award, Zap } from 'lucide-react'

const stats = [
  { id: 1, name: 'Aktiv İstifadəçi', value: '2,500+', icon: Users },
  { id: 2, name: 'Yaradılmış Quiz', value: '10,000+', icon: Target },
  { id: 3, name: 'Cavablanmış Sual', value: '500,000+', icon: Award },
  { id: 4, name: 'Ölkə Daxilində', value: '50+', icon: Globe },
]

const values = [
  {
    name: 'İnnovasiya',
    description: 'AI texnologiyalarından istifadə edərək təhsildə yeni üsullar yaradırıq',
    icon: Zap,
  },
  {
    name: 'Əlçatanlıq',
    description: 'Hər kəs üçün sərbəst və asan əlçatan təhsil platforması',
    icon: Heart,
  },
  {
    name: 'Keyfiyyət',
    description: 'Yüksək keyfiyyətli məzmun və istifadəçi təcrübəsi təmin edirik',
    icon: Award,
  },
  {
    name: 'İcma',
    description: 'Güclü öyrənmə icması və qarşılıqlı köməkləşmə mühiti',
    icon: Users,
  },
]

const team = [
  {
    name: 'Elşən Məmmədov',
    role: 'Baş İcraçı Direktor',
    description: 'Təhsil texnologiyaları sahəsində 10+ il təcrübə',
    image: '/api/placeholder/300/300'
  },
  {
    name: 'Aysel Həsənova',
    role: 'Texniki Direktor',
    description: 'AI və machine learning mütəxəssisi',
    image: '/api/placeholder/300/300'
  },
  {
    name: 'Rəşad Quliyev',
    role: 'Məhsul Meneceri',
    description: 'UX/UI və məhsul inkişafı üzrə ekspert',
    image: '/api/placeholder/300/300'
  },
]

export default function AboutPage() {
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
              Squiz Haqqında
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              Təhsilin <span className="gradient-text">Gələcəyini</span> Yaradırıq
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Squiz AI dəstəkli quiz platforması ilə öyrənmənin yeni üsulunu təqdim edir. 
              Bizim missiyamız hər kəs üçün maraqlı və təsirli təhsil təcrübəsi yaratmaqdır.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {stat.name}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Bizim Missiyamız
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Texnologiya ilə təhsili daha maraqlı, əlçatan və təsirli etmək
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                      <CardTitle className="text-lg">{value.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {value.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-8">
                Bizim Hekayəmiz
              </h2>
              <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
                <p>
                  Squiz 2024-cü ildə bir qrup gənc texnoloq və təhsilçi tərəfindən yaradıldı. 
                  Bizim məqsədimiz ənənəvi öyrənmə üsullarını AI texnologiyası ilə birləşdirərək 
                  daha təsirli və maraqlı təhsil platforması yaratmaq idi.
                </p>
                <p>
                  Platformamız istifadəçilərə yalnız quiz yaratmaq və həll etmək imkanı deyil, 
                  həm də AI köməkçisi ilə fərdiləşdirilmiş öyrənmə təcrübəsi təqdim edir. 
                  Forum və icma funksiası ilə istifadəçilər bir-biri ilə bilik paylaşa bilərlər.
                </p>
                <p>
                  Bu gün Squiz minlərlə tələbə, müəllim və digər təhsil həvəskarları tərəfindən 
                  istifadə olunur və daim inkişaf etdirilir.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Komandamız
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Təhsil və texnologiyaya ehtirasla bağlı mütəxəssislər
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                      {member.role}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {member.description}
                    </p>
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
              Bizə Qoşulun
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Öyrənmənin gələcəyini bizimlə birlikdə qurun
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <motion.a
                href="/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
              >
                İndi Qeydiyyatdan Keçin
              </motion.a>
              <motion.a
                href="/contact"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 text-base font-medium text-white hover:bg-white hover:text-blue-600 transition-colors"
              >
                Bizimlə Əlaqə
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
