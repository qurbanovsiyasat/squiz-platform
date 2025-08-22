import { useEffect } from 'react'
import { handleAuthCallback } from '@/contexts/AuthContext'
import LoadingPage from './LoadingPage'

export default function AuthCallback() {
  useEffect(() => {
    handleAuthCallback()
  }, [])

  return <LoadingPage />
}