import React, { useState } from 'react'
import { useAITextAnalysis, AITextAnalysisResponse } from '@/hooks/useAI'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Brain, 
  Type, 
  Loader2, 
  Sparkles, 
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Zap,
  X,
  Copy,
  RefreshCw,
  Heart,
  FileText,
  TrendingUp,
  Edit3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AITextEnhancerProps {
  initialText?: string
  onTextImproved?: (improvedText: string, analysis: AITextAnalysisResponse) => void
  onAnalysisComplete?: (analysis: AITextAnalysisResponse) => void
  className?: string
  placeholder?: string
  compact?: boolean
  showTextArea?: boolean
  analysisTypes?: Array<'grammar' | 'sentiment' | 'summarize' | 'suggest' | 'general'>
}

export default function AITextEnhancer({
  initialText = '',
  onTextImproved,
  onAnalysisComplete,
  className,
  placeholder = 'Analiz edilecek metni buraya yazın...',
  compact = false,
  showTextArea = true,
  analysisTypes = ['grammar', 'sentiment', 'summarize', 'suggest', 'general']
}: AITextEnhancerProps) {
  const [text, setText] = useState(initialText)
  const [selectedType, setSelectedType] = useState<'grammar' | 'sentiment' | 'summarize' | 'suggest' | 'general'>('grammar')
  const [analysis, setAnalysis] = useState<AITextAnalysisResponse | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { mutate: analyzeText, isPending, error, reset } = useAITextAnalysis()
  
  const handleAnalyze = () => {
    if (!text.trim()) {
      toast.error('Lütfen analiz edilecek bir metin girin')
      return
    }
    
    analyzeText(
      { text: text.trim(), analysisType: selectedType },
      {
        onSuccess: (data) => {
          setAnalysis(data)
          onAnalysisComplete?.(data)
          if (!isExpanded) setIsExpanded(true)
        }
      }
    )
  }
  
  const handleApplyText = () => {
    if (analysis?.result && onTextImproved) {
      onTextImproved(analysis.result, analysis)
      toast.success('Geliştirilen metin uygulandı')
    }
  }
  
  const handleCopyResult = () => {
    if (analysis?.result) {
      navigator.clipboard.writeText(analysis.result)
      toast.success('Sonuç panoya kopyalandı')
    }
  }
  
  const handleClose = () => {
    setIsExpanded(false)
    setAnalysis(null)
    reset()
  }
  
  const analysisTypeLabels = {
    grammar: { label: 'Dilbilgisi', icon: Edit3, color: 'blue' },
    sentiment: { label: 'Duygu Analizi', icon: Heart, color: 'pink' },
    summarize: { label: 'Özet', icon: FileText, color: 'green' },
    suggest: { label: 'İyileştirme', icon: TrendingUp, color: 'purple' },
    general: { label: 'Genel Analiz', icon: Brain, color: 'indigo' }
  }
  
  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
          className="text-xs px-2 py-1 border rounded"
          disabled={isPending}
        >
          {analysisTypes.map(type => (
            <option key={type} value={type}>
              {analysisTypeLabels[type].label}
            </option>
          ))}
        </select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={isPending || !text.trim()}
          className="flex items-center space-x-2"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Brain className="h-3 w-3" />
          )}
          <span>AI Analiz</span>
        </Button>
        
        {analysis && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Analiz Edildi
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
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Type className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Metin Geliştiricisi</CardTitle>
              <CardDescription>
                Metninizi analiz edin ve AI önerileri ile geliştirin
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
        {/* Text Input */}
        {showTextArea && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Analiz Edilecek Metin</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="resize-none"
              disabled={isPending}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{text.length} / 5000 karakter</span>
              {text.length > 4500 && (
                <span className="text-orange-500">Karakter limiti aşılıyor</span>
              )}
            </div>
          </div>
        )}
        
        {/* Analysis Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Analiz Türü</label>
          <div className="flex flex-wrap gap-2">
            {analysisTypes.map((type) => {
              const config = analysisTypeLabels[type]
              const IconComponent = config.icon
              return (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  disabled={isPending}
                  className={cn(
                    'text-xs',
                    selectedType === type && `bg-${config.color}-500 hover:bg-${config.color}-600`
                  )}
                >
                  <IconComponent className="h-3 w-3 mr-1" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isPending || !text.trim()}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {selectedType === 'grammar' && 'Dilbilgisi kontrol ediliyor...'}
              {selectedType === 'sentiment' && 'Duygu analizi yapılıyor...'}
              {selectedType === 'summarize' && 'Özetleniyor...'}
              {selectedType === 'suggest' && 'İyileştirmeler hazırlanıyor...'}
              {selectedType === 'general' && 'Genel analiz yapılıyor...'}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Metni Analiz Et
            </>
          )}
        </Button>
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'Metin analizi sırasında bir hata oluştu'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <h4 className="font-semibold">AI Analiz Sonuçları</h4>
                    <Badge variant="secondary" className="text-xs">
                      {analysisTypeLabels[selectedType].label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResult}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Kopyala
                    </Button>
                    
                    {onTextImproved && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApplyText}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uygula
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Original vs Improved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Orijinal Metin</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                      <p className="whitespace-pre-wrap">{analysis.originalText}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                      {selectedType === 'grammar' && 'Düzeltilmiş Metin'}
                      {selectedType === 'sentiment' && 'Duygu Analizi'}
                      {selectedType === 'summarize' && 'Özet'}
                      {selectedType === 'suggest' && 'İyileştirme Önerileri'}
                      {selectedType === 'general' && 'Genel Değerlendirme'}
                    </label>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm border border-blue-200 dark:border-blue-800">
                      <p className="whitespace-pre-wrap">{analysis.result}</p>
                    </div>
                  </div>
                </div>
                
                {/* Token Usage */}
                {analysis.tokenUsage && (
                  <div className="flex items-center space-x-4 text-xs text-gray-500 border-t pt-3">
                    <div className="flex items-center space-x-1">
                      <Brain className="h-3 w-3" />
                      <span>NVIDIA AI</span>
                    </div>
                    <span>•</span>
                    <span>{analysis.tokenUsage.total_tokens} token kullanıldı</span>
                    <span>•</span>
                    <span>
                      {new Date(analysis.timestamp).toLocaleString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Quick Tips */}
        {!analysis && !isPending && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                  AI Metin Analizi Seçenekleri
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• <strong>Dilbilgisi:</strong> Yazım ve dilbilgisi hatalarını tespit eder ve düzeltir</li>
                  <li>• <strong>Duygu Analizi:</strong> Metnin duygusal tonunu ve etkisini analiz eder</li>
                  <li>• <strong>Özet:</strong> Uzun metinleri kısa ve öz hale getirir</li>
                  <li>• <strong>İyileştirme:</strong> Daha etkili ve akıcı yazım için öneriler verir</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export tipi
export type { AITextEnhancerProps }