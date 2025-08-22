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
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const from = location.state?.from?.pathname || '/dashboard'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    console.log(`Form field change: ${name} = ${value}`)
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      console.log('New form data:', newData)
      return newData
    })
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    if (!formData.email || !formData.password) {
      const errorMsg = 'Bütün sahələri doldurun'
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsLoading(true)
    
    try {
      const result = await signIn(formData.email, formData.password)
      console.log('Login successful:', result)
      toast.success('Uğurla giriş etdiniz!')
      
      // Small delay to ensure state is updated, then navigate
      setTimeout(() => {
        console.log('Navigating to:', from)
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="focus-ring"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Şifrənizi daxil edin"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="focus-ring pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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
                disabled={isLoading}
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