import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'

export const useQuizCreatePermission = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const checkPermissionAndNavigate = useCallback(async () => {
    if (!user?.id) {
      toast.error('Daxil olmaq tələb olunur')
      return false
    }

    try {
      const { data: hasPermission, error } = await supabase
        .rpc('can_user_create_quiz', { user_uuid: user.id })

      if (error) {
        console.error('Permission check error:', error)
        toast.error('İcazə yoxlanılarkən xəta baş verdi')
        return false
      }

      if (!hasPermission) {
        toast.error('Quiz yaratmaq üçün icazəniz yoxdur')
        return false
      }

      navigate('/quizzes/create')
      return true
    } catch (error) {
      console.error('Permission check error:', error)
      toast.error('İcazə yoxlanılarkən xəta baş verdi')
      return false
    }
  }, [user?.id, navigate])

  return { checkPermissionAndNavigate }
}
