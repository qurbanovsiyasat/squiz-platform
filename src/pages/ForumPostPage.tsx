import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForumPost, useForumReplies } from '@/hooks/useForum'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageSquare, Eye, Heart, Pin, Lock, BookOpen, Calendar, User, Image as ImageIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { data: post, isLoading: postLoading, error: postError } = useForumPost(id!)
  const { data: replies = [], isLoading: repliesLoading } = useForumReplies(id!)
  
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  const getDisplayName = (author: any) => {
    if (!author) return 'Anonim'
    if (author.is_private) return 'Abituriyent'
    return author.full_name || 'Abituriyent'
  }

  if (postLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (postError || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Forum Yazısı Tapılmadı</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Axtardığınız forum yazısı mövcud deyil və ya silinib.
            </p>
            <Button onClick={() => navigate('/forum')}>Foruma qayıt</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/forum" 
          className="inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Foruma qayıt
        </Link>
      </motion.div>

      {/* Main Post */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  {post.is_pinned && <Pin className="h-5 w-5 text-blue-600" />}
                  {post.is_locked && <Lock className="h-5 w-5 text-slate-400" />}
                  {post.shared_quiz_id && <BookOpen className="h-5 w-5 text-green-600" />}
                  {post.category && (
                    <Badge variant="secondary">{post.category}</Badge>
                  )}
                </div>
                
                <CardTitle className="text-2xl mb-2">{post.title}</CardTitle>
                
                <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{getDisplayName(post.author)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{post.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes}</span>
                  </div>
                </div>
                
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {post.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Shared Quiz */}
            {post.shared_quiz && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Paylaşılan Quiz
                  </span>
                  <Badge variant="outline">{post.shared_quiz.difficulty}</Badge>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {post.shared_quiz.title}
                </h4>
                {post.shared_quiz.description && (
                  <p className="text-slate-600 dark:text-slate-400 mb-3">
                    {post.shared_quiz.description}
                  </p>
                )}
                <Link 
                  to={`/quizzes/${post.shared_quiz.id}`}
                  className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                >
                  Quiz'ə bax →
                </Link>
              </div>
            )}
            
            {/* Post Content */}
            <div className="prose max-w-none mb-6">
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                {post.content}
              </p>
            </div>
            
            {/* Post Images */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5 text-slate-600" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    Şəkillər ({post.image_urls.length})
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {post.image_urls.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={imageUrl} 
                        alt={`Post image ${index + 1}`}
                        className="w-full h-auto max-h-96 object-cover rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="text-xs"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          Böyük görmək
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Replies Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Cavablar ({replies.length})</span>
            </CardTitle>
            {replies.length === 0 && (
              <CardDescription>
                Hələ ki bu yazıya heç bir cavab verilməyib. İlk cavab verən siz olun!
              </CardDescription>
            )}
          </CardHeader>
          
          {replies.length > 0 && (
            <CardContent>
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {getDisplayName(reply.author)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatDate(reply.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  )
}