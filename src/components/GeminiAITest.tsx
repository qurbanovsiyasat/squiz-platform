import { useState } from 'react'
import { useAIAssistant, AIChatRequest, AIChatResponse } from '@/hooks/useAI'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  MessageSquare,
  Sparkles,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function GeminiAITest() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const aiAssistant = useAIAssistant()

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Lütfen bir mesaj yazın')
      return
    }

    const userMessage = message.trim()
    const timestamp = new Date().toISOString()

    // Kullanıcı mesajını chat geçmişine ekle
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp
    }])

    // Input'u temizle
    setMessage('')

    try {
      const response = await aiAssistant.mutateAsync({
        message: userMessage
      })

      // AI yanıtını chat geçmişine ekle
      if (response.choices && response.choices[0]) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: response.choices[0].message.content,
          timestamp: response.timestamp
        }])
      }
    } catch (error) {
      console.error('AI yanıt hatası:', error)
      // Hata mesajını chat'e ekle
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date().toISOString()
      }])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearChat = () => {
    setChatHistory([])
    toast.success('Sohbet geçmişi temizlendi')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Google Gemini AI Test</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Google Gemini 2.0 Flash modeli ile sohbet edin
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                Gemini 2.0
              </Badge>
              {chatHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs"
                >
                  Temizle
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Area */}
      <Card>
        <CardContent className="p-4">
          {/* Messages */}
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto space-y-4 mb-4">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Sohbete başlayın
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                  Google Gemini AI ile Türkçe, İngilizce veya Azerbaycan Türkçesi ile sohbet edebilirsiniz.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[70%] rounded-lg p-3 space-y-1",
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  )}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      msg.role === 'user' 
                        ? 'text-blue-100' 
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      <Clock className="h-3 w-3" />
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın... (Enter ile gönder)"
              disabled={aiAssistant.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={aiAssistant.isPending || !message.trim()}
              className="px-6"
            >
              {aiAssistant.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Status */}
          {aiAssistant.isPending && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Google Gemini yanıt hazırlıyor...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
            Test Önerileri
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>• "Merhaba, nasılsın?" - Türkçe sohbet testi</p>
            <p>• "Salam, necəsən?" - Azerbaycan Türkçesi testi</p>
            <p>• "Hello, how are you?" - İngilizce testi</p>
            <p>• "Python ile bir fibonacci fonksiyonu yazar mısın?" - Kod yazma testi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
