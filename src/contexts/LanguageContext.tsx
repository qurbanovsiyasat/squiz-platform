import React, { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { changeLanguage, getCurrentLanguage } from '@/lib/i18n'

interface LanguageContextType {
  currentLanguage: string
  changeLanguage: (lang: string) => void
  t: (key: string, options?: any) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang)
  }

  useEffect(() => {
    // Initialize with saved language or default to Azerbaijani
    const savedLang = localStorage.getItem('i18nextLng') || 'az'
    if (savedLang !== i18n.language) {
      changeLanguage(savedLang)
    }
  }, [])

  const value = {
    currentLanguage: i18n.language || 'az',
    changeLanguage: handleLanguageChange,
    t
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
