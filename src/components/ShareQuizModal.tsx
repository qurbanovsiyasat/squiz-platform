import { useState } from 'react'
import { Copy, Share2, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ShareQuizModalProps {
  isOpen: boolean
  onClose: () => void
  quiz: {
    id: string
    title: string
    description?: string
  }
}

export function ShareQuizModal({ isOpen, onClose, quiz }: ShareQuizModalProps) {
  const [copied, setCopied] = useState(false)
  
  // Generate the shareable quiz link
  const quizLink = `${window.location.origin}/quiz/${quiz.id}`
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quizLink)
      setCopied(true)
      toast.success('Quiz link copied to clipboard!')
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link. Please try again.')
    }
  }
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: quiz.description || 'Check out this quiz!',
          url: quizLink,
        })
      } catch (error) {
        // User cancelled sharing or sharing failed
        // Share cancelled or failed
      }
    } else {
      // Fallback to copy link
      handleCopyLink()
    }
  }
  
  const handleOpenInNewTab = () => {
    window.open(quizLink, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-primary-600" />
            <span>Share Quiz</span>
          </DialogTitle>
          <DialogDescription>
            Share this quiz with others using the link below
          </DialogDescription>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 py-4"
        >
          {/* Quiz Info */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {quiz.description}
              </p>
            )}
          </div>
          
          {/* Share Link */}
          <div className="space-y-2">
            <Label htmlFor="quiz-link">Quiz Link</Label>
            <div className="flex space-x-2">
              <Input
                id="quiz-link"
                value={quizLink}
                readOnly
                className="flex-1 bg-slate-50 dark:bg-slate-800"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="px-3"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleOpenInNewTab}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Quiz</span>
          </Button>
          
          {navigator.share ? (
            <Button
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          ) : (
            <Button
              onClick={handleCopyLink}
              className="flex items-center space-x-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareQuizModal