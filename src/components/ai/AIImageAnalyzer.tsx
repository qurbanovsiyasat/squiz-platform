import React, { useState } from 'react'
import { useAIImageAnalysis, AIImageAnalysisResponse } from '@/hooks/useAI'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Brain, 
  Image as ImageIcon, 
  Loader2, 
  Sparkles, 
  Eye,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Zap,
  X,
  FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AIImageAnalyzerProps {
  imageUrl: string
  imageName?: string
  onAnalysisComplete?: (analysis: AIImageAnalysisResponse) => void
  className?: string
  compact?: boolean
  autoAnalyze?: boolean
}

export default function AIImageAnalyzer({
  imageUrl,
  imageName,
  onAnalysisComplete,
  className,
  compact = false,
  autoAnalyze = false
}: AIImageAnalyzerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [analysisType, setAnalysisType] = useState<'general' | 'ocr' | 'quality'>('general')
  const [analysis, setAnalysis] = useState<AIImageAnalysisResponse | null>(null)
  
  const { mutate: analyzeImage, isPending, error, reset } = useAIImageAnalysis()
  
  // Auto-analyze on mount if enabled
  React.useEffect(() => {
    if (autoAnalyze && imageUrl) {
      handleAnalyze()
    }
  }, [autoAnalyze, imageUrl])
  
  const handleAnalyze = () => {
    if (!imageUrl) return
    
    analyzeImage(
      { imageUrl, analysisType },
      {
        onSuccess: (data) => {
          setAnalysis(data)
          onAnalysisComplete?.(data)
          if (!isExpanded) setIsExpanded(true)
        }
      }
    )
  }
  
  const handleClose = () => {
    setIsExpanded(false)
    setAnalysis(null)
    reset()
  }
  
  const analysisTypeLabels = {
    general: 'Genel Analiz',
    ocr: 'Metin Tanıma',
    quality: 'Kalite Değerlendirme'
  }
  
  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={isPending || !imageUrl}
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
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Görüntü Analizi</CardTitle>
              <CardDescription>
                {imageName ? `${imageName} dosyası için AI analizi` : 'Yüklenen görüntü için AI analizi'}
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
        {/* Analysis Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Analiz Türü</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysisTypeLabels).map(([type, label]) => (
              <Button
                key={type}
                variant={analysisType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisType(type as typeof analysisType)}
                disabled={isPending}
                className="text-xs"
              >
                {type === 'general' && <Eye className="h-3 w-3 mr-1" />}
                {type === 'ocr' && <FileText className="h-3 w-3 mr-1" />}
                {type === 'quality' && <CheckCircle className="h-3 w-3 mr-1" />}
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isPending || !imageUrl}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analiz Ediliyor...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Görüntüyü Analiz Et
            </>
          )}
        </Button>
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'Analiz sırasında bir hata oluştu'}
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
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <h4 className="font-semibold">AI Analiz Sonuçları</h4>
                  <Badge variant="secondary" className="text-xs">
                    {analysisTypeLabels[analysisType as keyof typeof analysisTypeLabels]}
                  </Badge>
                </div>
                
                {/* Confidence Score */}
                {analysis.confidence && (
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Güven Skoru: {Math.round(analysis.confidence * 100)}%</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analysis.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Analysis Content */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {analysis.analysis}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-3 w-3" />
                    <span>NVIDIA AI</span>
                  </div>
                  <span>
                    {new Date(analysis.timestamp).toLocaleString('tr-TR', {
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
        {!analysis && !isPending && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                  AI Görüntü Analizi Hakkında
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• <strong>Genel Analiz:</strong> Görüntü içeriği, renk paleti, kalite değerlendirmesi</li>
                  <li>• <strong>Metin Tanıma:</strong> Görüntüdeki metinleri tespit eder ve okur</li>
                  <li>• <strong>Kalite:</strong> Görüntü kalitesi ve uygunluk analizi</li>
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
export type { AIImageAnalyzerProps }