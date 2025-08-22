import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from '../locales/en.json'
import az from '../locales/az.json'

const resources = {
  en: { translation: en },
  az: { translation: az }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'az', // Default to Azerbaijani
    lng: 'az', // Start with Azerbaijani
    debug: false,
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n
export const changeLanguage = (lng: string) => i18n.changeLanguage(lng)
export const getCurrentLanguage = () => i18n.language || 'az'
