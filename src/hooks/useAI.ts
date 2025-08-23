import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

// OpenRouter API configuration
const OPENROUTER_API_KEY = "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"
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL_NAME = "tngtech/deepseek-r1t2-chimera:free"

// AI Chat Assistant using OpenRouter API
export function useAIChat() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ message, sessionId, context }: {
      message: string
      sessionId: string
      context?: { type: string; id: string }
    }) => {
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL_NAME,
            messages: [
              {
                role: "system",
                content: "You are a helpful AI assistant for Squiz platform, a quiz and learning platform. You help users with creating quizzes, learning, Q&A, and general educational topics. Always respond in a helpful and educational manner. If the user writes in Azerbaijani, respond in Azerbaijani. If they write in English, respond in English."
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }

        const data = await response.json()
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from OpenRouter API')
        }

        const reply = data.choices[0].message.content
        
        return {
          reply,
          timestamp: new Date().toISOString(),
          sessionId,
          userId: user?.id
        }
      } catch (error) {
        console.error('OpenRouter API Error:', error)
        throw error
      }
    },
  })
}

// Mock conversation history for now (since we're not storing conversations anymore)
export function useAIConversation(sessionId: string) {
  return useQuery({
    queryKey: ['ai-conversation', sessionId],
    queryFn: async () => {
      // Return empty conversation data since we're not storing conversations
      // This maintains compatibility with existing code
      return {
        session_id: sessionId,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    },
    enabled: !!sessionId,
  })
}

// Generate session ID for AI chat
export function generateChatSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}