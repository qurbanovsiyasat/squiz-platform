import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// AI Chat Assistant
export function useAIChat() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ message, sessionId, context }: {
      message: string
      sessionId: string
      context?: { type: string; id: string }
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          message,
          sessionId,
          context,
          userId: user?.id
        }
      })

      if (error) throw error
      return data.data
    },
  })
}

// Get AI conversation history
export function useAIConversation(sessionId: string) {
  return useQuery({
    queryKey: ['ai-conversation', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

// Generate session ID for AI chat
export function generateChatSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}