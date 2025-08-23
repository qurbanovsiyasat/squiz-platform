import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  TrendingUp, 
  Eye, 
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Sparkles,
  BarChart3,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AIAnalysisStats {
  textAnalyses: number
  imageAnalyses: number
  suggestions: number
  totalTokensUsed: number
  lastActivity: string
}

interface AIInsightsProps {
  className?: string
  compact?: boolean
  showStats?: boolean
  recentAnalyses?: Array<{
    id: string
    type: 'text' | 'image' | 'suggestion'
    title: string
    timestamp: string
    status: 'completed' | 'pending' | 'error'
  }>
}

export default function AIInsights({
  className,
  compact = false,
  showStats = true,
  recentAnalyses = []
}: AIInsightsProps) {
  const [stats, setStats] = useState<AIAnalysisStats>({
    textAnalyses: 0,
    imageAnalyses: 0,
    suggestions: 0,
    totalTokensUsed: 0,
    lastActivity: new Date().toISOString()
  })
  const [activeTab, setActiveTab] = useState('overview')
  
  // Mock data - in real app, this would come from actual usage
  useEffect(() => {
    const mockStats: AIAnalysisStats = {
      textAnalyses: 15,
      imageAnalyses: 8,
      suggestions: 23,
      totalTokensUsed: 12500,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    }
    setStats(mockStats)
  }, [])
  
  const statCards = [
    {
      title: 'Metin Analizleri',
      value: stats.textAnalyses,
      icon: FileText,
      color: 'blue',
      description: 'Tamamlanan metin analizi'
    },
    {
      title: 'Goruntu Analizleri',
      value: stats.imageAnalyses,
      icon: ImageIcon,
      color: 'purple',
      description: 'Islenen goruntu dosyasi'
    },
    {
      title: 'AI Onerileri',
      value: stats.suggestions,
      icon: Lightbulb,
      color: 'yellow',
      description: 'Uretilen akilli oneri'
    },
    {
      title: 'Token Kullanimi',
      value: stats.totalTokensUsed,
      icon: Zap,
      color: 'green',
      description: 'Toplam AI token tuketimi'
    }
  ]
  
  const getTypeIcon = (type: 'text' | 'image' | 'suggestion') => {
    switch (type) {
      case 'text': return FileText
      case 'image': return ImageIcon
      case 'suggestion': return Lightbulb
      default: return Brain
    }
  }
  
  const getTypeColor = (type: 'text' | 'image' | 'suggestion') => {
    switch (type) {
      case 'text': return 'blue'
      case 'image': return 'purple'
      case 'suggestion': return 'yellow'
      default: return 'gray'
    }
  }
  
  const getStatusColor = (status: 'completed' | 'pending' | 'error') => {
    switch (status) {
      case 'completed': return 'green'
      case 'pending': return 'yellow'
      case 'error': return 'red'
      default: return 'gray'
    }
  }
  
  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">AI Ozet</h3>
              <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                <span>{stats.textAnalyses + stats.imageAnalyses} analiz</span>
                <span>•</span>
                <span>{stats.suggestions} oneri</span>
                <span>•</span>
                <span>{stats.totalTokensUsed} token</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Aktif
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Analiz Dashboard</CardTitle>
              <CardDescription>
                AI kullanim istatistikleri ve son aktiviteler
              </CardDescription>
            </div>
          </div>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Yenile
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Genel Bakis</TabsTrigger>
            <TabsTrigger value="activity">Son Aktiviteler</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            {showStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                  const IconComponent = stat.icon
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            'p-2 rounded-lg',
                            stat.color === 'blue' && 'bg-blue-100 dark:bg-blue-900',
                            stat.color === 'purple' && 'bg-purple-100 dark:bg-purple-900',
                            stat.color === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900',
                            stat.color === 'green' && 'bg-green-100 dark:bg-green-900'
                          )}>
                            <IconComponent className={cn(
                              'h-3 w-3',
                              stat.color === 'blue' && 'text-blue-600',
                              stat.color === 'purple' && 'text-purple-600',
                              stat.color === 'yellow' && 'text-yellow-600',
                              stat.color === 'green' && 'text-green-600'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                              {stat.title}
                            </p>
                            <p className="text-lg font-bold">
                              {stat.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {stat.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
            
            {/* Performance Chart Placeholder */}
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-sm">AI Kullanim Trendi</h4>
              </div>
              <div className="h-32 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Grafik verisi yukleniyor...</p>
                </div>
              </div>
            </Card>
            
            {/* Last Activity */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Son aktivite:</span>
              </div>
              <span>
                {new Date(stats.lastActivity).toLocaleString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit'
                })}
              </span>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            {recentAnalyses.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Son AI Aktiviteleri</span>
                </h4>
                
                {recentAnalyses.map((analysis, index) => {
                  const IconComponent = getTypeIcon(analysis.type)
                  return (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className={cn(
                        'p-2 rounded-full',
                        getTypeColor(analysis.type) === 'blue' && 'bg-blue-100 dark:bg-blue-900',
                        getTypeColor(analysis.type) === 'purple' && 'bg-purple-100 dark:bg-purple-900',
                        getTypeColor(analysis.type) === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900'
                      )}>
                        <IconComponent className={cn(
                          'h-3 w-3',
                          getTypeColor(analysis.type) === 'blue' && 'text-blue-600',
                          getTypeColor(analysis.type) === 'purple' && 'text-purple-600',
                          getTypeColor(analysis.type) === 'yellow' && 'text-yellow-600'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{analysis.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(analysis.timestamp).toLocaleString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-xs',
                          getStatusColor(analysis.status) === 'green' && 'bg-green-100 text-green-800',
                          getStatusColor(analysis.status) === 'yellow' && 'bg-yellow-100 text-yellow-800',
                          getStatusColor(analysis.status) === 'red' && 'bg-red-100 text-red-800'
                        )}
                      >
                        {analysis.status === 'completed' && 'Tamamlandi'}
                        {analysis.status === 'pending' && 'Bekliyor'}
                        {analysis.status === 'error' && 'Hata'}
                      </Badge>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Henuz AI aktivitesi bulunmuyor</p>
                <p className="text-xs mt-1">AI ozelliklerini kullanmaya baslayin</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export type { AIInsightsProps, AIAnalysisStats }