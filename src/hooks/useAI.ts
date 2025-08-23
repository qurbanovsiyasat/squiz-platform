import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

// OpenRouter API configuration
const OPENROUTER_API_KEY = "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"
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
// Using a vision-capable model for image analysis
const MODEL_NAME = "google/gemini-pro-1.5-exp:free" // Vision-capable model
const FALLBACK_MODEL = "tngtech/deepseek-r1t2-chimera:free" // Fallback for text-only

// Enhanced message interface with image support
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
    }
  }>
  timestamp?: string
  image?: string // Base64 image data
}

// Conversation persistence functions
class ConversationManager {
  private static getStorageKey(sessionId: string): string {
    return `ai_conversation_${sessionId}`
  }

  static saveMessage(sessionId: string, message: ChatMessage): void {
    try {
      const conversation = this.getConversation(sessionId)
      conversation.messages.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      })
      conversation.updated_at = new Date().toISOString()
      
      localStorage.setItem(
        this.getStorageKey(sessionId), 
        JSON.stringify(conversation)
      )
      console.log(`Saved message to conversation: ${sessionId}`)
    } catch (error) {
      console.error('Failed to save message:', error)
      // Fallback to sessionStorage
      try {
        const conversation = this.getConversation(sessionId)
        conversation.messages.push(message)
        sessionStorage.setItem(
          this.getStorageKey(sessionId),
          JSON.stringify(conversation)
        )
      } catch (fallbackError) {
        console.error('Failed to save to sessionStorage:', fallbackError)
      }
    }
  }

  static getConversation(sessionId: string): {
    session_id: string
    messages: ChatMessage[]
    created_at: string
    updated_at: string
  } {
    try {
      // Try localStorage first
      let stored = localStorage.getItem(this.getStorageKey(sessionId))
      if (!stored) {
        // Fallback to sessionStorage
        stored = sessionStorage.getItem(this.getStorageKey(sessionId))
      }
      
      if (stored) {
        const conversation = JSON.parse(stored)
        return conversation
      }
    } catch (error) {
      console.error('Failed to retrieve conversation:', error)
    }
    
    // Return new conversation if none exists
    return {
      session_id: sessionId,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  static clearConversation(sessionId: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(sessionId))
      sessionStorage.removeItem(this.getStorageKey(sessionId))
      console.log(`Cleared conversation: ${sessionId}`)
    } catch (error) {
      console.error('Failed to clear conversation:', error)
    }
  }

  // Clean up old conversations (older than 7 days)
  static cleanupOldConversations(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
    
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('ai_conversation_')) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const conversation = JSON.parse(stored)
              const updatedAt = new Date(conversation.updated_at).getTime()
              if (updatedAt < cutoffTime) {
                localStorage.removeItem(key)
                console.log(`Cleaned up old conversation: ${key}`)
              }
            } catch (parseError) {
              // Remove corrupted data
              localStorage.removeItem(key)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old conversations:', error)
    }
  }
}

// Initialize cleanup on module load
ConversationManager.cleanupOldConversations()

// Enhanced AI Chat Assistant with conversation memory and image support
export function useAIChat() {
  const { user } = useAuth()

  return useMutation<any, Error, {
    message: string
    sessionId: string
    context?: { type: string; id: string }
    image?: string // Base64 image data
  }>({    
    mutationFn: async ({ message, sessionId, context, image }) => {
      try {
        // Get conversation history
        const conversation = ConversationManager.getConversation(sessionId)
        
        // Prepare user message with optional image
        let userMessage: ChatMessage
        
        if (image) {
          // For image messages, use structured content
          userMessage = {
            role: 'user',
            content: [
              {
                type: 'text',
                text: message || "Please analyze this image."
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ],
            image,
            timestamp: new Date().toISOString()
          }
        } else {
          // Text-only message
          userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          }
        }
        
        // Save user message to conversation
        ConversationManager.saveMessage(sessionId, userMessage)
        
        // Prepare messages for API (including conversation history)
        const systemMessage: ChatMessage = {
          role: "system",
          content: "You are a helpful AI assistant for Squiz platform, a quiz and learning platform. You help users with creating quizzes, learning, Q&A, and general educational topics. You can analyze images, help with visual content, and provide educational assistance. Always respond in a helpful and educational manner. If the user writes in Azerbaijani, respond in Azerbaijani. If they write in English, respond in English. When analyzing images, be descriptive and educational."
        }
        
        // Build conversation context (limit to last 10 messages to avoid token limits)
        const recentMessages = conversation.messages.slice(-9) // Last 9 messages + new message = 10 total
        const apiMessages = [systemMessage, ...recentMessages, userMessage]
        
        // Choose model based on whether image is included
        const model = image ? MODEL_NAME : FALLBACK_MODEL
        
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: apiMessages,
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
        const timestamp = new Date().toISOString()
        
        // Save assistant response to conversation
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          timestamp
        }
        ConversationManager.saveMessage(sessionId, assistantMessage)
        
        return {
          reply,
          timestamp,
          sessionId,
          userId: user?.id,
          hasImage: !!image,
          model: model
        }
      } catch (error) {
        console.error('OpenRouter API Error:', error)
        throw error
      }
    },
  })
}

// Get conversation history
export function useAIConversation(sessionId: string) {
  return useQuery({
    queryKey: ['ai-conversation', sessionId],
    queryFn: async () => {
      return ConversationManager.getConversation(sessionId)
    },
    enabled: !!sessionId,
    refetchInterval: false, // Don't auto-refetch
    staleTime: Infinity, // Never consider stale
  })
}

// Generate session ID for AI chat
export function generateChatSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Export conversation manager for direct use
export { ConversationManager }