import { useState, useRef, useEffect } from 'react'
import { useAIChat, generateChatSessionId } from '@/hooks/useAI'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { MessageSquare, Send, X, Bot, User, Loader2, Move } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { MathRenderer } from '@/components/ui/MathRenderer'
import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// Helper function to render text with math expressions using ReactMarkdown
const renderMessageContent = (content: string) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        code: ({ children }) => (
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
            {children}
          </pre>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId] = useState(() => generateChatSessionId())
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const chatMutation = useAIChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim() || chatMutation.isPending) return

    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content,
        sessionId
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI chat error:', error)
      toast.error('AI köməkçisi ilə əlaqə zamanı xəta baş verdi')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200',
          isOpen && 'opacity-0 pointer-events-none'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="h-6 w-6 mx-auto" />
      </motion.button>

      {/* Draggable Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={{
              top: 0,
              left: -(window.innerWidth - 400),
              right: 0,
              bottom: -(window.innerHeight - 520)
            }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => {
              setIsDragging(false)
            }}
            className={cn(
              "fixed bottom-6 right-6 z-50 w-96 h-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] cursor-move",
              isDragging && "shadow-2xl scale-105"
            )}
            style={{ x: position.x, y: position.y }}
          >
            <Card className={cn(
              "h-full flex flex-col transition-all duration-200 border-gray-200/50 dark:border-gray-700/50 shadow-lg",
              isDragging ? "shadow-2xl ring-2 ring-purple-300/50" : "shadow-lg"
            )}>
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg py-4 cursor-move">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-lg">AI Köməkçisi</CardTitle>
                    <Move className={cn(
                      "h-4 w-4 opacity-50 transition-opacity",
                      isDragging && "opacity-100"
                    )} />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPosition({ x: 0, y: 0 })
                        toast.success('Mövqe sıfırlandı')
                      }}
                      className="text-white hover:bg-white/20 h-8 w-8"
                      title="Mövqeyi sıfırla"
                    >
                      <Move className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-white hover:bg-white/20 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-sm">
                        Salam! Mən Squiz AI köməkçisiyəm. 
                        <br />
                        Quiz yaratma, öyrənmə və digər mövzularda sizə kömək edə bilərəm.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'flex space-x-3 mb-4',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        
                        <div
                          className={cn(
                            'max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white border border-purple-600/20 shadow-sm'
                              : 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 shadow-sm'
                          )}
                        >
                          <div className="text-sm">
                            {renderMessageContent(msg.content)}
                          </div>
                        </div>
                        
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                  
                  {chatMutation.isPending && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex space-x-3 mb-4"
                    >
                      <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Düşünürəm...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-6">
                  <div className="flex space-x-3">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Sualınızı yazın..."
                      disabled={chatMutation.isPending}
                      className="flex-1 text-sm border-gray-200/50 focus:border-purple-400 transition-colors"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || chatMutation.isPending}
                      size="icon"
                      className="bg-purple-600 hover:bg-purple-700 shadow-sm"
                    >
                      {chatMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}