import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface QAQuestion {
  id: string
  title: string
  content: string
  author_id?: string
  tags: string[]
  views: number
  votes_score: number
  is_answered: boolean
  accepted_answer_id?: string
  category?: string
  image_url?: string
  created_at: string
  updated_at: string
  author?: {
    full_name: string
    avatar_url?: string
    role?: string
  }
  user_vote?: number
}

export interface QAAnswer {
  id: string
  content: string
  question_id: string
  author_id?: string
  parent_answer_id?: string
  votes_score: number
  is_accepted: boolean
  image_url?: string
  created_at: string
  updated_at: string
  author?: {
    full_name: string
    avatar_url?: string
    role?: string
  }
  user_vote?: number
}

// Get all Q&A questions with privacy-aware data fetching
export function useQAQuestions(
  category?: string,
  sortBy: 'recent' | 'votes' | 'unanswered' = 'recent'
) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['qa-questions', category, sortBy, user?.id],
    queryFn: async () => {
      try {
        // Use the new backend function with privacy support
        const { data, error } = await supabase.rpc('get_qa_questions_with_privacy', {
          p_category_filter: category || null,
          p_sort_by: sortBy,
          p_limit: 100,
          p_offset: 0
        })
        
        if (error) {
          console.error('Q&A questions query error:', error)
          throw error
        }
        
        if (!data || data.length === 0) {
          return []
        }
        
        // Get user votes if logged in
        if (user) {
          const questionIds = data.map((q: any) => q.id)
          const { data: votes } = await supabase
            .from('qa_votes')
            .select('question_id, vote_type')
            .eq('user_id', user.id)
            .in('question_id', questionIds)
            .is('answer_id', null)
          
          const voteMap = new Map(votes?.map(v => [v.question_id, v.vote_type]) || [])
          
          return data.map((question: any) => ({
            id: question.id,
            title: question.title,
            content: question.content,
            author_id: question.author_id,
            tags: question.tags || [],
            views: question.views || 0,
            votes_score: question.votes_score || 0,
            is_answered: question.is_answered || false,
            accepted_answer_id: question.accepted_answer_id,
            category: question.category_name,
            image_url: question.image_url,
            created_at: question.created_at,
            updated_at: question.updated_at,
            user_vote: voteMap.get(question.id) || null,
            author: {
              full_name: question.author_name // Privacy-aware from backend
            }
          })) as QAQuestion[]
        }
        
        return data.map((question: any) => ({
          id: question.id,
          title: question.title,
          content: question.content,
          author_id: question.author_id,
          tags: question.tags || [],
          views: question.views || 0,
          votes_score: question.votes_score || 0,
          is_answered: question.is_answered || false,
          accepted_answer_id: question.accepted_answer_id,
          category: question.category_name,
          image_url: question.image_url,
          created_at: question.created_at,
          updated_at: question.updated_at,
          author: {
            full_name: question.author_name // Privacy-aware from backend
          }
        })) as QAQuestion[]
      } catch (error) {
        console.error('Q&A questions fetch error:', error)
        return []
      }
    },
  })
}

// Enhanced search for Q&A questions
export function useSearchQAQuestions(
  searchQuery: string = '',
  category?: string,
  sortBy: 'recent' | 'votes' | 'unanswered' = 'recent',
  limit: number = 20,
  offset: number = 0
) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['search-qa-questions', searchQuery, category, sortBy, limit, offset, user?.id],
    queryFn: async () => {
      // Map sortBy values to match database function expectations
      let dbSortBy = sortBy
      if (sortBy === 'unanswered') {
        dbSortBy = 'unanswered'
      }
      
      // Use the enhanced search function from the backend
      const { data, error } = await supabase
        .rpc('search_qa_questions', {
          search_query: searchQuery,
          category_filter: category || null,
          sort_by: dbSortBy,
          limit_count: limit,
          offset_count: offset
        })
      
      if (error) throw error
      
      // Get user votes if logged in
      if (user && data) {
        const questionIds = data.map((q: any) => q.id)
        const { data: votes } = await supabase
          .from('qa_votes')
          .select('question_id, vote_type')
          .eq('user_id', user.id)
          .in('question_id', questionIds)
          .not('question_id', 'is', null)
        
        const voteMap = new Map(votes?.map(v => [v.question_id, v.vote_type]) || [])
        
        return data.map((question: any) => ({
          id: question.id,
          title: question.title,
          content: question.content,
          author_id: question.author_id,
          tags: question.tags || [],
          views: question.views || 0,
          votes_score: question.votes_score || 0,
          is_answered: question.is_answered || false,
          accepted_answer_id: question.accepted_answer_id,
          category: question.category_name,
          image_url: question.image_url,
          created_at: question.created_at,
          updated_at: question.updated_at,
          user_vote: voteMap.get(question.id) || null,
          author: {
            full_name: question.author_name || 'Anonymous'
          }
        }))
      }
      
      return data?.map((question: any) => ({
        id: question.id,
        title: question.title,
        content: question.content,
        author_id: question.author_id,
        tags: question.tags || [],
        views: question.views || 0,
        votes_score: question.votes_score || 0,
        is_answered: question.is_answered || false,
        accepted_answer_id: question.accepted_answer_id,
        category: question.category_name,
        image_url: question.image_url,
        created_at: question.created_at,
        updated_at: question.updated_at,
        author: {
          full_name: question.author_name || 'Anonymous'
        }
      })) as QAQuestion[] || []
    },
    enabled: true, // Always enabled for search
  })
}

// Get single Q&A question with answers
export function useQAQuestion(questionId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['qa-question', questionId, user?.id],
    queryFn: async () => {
      // Get question
      const { data: question, error: questionError } = await supabase
        .from('qa_questions')
        .select(`
          *,
          author:users!qa_questions_author_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('id', questionId)
        .maybeSingle()

      if (questionError) throw questionError
      if (!question) throw new Error('Question not found')

      // Get answers
      const { data: answers, error: answersError } = await supabase
        .from('qa_answers')
        .select(`
          *,
          author:users!qa_answers_author_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('question_id', questionId)
        .order('votes_score', { ascending: false })

      if (answersError) throw answersError

      // Get user votes if logged in
      let questionVote = null
      const answerVotes = new Map()
      
      if (user) {
        const { data: votes } = await supabase
          .from('qa_votes')
          .select('question_id, answer_id, vote_type')
          .eq('user_id', user.id)
          .or(`question_id.eq.${questionId},answer_id.in.(${answers?.map(a => a.id).join(',') || 'null'})`)
        
        votes?.forEach(vote => {
          if (vote.question_id === questionId) {
            questionVote = vote.vote_type
          }
          if (vote.answer_id) {
            answerVotes.set(vote.answer_id, vote.vote_type)
          }
        })
      }

      return {
        ...question,
        user_vote: questionVote,
        answers: answers?.map(answer => ({
          ...answer,
          user_vote: answerVotes.get(answer.id) || null
        })) || []
      }
    },
    enabled: !!questionId,
  })
}

// Create Q&A question
export function useCreateQAQuestion() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (questionData: Omit<QAQuestion, 'id' | 'author_id' | 'views' | 'votes_score' | 'is_answered' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated')

      const newQuestion = {
        ...questionData,
        author_id: user.id,
        views: 0,
        votes_score: 0,
        is_answered: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('qa_questions')
        .insert([newQuestion])
        .select()
        .single()

      if (error) throw error
      return data as QAQuestion
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions'] })
      toast.success('Question posted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to post question')
    }
  })
}

// Create Q&A answer with optional image support
export function useCreateQAAnswer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (answerData: Omit<QAAnswer, 'id' | 'author_id' | 'votes_score' | 'is_accepted' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated')

      const newAnswer = {
        ...answerData,
        author_id: user.id,
        votes_score: 0,
        is_accepted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('qa_answers')
        .insert([newAnswer])
        .select(`
          *,
          author:users!qa_answers_author_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data as QAAnswer
    },
    onSuccess: (_, { question_id }) => {
      queryClient.invalidateQueries({ queryKey: ['qa-question', question_id] })
      toast.success('Answer posted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to post answer')
    }
  })
}

// Vote on question
export function useVoteQAQuestion() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ questionId, voteType }: { questionId: string; voteType: 'up' | 'down' }) => {
      if (!user) throw new Error('User not authenticated')
      
      const voteValue = voteType === 'up' ? 1 : -1
      
      // Use new backend function for consistent voting
      const { data: result, error } = await supabase.rpc('vote_on_qa_question', {
        p_question_id: questionId,
        p_vote_type: voteValue
      })
      
      if (error) throw error
      return result
    },
    onSuccess: (data, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['qa-question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['qa-questions'] })
      toast.success('Vote recorded')
    },
    onError: (error: any) => {
      console.error('Vote error:', error)
      toast.error('Failed to vote')
    }
  })
}

// Vote on answer
export function useVoteQAAnswer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ answerId, voteType, questionId }: { answerId: string; voteType: 'up' | 'down'; questionId: string }) => {
      if (!user) throw new Error('User not authenticated')
      
      const voteValue = voteType === 'up' ? 1 : -1
      
      // Use new backend function for consistent voting
      const { data: result, error } = await supabase.rpc('vote_on_qa_answer', {
        p_answer_id: answerId,
        p_vote_type: voteValue
      })
      
      if (error) throw error
      return result
    },
    onSuccess: (data, { questionId, answerId }) => {
      queryClient.invalidateQueries({ queryKey: ['qa-question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['qa-answers', questionId] })
      toast.success('Vote recorded')
    },
    onError: (error: any) => {
      console.error('Vote error:', error)
      toast.error('Failed to vote')
    }
  })
}

// Increment question view count
export function useIncrementQuestionView() {
  return useMutation({
    mutationFn: async (questionId: string) => {
      // Use atomic RPC function for view increment
      const { error } = await supabase.rpc('increment_question_views', {
        question_id: questionId
      })
        
      if (error) {
        console.error('View increment error:', error)
      }
    },
  })
}

// Increment question views (alias for consistency)
export function useIncrementQuestionViews() {
  return useIncrementQuestionView()
}

// Accept an answer as the correct answer
export function useAcceptAnswer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ answerId, questionId }: { answerId: string; questionId: string }) => {
      if (!user) throw new Error('User not authenticated')

      // First, unaccept any previously accepted answer for this question
      await supabase
        .from('qa_answers')
        .update({ is_accepted: false })
        .eq('question_id', questionId)
        .eq('is_accepted', true)

      // Accept the new answer
      const { data, error } = await supabase
        .from('qa_answers')
        .update({ is_accepted: true })
        .eq('id', answerId)
        .select()
        .single()

      if (error) throw error

      // Update question to mark as answered
      await supabase
        .from('qa_questions')
        .update({ 
          is_answered: true,
          accepted_answer_id: answerId
        })
        .eq('id', questionId)

      return data
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['qa-question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['qa-questions'] })
      toast.success('Answer accepted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to accept answer')
    }
  })
}

// Get answers for a question
export function useQAAnswers(questionId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['qa-answers', questionId, user?.id],
    queryFn: async () => {
      const { data: answers, error } = await supabase
        .from('qa_answers')
        .select(`
          *,
          author:users!qa_answers_author_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('question_id', questionId)
        .order('votes_score', { ascending: false })

      if (error) throw error

      // Get user votes if logged in
      const answerVotes = new Map()
      
      if (user && answers) {
        const answerIds = answers.map(a => a.id)
        const { data: votes } = await supabase
          .from('qa_votes')
          .select('answer_id, vote_type')
          .eq('user_id', user.id)
          .in('answer_id', answerIds)
        
        votes?.forEach(vote => {
          if (vote.answer_id) {
            answerVotes.set(vote.answer_id, vote.vote_type)
          }
        })
      }
      
      return answers?.map(answer => ({
        ...answer,
        user_vote: answerVotes.get(answer.id) || null
      })) || []
    },
    enabled: !!questionId,
  })
}

// Vote on QA (unified hook for questions and answers)
export function useVoteQA() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, id, voteType, questionId }: { 
      type: 'question' | 'answer'
      id: string
      voteType: 1 | -1
      questionId?: string
    }) => {
      if (!user) throw new Error('User not authenticated')

      if (type === 'question') {
        const { data, error } = await supabase.rpc('handle_question_vote', {
          p_user_id: user.id,
          p_question_id: id,
          p_vote_type: voteType
        })
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.rpc('handle_answer_vote', {
          p_user_id: user.id,
          p_answer_id: id,
          p_vote_type: voteType
        })
        if (error) throw error
        return data
      }
    },
    onSuccess: (_, { type, id, questionId }) => {
      if (type === 'question') {
        queryClient.invalidateQueries({ queryKey: ['qa-question', id] })
        queryClient.invalidateQueries({ queryKey: ['qa-questions'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['qa-question', questionId] })
        queryClient.invalidateQueries({ queryKey: ['qa-answers', questionId] })
      }
    },
    onError: (error: any) => {
      toast.error('Failed to vote')
    }
  })
}

// Get user vote for a specific item
export function useUserVote(type: 'question' | 'answer', id: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user-vote', type, id, user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const column = type === 'question' ? 'question_id' : 'answer_id'
      const { data, error } = await supabase
        .from('qa_votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq(column, id)
        .maybeSingle()

      if (error) throw error
      return data?.vote_type || null
    },
    enabled: !!user && !!id,
  })
}

// Toggle like on Q&A question
export function useToggleQAQuestionLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (questionId: string) => {
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabase.rpc('toggle_qa_question_like', {
        p_question_id: questionId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (data, questionId) => {
      // Invalidate Q&A queries to update like counts
      queryClient.invalidateQueries({ queryKey: ['qa-questions'] })
      queryClient.invalidateQueries({ queryKey: ['qa-question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['qa-question-like', questionId] })
      
      // data should be an array with [liked, total_likes]
      const [liked, totalLikes] = data
      toast.success(liked ? 'Question liked!' : 'Like removed')
    },
    onError: (error: any) => {
      console.error('Q&A like toggle error:', error)
      toast.error('Failed to toggle like')
    }
  })
}

// Record Q&A question view
export function useRecordQAView() {
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { data, error } = await supabase.rpc('record_qa_view', {
        p_question_id: questionId
      })
      
      if (error) throw error
      return data
    },
    onError: (error: any) => {
      console.error('Record Q&A view error:', error)
      // Don't show error to user for view tracking
    }
  })
}
