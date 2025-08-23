import React, { useState } from 'react'
import { useAIContentSuggestions, AIContentSuggestionsResponse } from '@/hooks/useAI'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Brain, 
  Lightbulb, 
  Loader2, 
  Sparkles, 
  AlertTriangle,
  Zap,
  X,
  Plus,
  Users,
  FileText,
  CheckCircle,
  Target,
  MessageSquare,
  HelpCircle,
  Edit,
  Copy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AIFormSuggestionsProps {
  formType?: string
  existingContent?: string
  onSuggestionApply?: (suggestion: string, type: string) => void
  onSuggestionsGenerated?: (suggestions: AIContentSuggestionsResponse) => void
  className?: string
  compact?: boolean
  targetAudience?: string
}

export default function AIFormSuggestions({
  formType = 'general',
  existingContent = '',
  onSuggestionApply,
  onSuggestionsGenerated,
  className,
  compact = false,
  targetAudience = 'general'
}: AIFormSuggestionsProps) {
  const [selectedContentType, setSelectedContentType] = useState<'form_fields' | 'validation_messages' | 'help_text' | 'completion'>('form_fields')
  const [selectedFormType, setSelectedFormType] = useState(formType)
  const [selectedAudience, setSelectedAudience] = useState(targetAudience)
  const [suggestions, setSuggestions] = useState<AIContentSuggestionsResponse | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { mutate: generateSuggestions, isPending, error, reset } = useAIContentSuggestions()
  
  const handleGenerate = () => {
    generateSuggestions(
      {
        formType: selectedFormType,
        existingContent,
        targetAudience: selectedAudience,
        contentType: selectedContentType
      },
      {
        onSuccess: (data) => {
          setSuggestions(data)
          onSuggestionsGenerated?.(data)
          if (!isExpanded) setIsExpanded(true)
        }
      }
    )
  }
  
  const handleApplySuggestion = (suggestion: string) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestion, selectedContentType)
      toast.success('Oneri uygulandi')
    }
  }
  
  const handleCopySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion)
    toast.success('Oneri panoya kopyalandi')
  }
  
  const handleClose = () => {
    setIsExpanded(false)
    setSuggestions(null)
    reset()
  }
  
  const contentTypeLabels = {
    form_fields: { label: 'Form Alanlari', icon: FileText, description: 'Alan isimleri, placeholderlar ve aciklamalar' },
    validation_messages: { label: 'Dogrulama Mesajlari', icon: AlertTriangle, description: 'Hata mesajlari ve uyarilar' },
    help_text: { label: 'Yardim Metinleri', icon: HelpCircle, description: 'Aciklayici metinler ve ipuclari' },
    completion: { label: 'Metin Tamamlama', icon: Edit, description: 'Mevcut metni tamamlama onerileri' }
  }
  
  const formTypeOptions = [
    { value: 'survey', label: 'Anket', icon: '📊' },
    { value: 'feedback', label: 'Geri Bildirim', icon: '💬' },
    { value: 'contact', label: 'Iletisim', icon: '📞' },
    { value: 'registration', label: 'Kayit', icon: '📝' },
    { value: 'application', label: 'Basvuru', icon: '📋' },
    { value: 'quiz', label: 'Quiz', icon: '🧠' },
    { value: 'general', label: 'Genel', icon: '📄' }
  ]
  
  const audienceOptions = [
    { value: 'students', label: 'Ogrenciler', icon: '🎓' },
    { value: 'professionals', label: 'Profesyoneller', icon: '💼' },
    { value: 'customers', label: 'Musteriler', icon: '👥' },
    { value: 'general', label: 'Genel Kitle', icon: '🌐' }
  ]
  
  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center space-x-2"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Lightbulb className="h-3 w-3" />
          )}
          <span>AI Onerileri</span>
        </Button>
        
        {suggestions && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Oneriler Hazir
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Form Onerileri</CardTitle>
              <CardDescription>
                Formunuz icin AI destekli akilli oneriler alin
              </CardDescription>
            </div>
          </div>
          
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Form Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Form Turu</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {formTypeOptions.map((type) => (
              <Button
                key={type.value}
                variant={selectedFormType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFormType(type.value)}
                disabled={isPending}
                className="text-xs justify-start"
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Target Audience Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Hedef Kitle</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {audienceOptions.map((audience) => (
              <Button
                key={audience.value}
                variant={selectedAudience === audience.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAudience(audience.value)}
                disabled={isPending}
                className="text-xs justify-start"
              >
                <span className="mr-1">{audience.icon}</span>
                {audience.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Content Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Oneri Turu</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(contentTypeLabels).map(([type, config]) => {
              const IconComponent = config.icon
              return (
                <Button
                  key={type}
                  variant={selectedContentType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedContentType(type as typeof selectedContentType)}
                  disabled={isPending}
                  className="text-xs justify-start h-auto p-3"
                >
                  <div className="flex items-start space-x-2">
                    <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Oneriler hazirlaniyor...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              AI Onerileri Olustur
            </>
          )}
        </Button>
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'Oneri olusturma sirasinda bir hata olustu'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Suggestions Results */}
        <AnimatePresence>
          {suggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-semibold">AI Onerileri</h4>
                  <Badge variant="secondary" className="text-xs">
                    {contentTypeLabels[selectedContentType].label}
                  </Badge>
                </div>
                
                {/* Suggestions Content */}
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm text-yellow-800 dark:text-yellow-200">
                        {suggestions.suggestions}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopySuggestion(suggestions.suggestions)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Kopyala
                        </Button>
                        
                        {onSuggestionApply && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApplySuggestion(suggestions.suggestions)}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Uygula
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-3 w-3" />
                    <span>NVIDIA AI</span>
                    <span>•</span>
                    <span>{selectedFormType} formu</span>
                    <span>•</span>
                    <span>
                      {audienceOptions.find(a => a.value === selectedAudience)?.label} kitlesi
                    </span>
                  </div>
                  <span>
                    {new Date(suggestions.timestamp).toLocaleString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Quick Tips */}
        {!suggestions && !isPending && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-2">
              <Target className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">
                  AI Form Onerisi Ozellikleri
                </p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                  <li>• Form Alanlari: Uygun alan isimleri ve placeholder metinleri onerir</li>
                  <li>• Dogrulama: Kullanici dostu hata mesajlari olusturur</li>
                  <li>• Yardim Metinleri: Aciklayici rehber metinleri saglar</li>
                  <li>• Tamamlama: Mevcut iceriginizi gelistirir ve tamamlar</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { AIFormSuggestionsProps }