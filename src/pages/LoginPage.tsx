import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Separate state for each field to prevent any potential mirroring
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = location.state?.from?.pathname || '/dashboard'

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    // Trim whitespace and validate
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      const errorMsg = 'Bütün sahələri doldurun'
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Basic email validation
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      const errorMsg = 'Düzgün email ünvanı daxil edin'
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsLoading(true)
    
    try {
      const result = await signIn(trimmedEmail, trimmedPassword)
      toast.success('Uğurla giriş etdiniz!')
      
      // Small delay to ensure state is updated, then navigate
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 100)
    } catch (error: any) {
      console.error('Login error:', error)
      let errorMsg = 'Giriş zamanı xəta baş verdi'
      
      if (error.message.includes('Invalid login credentials')) {
        errorMsg = 'Email vəya şifrə səhvdir'
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'Email ünvanınızı təsdiq etməlisiniz'
      } else if (error.message.includes('Too many requests')) {
        errorMsg = 'Çox sayda cəhd. Bir az gözləyin'
      }
      
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="card-hover">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Giriş</CardTitle>
            <CardDescription>
              Email və şifrənizi daxil edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                  className="focus-ring"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Şifrə</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Şifrənizi daxil edin"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className="focus-ring pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email.trim() || !password.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş edilir...
                  </>
                ) : (
                  'Giriş et'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Hesabınız yoxdur?{' '}
                <Link 
                  to="/register" 
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  Qeydiyyatdan keçin
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}