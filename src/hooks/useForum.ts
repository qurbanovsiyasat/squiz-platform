import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface ForumPost {
  id: string
  title: string
  content: string
  author_id: string
  category?: string
  tags?: string[]
  views: number
  likes: number
  is_pinned: boolean
  is_locked: boolean
  image_url?: string
  shared_quiz_id?: string
  replies_count: number
  created_at: string
  updated_at: string
  author?: {
    id: string
    full_name?: string
    avatar_url?: string
    is_private: boolean
  }
  shared_quiz?: {
    id: string
    title: string
    description?: string
    difficulty: string
  }
}

export interface ForumReply {
  id: string
  post_id: string
  author_id: string
  content: string
  parent_reply_id?: string
  likes: number
  created_at: string
  updated_at: string
  author?: {
    id: string
    full_name?: string
    avatar_url?: string
    is_private: boolean
  }
}

// Get all forum posts
export function useForumPosts(category?: string) {
  return useQuery({
    queryKey: ['forum-posts', category],
    queryFn: async (): Promise<ForumPost[]> => {
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data: postsData, error } = await query
      if (error) {
        console.error('Forum posts error:', error)
        return []
      }
      
      if (!postsData || postsData.length === 0) {
        return []
      }
      
      // Manually fetch author data (following Supabase best practices)
      const authorIds = [...new Set(postsData.map(post => post.author_id))]
      const { data: authors } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, is_private')
        .in('id', authorIds)
      
      // Map posts with author data
      return postsData.map(post => ({
        ...post,
        author: authors?.find(a => a.id === post.author_id) || null
      })) as ForumPost[]
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get single forum post
export function useForumPost(postId: string) {
  return useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async (): Promise<ForumPost | null> => {
      const { data: post, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle()

      if (error) {
        console.error('Forum post error:', error)
        return null
      }
      if (!post) return null
      
      // Manually fetch author data
      const { data: author } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, is_private')
        .eq('id', post.author_id)
        .maybeSingle()
      
      // Manually fetch shared quiz data if exists
      let sharedQuiz = null
      if (post.shared_quiz_id) {
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('id, title, description, difficulty')
          .eq('id', post.shared_quiz_id)
          .maybeSingle()
        sharedQuiz = quiz
      }
      
      return {
        ...post,
        author,
        shared_quiz: sharedQuiz
      } as ForumPost
    },
    enabled: !!postId,
  })
}

// Get replies for a forum post
export function useForumReplies(postId: string) {
  return useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: async (): Promise<ForumReply[]> => {
      const { data: repliesData, error } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Forum replies error:', error)
        return []
      }
      
      if (!repliesData || repliesData.length === 0) {
        return []
      }
      
      // Manually fetch author data
      const authorIds = [...new Set(repliesData.map(reply => reply.author_id))]
      const { data: authors } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, is_private')
        .in('id', authorIds)
      
      return repliesData.map(reply => ({
        ...reply,
        author: authors?.find(a => a.id === reply.author_id) || null
      })) as ForumReply[]
    },
    enabled: !!postId,
  })
}

// Create a new forum post
export function useCreateForumPost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (post: {
      title: string
      content: string
      category?: string
      tags?: string[]
      image_url?: string
      shared_quiz_id?: string
    }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          title: post.title,
          content: post.content,
          category: post.category,
          tags: post.tags,
          image_url: post.image_url,
          shared_quiz_id: post.shared_quiz_id,
          author_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] })
      toast.success('Post created successfully')
    },
    onError: (error) => {
      console.error('Create forum post error:', error)
      toast.error('Failed to create post')
    },
  })
}

export function useShareQuizToForum() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      quizId: string
      title: string
      content: string
      category?: string
    }) => {
      if (!user) throw new Error('User not authenticated')

      const { data: result, error } = await supabase
        .from('forum_posts')
        .insert({
          title: data.title,
          content: data.content,
          category: data.category || 'Quiz Paylaşımı',
          shared_quiz_id: data.quizId,
          author_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] })
      toast.success('Quiz forum-da uğurla paylaşıldı')
    },
    onError: (error) => {
      console.error('Share quiz to forum error:', error)
      toast.error('Quiz paylaşılarkən xəta baş verdi')
    },
  })
}

// Toggle like on forum post
export function useToggleForumLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('toggle_like', {
        content_type: 'forum_post',
        content_id: postId,
        user_id: user.id
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] })
      queryClient.invalidateQueries({ queryKey: ['forum-like-status'] })
    },
    onError: (error) => {
      console.error('Toggle forum like error:', error)
      toast.error('Failed to update like')
    },
  })
}

// Get forum like status for current user
export function useForumLikeStatus(postId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['forum-like-status', postId, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false

      const { data, error } = await supabase
        .from('forum_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return !!data
    },
    enabled: !!user && !!postId,
  })
}