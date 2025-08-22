import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ExternalLink } from 'lucide-react'

// Social media platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.16 20.68a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.68Z"/>
  </svg>
)

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.789l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434Z"/>
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

interface SocialMediaLink {
  name: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  hoverColor: string
  description: string
}

export default function SocialMediaPage() {
  const { t } = useTranslation()

  const socialMediaLinks: SocialMediaLink[] = [
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@mathl1ne?_t=ZS-8yzOMgEcoxI&_r=1',
      icon: TikTokIcon,
      color: 'text-slate-800',
      hoverColor: 'hover:text-slate-900 hover:bg-slate-50',
      description: 'Educational math content and tutorials'
    },
    {
      name: 'Telegram',
      url: 'https://t.me/+OoVdf3w_6HtiNjAy',
      icon: TelegramIcon,
      color: 'text-blue-500',
      hoverColor: 'hover:text-blue-600 hover:bg-blue-50',
      description: 'Join our community for updates and discussions'
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/mathl1ne?igsh=MWNrZWhkeGlncHh5Yw==',
      icon: InstagramIcon,
      color: 'text-pink-500',
      hoverColor: 'hover:text-pink-600 hover:bg-pink-50',
      description: 'Follow for educational posts and behind-the-scenes content'
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@cingizkazmov6736?si=rWSwLyhY1EngH9m5',
      icon: YouTubeIcon,
      color: 'text-red-600',
      hoverColor: 'hover:text-red-700 hover:bg-red-50',
      description: 'Watch educational videos and tutorials'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
            {t('nav.socialMedia')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Connect with us on various social media platforms for educational content, updates, and community discussions.
          </p>
        </motion.div>

        {/* Social Media Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
        >
          {socialMediaLinks.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`p-6 rounded-full transition-all duration-300 ${platform.color} group-hover:scale-110`}>
                      <platform.icon className="h-12 w-12" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                    {platform.name}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {platform.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center space-x-2 w-full py-4 px-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-300 ${platform.hoverColor} group-hover:border-opacity-50 group-hover:shadow-md`}
                  >
                    <span>Visit {platform.name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Follow us on social media (icon links) */}
        <div className="mt-12 text-center">
          <div className="mb-4 font-semibold text-lg text-slate-800 dark:text-white">Follow us on social media:</div>
          <div className="flex items-center justify-center gap-6">
            {socialMediaLinks.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                title={platform.name}
                className={`p-4 rounded-full shadow hover:shadow-md transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${platform.hoverColor}`}
              >
                <platform.icon className={`h-10 w-10 ${platform.color}`} />
              </a>
            ))}
          </div>
        </div>

        {/* Hazırlayanlar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center space-y-4"
        >
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-0">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Hazırlayanlar
              </h2>
              {/* Çingiz Kazımov */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Çingiz Kazımov</span>
                <a
                  href="https://www.linkedin.com/in/chingizkazimov" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-700 dark:text-blue-300 text-sm"
                >LinkedIn / CV</a>
                <span className="text-sm text-slate-500">Riyaziyyat müəllimi</span>
              </div>
              {/* Siyasət Qurbanov */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Siyasət Qurbanov</span>
                <a
                  href="https://www.linkedin.com/in/siyasetqurbanov" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-700 dark:text-blue-300 text-sm"
                >LinkedIn / CV</a>
                <span className="text-sm text-slate-500">Riyaziyyat və İnformatika müəllimi</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}