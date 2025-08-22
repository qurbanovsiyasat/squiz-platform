import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForumPosts, useToggleForumLike, useForumLikeStatus } from '@/hooks/useForum'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { Search, Plus, MessageSquare, Eye, Heart, Pin, Lock, BookOpen, Share } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function ForumPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  
  const { data: posts = [], isLoading, error } = useForumPosts(categoryFilter || undefined)
  const toggleLikeMutation = useToggleForumLike()

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories = ['Ümumi', 'Suallar', 'Müzakirə', 'Köməklik', 'Təkliflər', 'Quiz Paylaşımı', 'Digər']

  const getDisplayName = (author: any) => {
    if (!author) return 'Anonim'
    if (author.is_private) return 'Abituriyent'
    return author.full_name || 'Abituriyent'
  }

  const handleLikePost = (postId: string) => {
    if (!user) {
      toast.error('Bəyənmək üçün giriş edin')
      return
    }
    toggleLikeMutation.mutate({ postId })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              İcma Forumu
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Suallarınızı soruşun, təcrübənizi paylaşın və digər istifadəçilərlə əlaqə qurun
            </p>
          </div>
          <Link to="/forum/create">
            <Button size="lg" className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Yeni yazı</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Forum yazılarını axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kateqoriya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forum Posts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Author Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {post.author?.avatar_url ? (
                          <img 
                            src={post.author.avatar_url} 
                            alt={post.author.full_name} 
                            className="w-12 h-12 rounded-full" 
                          />
                        ) : (
                          <span className="text-white font-medium">
                            {post.author?.full_name?.charAt(0) || 'A'}
                          </span>
                        )}
                      </div>
                      
                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {post.is_pinned && (
                                <Pin className="h-4 w-4 text-primary-600" />
                              )}
                              {post.is_locked && (
                                <Lock className="h-4 w-4 text-slate-400" />
                              )}
                              {post.shared_quiz_id && (
                                <BookOpen className="h-4 w-4 text-blue-600" />
                              )}
                              <Link 
                                to={`/forum/${post.id}`}
                                className="font-semibold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              >
                                {post.title}
                              </Link>
                            </div>
                            
                            {/* Shared Quiz Info */}
                            {post.shared_quiz && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="font-medium text-blue-900 dark:text-blue-100">
                                    Paylaşılan Quiz
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {post.shared_quiz.difficulty}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                                  {post.shared_quiz.title}
                                </h4>
                                {post.shared_quiz.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {post.shared_quiz.description.substring(0, 100)}...
                                  </p>
                                )}
                                <Link 
                                  to={`/quizzes/${post.shared_quiz.id}`}
                                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  Quiz'ə bax →
                                </Link>
                              </div>
                            )}
                            
                            <p className="text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                              {post.content}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6 text-sm text-slate-500">
                                <span>
                                  {getDisplayName(post.author)}
                                </span>
                                <span>
                                  {formatDate(post.created_at)}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-4 w-4" />
                                  <span>{post.views}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>{post.replies_count || 0}</span>
                                </div>
                              </div>
                              
                              {/* Like button */}
                              <PostLikeButton 
                                postId={post.id}
                                likes={post.likes}
                                onLike={handleLikePost}
                              />
                            </div>
                          </div>
                          
                          {/* Category & Tags */}
                          <div className="flex flex-col items-end space-y-2">
                            {post.category && (
                              <Badge variant="secondary">
                                {post.category}
                              </Badge>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {post.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {post.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{post.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Forum yazısı tapılmadı
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Hələ ki forum yazısı yoxdur. İlk yazını sən yaz!
            </p>
            <Link to="/forum/create">
              <Button className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>İlk yazını yaz</span>
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Post Like Button Component
function PostLikeButton({ postId, likes, onLike }: { postId: string; likes: number; onLike: (postId: string) => void }) {
  const { data: isLiked } = useForumLikeStatus(postId)
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onLike(postId)}
      className={`flex items-center space-x-1 ${isLiked ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-slate-500 hover:text-red-600'}`}
    >
      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
      <span>{likes}</span>
    </Button>
  )
}