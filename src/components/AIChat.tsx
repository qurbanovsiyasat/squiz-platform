import { useState, useRef, useEffect, useCallback } from 'react'
import { useAIChat, useAIConversation, generateChatSessionId, ConversationManager } from '@/hooks/useAI'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { MessageSquare, Send, X, Bot, User, Loader2, Move, Image as ImageIcon, Trash2, Camera, Maximize2, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { MathRenderer } from '@/components/ui/MathRenderer'
import { useIsMobile } from '@/hooks/use-mobile'
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
        ),
        div: ({ className, children }) => {
          if (className === 'math-display') {
            return <div className="text-center py-2 my-2">{children}</div>
          }
          return <div className={className}>{children}</div>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// Enhanced message interface
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
    }
  }>
  timestamp: string
  image?: string // Base64 image data for display
}

// Image upload helper
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result) // This includes the data:image/jpeg;base64, prefix
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId] = useState(() => generateChatSessionId())
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  
  const chatMutation = useAIChat()
  const { data: conversationData, refetch: refetchConversation } = useAIConversation(sessionId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversation history when component mounts or conversation data changes
  useEffect(() => {
    if (conversationData?.messages) {
      const formattedMessages: Message[] = conversationData.messages.map((msg: any) => ({
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: typeof msg.content === 'string' ? msg.content : 
          Array.isArray(msg.content) ? 
            msg.content.find((c: any) => c.type === 'text')?.text || 'Image message' 
            : String(msg.content),
        timestamp: msg.timestamp || new Date().toISOString(),
        image: msg.image // Base64 image data
      }))
      .filter((msg: Message) => msg.role !== 'system') // Filter out system messages from display
      
      setMessages(formattedMessages)
    }
  }, [conversationData])

  // Handle image file selection
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Yalnız şəkil faylları dəstəklənir')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Şəkil ölçüsü 5MB-dan çox ola bilməz')
      return
    }

    setUploadingImage(true)
    try {
      const base64Image = await convertImageToBase64(file)
      setSelectedImage(base64Image)
      toast.success('Şəkil yükləndi. İndi mesaj göndərə bilərsiniz.')
    } catch (error) {
      console.error('Image conversion error:', error)
      toast.error('Şəkil yüklənmədi')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle clipboard paste events
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          // Validate file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            toast.error('Şəkil ölçüsü 5MB-dan çox ola bilməz')
            return
          }
          
          setUploadingImage(true)
          try {
            const base64Image = await convertImageToBase64(file)
            setSelectedImage(base64Image)
            toast.success('Şəkil mübadilə buferindən yükləndi')
          } catch (error) {
            console.error('Clipboard image conversion error:', error)
            toast.error('Şəkil yüklənmədi')
          } finally {
            setUploadingImage(false)
          }
        }
        break
      }
    }
  }, [])
  const removeSelectedImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Clear conversation
  const clearConversation = useCallback(() => {
    ConversationManager.clearConversation(sessionId)
    setMessages([])
    setSelectedImage(null)
    toast.success('Söhbət təmizləndi')
  }, [sessionId])

  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedImage) || chatMutation.isPending) return

    const userMessage: Message = {
      role: 'user',
      content: message.trim() || (selectedImage ? 'Sent an image' : ''),
      timestamp: new Date().toISOString(),
      image: selectedImage || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')
    const currentImage = selectedImage
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content as string,
        sessionId,
        image: currentImage || undefined
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Refetch conversation data to keep it in sync
      refetchConversation()
    } catch (error) {
      console.error('AI chat error:', error)
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Bilinməyən xəta'
      
      if (errorMessage.includes('vision') || errorMessage.includes('404')) {
        toast.error('Şəkil təhlili müvəqqəti əlçatan deyil. Zəhmət olmasa şəkili təsvir edin və ya sonra yenidən cəhd edin.')
      } else {
        toast.error('AI köməkçisi ilə əlaqə zamanı xəta baş verdi')
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Render message content with image support
  const renderMessage = (msg: Message) => {
    const contentText = typeof msg.content === 'string' ? msg.content : 
      Array.isArray(msg.content) ? 
        msg.content.find(c => c.type === 'text')?.text || 'Image message' 
        : String(msg.content)

    return (
      <div className="space-y-2">
        {msg.image && (
          <div className="max-w-xs">
            <img 
              src={msg.image} 
              alt="Uploaded content" 
              className="rounded-lg border max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                // Open image in new tab for full view
                window.open(msg.image, '_blank')
              }}
            />
          </div>
        )}
        <div className="text-sm">
          {renderMessageContent(contentText)}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200',
          isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6',
          isOpen && 'opacity-0 pointer-events-none'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="h-6 w-6 mx-auto" />
      </motion.button>

      {/* Chat Window - Mobile Full Screen or Desktop Draggable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            // Only allow dragging on desktop when not in full screen
            drag={!isMobile && !isFullScreen}
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={!isMobile && !isFullScreen ? {
              top: 0,
              left: -(window.innerWidth - 400),
              right: 0,
              bottom: -(window.innerHeight - 520)
            } : undefined}
            onDragStart={() => !isMobile && setIsDragging(true)}
            onDragEnd={() => {
              !isMobile && setIsDragging(false)
            }}
            className={cn(
              "fixed z-50 transition-all duration-200",
              // Mobile: Fixed positioning - no movement allowed
              isMobile ? (
                isFullScreen 
                  ? "inset-0 w-full h-full" // Full screen on mobile
                  : "bottom-4 left-0 right-0 w-full h-[75vh] max-h-[600px]" // Fixed bottom on mobile with some spacing
              ) : (
                // Desktop: Full screen or floating window
                isFullScreen
                  ? "inset-4 w-auto h-auto"
                  : "bottom-6 right-6 w-96 h-[500px] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-2rem)]"
              ),
              // Only show cursor-move on desktop when draggable
              !isMobile && !isFullScreen && "cursor-move",
              isDragging && "shadow-2xl scale-105"
            )}
            // Position only applies to desktop non-fullscreen mode
            style={(!isMobile && !isFullScreen) ? { x: position.x, y: position.y } : {}}
          >
            <Card className={cn(
              "h-full flex flex-col transition-all duration-200 border-gray-200/50 dark:border-gray-700/50 shadow-lg",
              isDragging && !isMobile ? "shadow-2xl ring-2 ring-purple-300/50" : "shadow-lg",
              // Mobile specific styling
              isMobile && !isFullScreen && "rounded-t-lg rounded-b-none border-b-0",
              isMobile && isFullScreen && "rounded-none border-0",
              // Prevent any mobile interaction that could move the chat
              isMobile && "select-none touch-none"
            )}>
              <CardHeader className={cn(
                "bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 flex-shrink-0",
                // Mobile specific header styling
                isMobile && !isFullScreen ? "rounded-t-lg" : "rounded-t-lg",
                isMobile && isFullScreen && "rounded-none",
                // Only show cursor-move on desktop when draggable
                !isMobile && !isFullScreen && "cursor-move",
                // Prevent text selection on mobile
                isMobile && "select-none"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <CardTitle className={cn(
                      isMobile ? "text-base" : "text-lg"
                    )}>AI Köməkçisi</CardTitle>
                    {!isMobile && !isFullScreen && (
                      <Move className={cn(
                        "h-4 w-4 opacity-50 transition-opacity",
                        isDragging && "opacity-100"
                      )} />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearConversation}
                        className="text-white hover:bg-white/20 h-8 w-8"
                        title="Söhbəti təmizlə"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {/* Full Screen Toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="text-white hover:bg-white/20 h-8 w-8"
                      title={isFullScreen ? "Kiçik rejim" : "Tam ekran"}
                    >
                      {isFullScreen ? (
                        <Minimize2 className="h-3 w-3" />
                      ) : (
                        <Maximize2 className="h-3 w-3" />
                      )}
                    </Button>
                    
                    {/* Position Reset (Desktop only) */}
                    {!isMobile && !isFullScreen && (
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
                    )}
                    
                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsOpen(false)
                        setIsFullScreen(false)
                      }}
                      className="text-white hover:bg-white/20 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className={cn(
                  "flex-1 overflow-y-auto space-y-3 custom-scrollbar",
                  isMobile ? "p-3" : "p-4",
                  // Ensure smooth scrolling on mobile
                  isMobile && "overscroll-contain"
                )}>
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p className={cn(
                        "text-sm",
                        isMobile && "px-2 text-xs leading-relaxed"
                      )}>
                        Salam! Mən Squiz AI köməkçisiyəm. 
                        <br />
                        Quiz yaratma, öyrənmə və digər mövzularda sizə kömək edə bilərəm.
                        <br />
                        <strong className="text-purple-600">Şəkil yükləyə və təhlil edə bilərəm!</strong>
                        <br />
                        {!isMobile && (
                          <span className="text-xs text-gray-500">Məsləhət: Ctrl+V ilə şəkil yapışdıra bilərsiniz</span>
                        )}
                        {isMobile && (
                          <span className="text-xs text-gray-500">Şəkil yükləmək üçün kamera düyməsini toxunun</span>
                        )}
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
                          'flex space-x-2 mb-2',
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
                            'max-w-[85%] px-2 py-1.5 rounded-xl leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm'
                          )}
                        >
                          {renderMessage(msg)}
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
                <div className={cn(
                  "border-t border-gray-200/50 dark:border-gray-700/50 space-y-2 flex-shrink-0",
                  isMobile ? "p-3" : "p-3",
                  // Extra bottom padding on mobile to account for safe areas
                  isMobile && !isFullScreen && "pb-4",
                  // Additional bottom spacing for full-screen mode
                  isMobile && isFullScreen && "pb-8",
                  // Add safe area padding for mobile devices
                  isMobile && "pb-[env(safe-area-inset-bottom,1rem)]"
                )}>
                  {/* Selected Image Preview */}
                  {selectedImage && (
                    <div className="flex items-center space-x-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <img 
                        src={selectedImage} 
                        alt="Selected" 
                        className="w-12 h-12 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Şəkil hazırdır</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeSelectedImage}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-end space-x-2">
                    {/* Image Upload Button */}
                    <div className="relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingImage || chatMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || chatMutation.isPending}
                        className="border-gray-200/50 hover:bg-purple-50 hover:border-purple-300"
                        title="Şəkil yüklə"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Text Input */}
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder={selectedImage ? "Şəkil haqqında sual yazın..." : "Sualınızı yazın... (Ctrl+V ilə şəkil yapışdırın)"}
                      disabled={chatMutation.isPending}
                      className="flex-1 text-sm border-gray-200/50 focus:border-purple-400 transition-colors"
                    />
                    
                    {/* Send Button */}
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!message.trim() && !selectedImage) || chatMutation.isPending}
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