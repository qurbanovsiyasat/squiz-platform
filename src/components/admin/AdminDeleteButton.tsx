import React, { useState } from 'react'
import { useAdmin } from '@/contexts/AdminContext'
import { Button } from '@/components/ui/Button'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AdminDeleteButtonProps {
  itemType: 'qa_question' | 'qa_answer' | 'form' | 'form_reply' | 'quiz'
  itemId: string
  itemName?: string
  onDeleted?: () => void
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'icon' | 'button'
  className?: string
}

const getDeleteConfig = (itemType: string) => {
  const configs = {
    qa_question: {
      function: 'delete_qa_question',
      paramName: 'p_question_id',
      title: 'Delete Question',
      description: 'Are you sure you want to delete this Q&A question? All associated answers will also be deleted.',
      requiredRole: 'admin',
      invalidateQueries: ['qa-questions']
    },
    qa_answer: {
      function: 'delete_qa_answer',
      paramName: 'answer_id',
      title: 'Delete Answer',
      description: 'Are you sure you want to delete this answer?',
      requiredRole: 'admin',
      invalidateQueries: ['qa-questions']
    },
    form: {
      function: 'delete_form',
      paramName: 'p_form_id',
      title: 'Delete Form',
      description: 'Are you sure you want to delete this form? All submissions and replies will also be deleted.',
      requiredRole: 'admin',
      invalidateQueries: ['forms']
    },
    form_reply: {
      function: 'delete_form_reply',
      paramName: 'reply_id',
      title: 'Delete Reply',
      description: 'Are you sure you want to delete this reply?',
      requiredRole: 'admin',
      invalidateQueries: ['form-replies']
    },
    quiz: {
      function: 'delete_quiz',
      paramName: 'p_quiz_id',
      title: 'Delete Quiz',
      description: 'Are you sure you want to delete this quiz? All results and questions will also be deleted.',
      requiredRole: 'super_admin',
      invalidateQueries: ['quizzes']
    }
  }
  return configs[itemType]
}

export function AdminDeleteButton({
  itemType,
  itemId,
  itemName,
  onDeleted,
  size = 'sm',
  variant = 'icon',
  className = ''
}: AdminDeleteButtonProps) {
  const { isAdmin, isSuperAdmin } = useAdmin()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const queryClient = useQueryClient()
  
  const config = getDeleteConfig(itemType)

  // Always define mutation hook unconditionally
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!config) throw new Error('Invalid config')
      const { data, error } = await supabase.rpc(config.function, {
        [config.paramName]: itemId
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (!config) return
      config.invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      })
      toast.success(`${config?.title.split(' ')[1] ?? 'Item'} deleted successfully`)
      setShowDeleteModal(false)
      onDeleted?.()
    },
    onError: (error: any) => {
      console.error(`Delete ${itemType} error:`, error)
      toast.error(error.message || `Failed to delete ${itemType.replace('_', ' ')}`)
    }
  })

  if (!config) {
    console.error(`Unknown item type: ${itemType}`)
    return null
  }

  // Check permissions
  const hasPermission = config.requiredRole === 'admin' 
    ? (isAdmin || isSuperAdmin)
    : isSuperAdmin
  
  if (!hasPermission) {
    return null
  }
  const handleDelete = () => {
    deleteMutation.mutate()
  }
  
  if (variant === 'icon') {
    return (
      <>
        <Button
          size={size}
          variant="outline"
          onClick={() => setShowDeleteModal(true)}
          className={`text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ${className}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title={config.title}
          description={config.description}
          itemName={itemName}
          isPending={deleteMutation.isPending}
        />
      </>
    )
  }
  
  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={() => setShowDeleteModal(true)}
        className={`text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ${className}`}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={config.title}
        description={config.description}
        itemName={itemName}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
