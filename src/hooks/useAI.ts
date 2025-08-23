import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// AI Chat Assistant Types
export interface AIChatRequest {
  message?: string
  messages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  model?: string
}

export interface AIChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: string
  timestamp: string
}

// AI Analysis Types
export interface AITextAnalysisRequest {
  text: string
  analysisType?: 'grammar' | 'sentiment' | 'summarize' | 'suggest' | 'general'
  language?: string
}

export interface AITextAnalysisResponse {
  success: boolean
  originalText: string
  analysisType: string
  language: string
  result: string
  timestamp: string
  provider: string
  tokenUsage?: {
    prompt_tokens: number
    total_tokens: number
    completion_tokens: number
  }
}

export interface AIImageAnalysisRequest {
  imageUrl: string
  analysisType?: 'general' | 'ocr' | 'quality'
}

export interface AIImageAnalysisResponse {
  success: boolean
  analysisType: string
  imageUrl: string
  analysis: string
  confidence: number
  timestamp: string
  provider: string
}

export interface AIContentSuggestionsRequest {
  formType?: string
  existingContent?: string
  targetAudience?: string
  contentType?: 'form_fields' | 'validation_messages' | 'help_text' | 'completion'
}

export interface AIContentSuggestionsResponse {
  success: boolean
  formType: string
  contentType: string
  targetAudience: string
  existingContent: string
  suggestions: string
  timestamp: string
  provider: string
}

// Custom Error Class
class AIError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message)
    this.name = 'AIError'
  }
}

// Utility function to handle API errors
const handleAIError = (error: any, operation: string): AIError => {
  console.error(`${operation} error:`, error)
  
  if (error?.message?.includes('unauthorized')) {
    return new AIError('AI servisine erişim yetkiniz yok', 'UNAUTHORIZED')
  }
  
  if (error?.message?.includes('quota')) {
    return new AIError('AI servis kotanız doldu', 'QUOTA_EXCEEDED')
  }
  
  if (error?.message?.includes('timeout')) {
    return new AIError('AI servisi yanıt vermedi', 'TIMEOUT')
  }
  
  return new AIError(
    error?.message || `AI ${operation.toLowerCase()} başarısız oldu`,
    'AI_ERROR',
    error
  )
}

/**
 * Google Gemini AI Assistant Hook
 */
export function useAIAssistant() {
  const [chatHistory, setChatHistory] = useState<AIChatResponse[]>([])
  
  return useMutation({
    mutationFn: async (request: AIChatRequest): Promise<AIChatResponse> => {
      if (!request.message && !request.messages) {
        throw new AIError('Mesaj veya mesaj geçmişi gerekli', 'VALIDATION_ERROR')
      }
      
      if (request.message && request.message.trim().length === 0) {
        throw new AIError('Boş mesaj gönderilemez', 'VALIDATION_ERROR')
      }
      
      if (request.message && request.message.length > 2000) {
        throw new AIError('Mesaj çok uzun (maksimum 2000 karakter)', 'MESSAGE_TOO_LONG')
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: {
            message: request.message,
            messages: request.messages,
            model: request.model || 'gemini-2.0-flash'
          }
        })
        
        if (error) {
          throw handleAIError(error, 'AI asistan çağrısı')
        }
        
        if (!data || data.error) {
          throw new AIError(data?.error?.message || 'AI asistan yanıt vermedi', 'API_ERROR')
        }
        
        // Chat geçmişine ekle
        setChatHistory(prev => [data, ...prev.slice(0, 9)]) // Son 10 sohbeti tut
        
        return data
      } catch (error) {
        if (error instanceof AIError) {
          throw error
        }
        throw handleAIError(error, 'AI asistan çağrısı')
      }
    },
    onSuccess: (data) => {
      console.log('AI Assistant response:', data.choices[0]?.message?.content)
    },
    onError: (error: AIError) => {
      console.error('AI asistan hatası:', error)
      toast.error(error.message || 'AI asistan çağrısı başarısız oldu')
    }
  })
}

/**
 * AI Metin Analizi Hook
 */
export function useAITextAnalysis() {
  const [analysisHistory, setAnalysisHistory] = useState<AITextAnalysisResponse[]>([])
  
  return useMutation({
    mutationFn: async (request: AITextAnalysisRequest): Promise<AITextAnalysisResponse> => {
      if (!request.text?.trim()) {
        throw new AIError('Analiz edilecek metin gerekli', 'VALIDATION_ERROR')
      }
      
      if (request.text.length > 5000) {
        throw new AIError('Metin çok uzun (maksimum 5000 karakter)', 'TEXT_TOO_LONG')
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('nvidia-text-analysis', {
          body: {
            text: request.text.trim(),
            analysisType: request.analysisType || 'general',
            language: request.language || 'tr'
          }
        })
        
        if (error) {
          throw handleAIError(error, 'Metin analizi')
        }
        
        if (!data?.success) {
          throw new AIError(data?.error?.message || 'Metin analizi başarısız oldu', 'API_ERROR')
        }
        
        // Analiz geçmişine ekle
        setAnalysisHistory(prev => [data, ...prev.slice(0, 9)]) // Son 10 analizi tut
        
        return data
      } catch (error) {
        if (error instanceof AIError) {
          throw error
        }
        throw handleAIError(error, 'Metin analizi')
      }
    },
    onSuccess: (data) => {
      if (data.analysisType !== 'general') {
        toast.success(`${data.analysisType === 'grammar' ? 'Dilbilgisi analizi' : 
          data.analysisType === 'sentiment' ? 'Duygu analizi' :
          data.analysisType === 'summarize' ? 'Özet analizi' :
          'Metin analizi'} tamamlandı`)
      }
    },
    onError: (error: AIError) => {
      console.error('Metin analizi hatası:', error)
      toast.error(error.message || 'Metin analizi başarısız oldu')
    }
  })
}

/**
 * AI Görüntü Analizi Hook
 */
export function useAIImageAnalysis() {
  const [analysisHistory, setAnalysisHistory] = useState<AIImageAnalysisResponse[]>([])
  
  return useMutation({
    mutationFn: async (request: AIImageAnalysisRequest): Promise<AIImageAnalysisResponse> => {
      if (!request.imageUrl?.trim()) {
        throw new AIError('Görüntü URL gerekli', 'VALIDATION_ERROR')
      }
      
      // URL validation
      try {
        new URL(request.imageUrl)
      } catch {
        throw new AIError('Geçersiz görüntü URL', 'INVALID_URL')
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('nvidia-image-analysis', {
          body: {
            imageUrl: request.imageUrl,
            analysisType: request.analysisType || 'general'
          }
        })
        
        if (error) {
          throw handleAIError(error, 'Görüntü analizi')
        }
        
        if (!data?.success) {
          throw new AIError(data?.error?.message || 'Görüntü analizi başarısız oldu', 'API_ERROR')
        }
        
        // Analiz geçmişine ekle
        setAnalysisHistory(prev => [data, ...prev.slice(0, 9)]) // Son 10 analizi tut
        
        return data
      } catch (error) {
        if (error instanceof AIError) {
          throw error
        }
        throw handleAIError(error, 'Görüntü analizi')
      }
    },
    onSuccess: () => {
      toast.success('Görüntü analizi tamamlandı')
    },
    onError: (error: AIError) => {
      console.error('Görüntü analizi hatası:', error)
      toast.error(error.message || 'Görüntü analizi başarısız oldu')
    }
  })
}

/**
 * AI İçerik Önerileri Hook
 */
export function useAIContentSuggestions() {
  const [suggestionsHistory, setSuggestionsHistory] = useState<AIContentSuggestionsResponse[]>([])
  
  return useMutation({
    mutationFn: async (request: AIContentSuggestionsRequest): Promise<AIContentSuggestionsResponse> => {
      try {
        const { data, error } = await supabase.functions.invoke('nvidia-content-suggestions', {
          body: {
            formType: request.formType || 'general',
            existingContent: request.existingContent || '',
            targetAudience: request.targetAudience || 'general',
            contentType: request.contentType || 'form_fields'
          }
        })
        
        if (error) {
          throw handleAIError(error, 'İçerik önerileri')
        }
        
        if (!data?.success) {
          throw new AIError(data?.error?.message || 'İçerik önerileri başarısız oldu', 'API_ERROR')
        }
        
        // Öneri geçmişine ekle
        setSuggestionsHistory(prev => [data, ...prev.slice(0, 9)]) // Son 10 öneriyi tut
        
        return data
      } catch (error) {
        if (error instanceof AIError) {
          throw error
        }
        throw handleAIError(error, 'İçerik önerileri')
      }
    },
    onSuccess: () => {
      toast.success('AI önerileri hazırlandı')
    },
    onError: (error: AIError) => {
      console.error('İçerik önerileri hatası:', error)
      toast.error(error.message || 'İçerik önerileri başarısız oldu')
    }
  })
}

/**
 * AI Analizlerini Temizleme Hook'u
 */
export function useAIClearHistory() {
  const [textAnalysisHistory, setTextAnalysisHistory] = useState<AITextAnalysisResponse[]>([])
  const [imageAnalysisHistory, setImageAnalysisHistory] = useState<AIImageAnalysisResponse[]>([])
  const [suggestionsHistory, setSuggestionsHistory] = useState<AIContentSuggestionsResponse[]>([])
  
  return {
    clearTextAnalysis: () => setTextAnalysisHistory([]),
    clearImageAnalysis: () => setImageAnalysisHistory([]),
    clearSuggestions: () => setSuggestionsHistory([])
  }
}

// Export error class for external use
export { AIError }

// Chat-related types and functions (placeholders for AIChat component)
export function generateChatSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2)}`
}

export class ConversationManager {
  // Placeholder implementation
  static clearConversation(sessionId: string) {
    // Placeholder implementation
    console.log('Clearing conversation:', sessionId)
  }
}

export function useAIChat() {
  // Placeholder hook for AIChat component
  return {
    mutateAsync: async (data: any) => {
      // Placeholder implementation
      return { 
        success: true, 
        reply: 'Chat feature not implemented yet',
        timestamp: new Date().toISOString()
      }
    },
    isPending: false,
    error: null,
    reset: () => {}
  }
}

export function useAIConversation(sessionId: string) {
  // Placeholder hook for conversation history
  return {
    data: { messages: [] },
    refetch: () => Promise.resolve()
  }
}