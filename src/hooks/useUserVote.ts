import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Hook to get user's vote for a question or answer
export function useUserVote(type: 'question' | 'answer', itemId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user-vote', type, itemId, user?.id],
    queryFn: async () => {
      if (!user || !itemId) return null
      
      // Try to get the vote from qa_votes table
      // If the table doesn't exist, return null to prevent errors
      try {
        const query = supabase
          .from('qa_votes')
          .select('vote_type')
          .eq('user_id', user.id)
        
        if (type === 'question') {
          query.eq('question_id', itemId).is('answer_id', null)
        } else {
          query.eq('answer_id', itemId)
        }
        
        const { data, error } = await query.maybeSingle()
        
        if (error) {
          // If table doesn't exist or there's a schema issue, return null
          console.warn('Vote lookup failed:', error.message)
          return null
        }
        
        return data?.vote_type || null
      } catch (error) {
        console.warn('Vote lookup error:', error)
        return null
      }
    },
    enabled: !!user && !!itemId,
    // Don't retry on error to prevent spam
    retry: false,
  })
}
