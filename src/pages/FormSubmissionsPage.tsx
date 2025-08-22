import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFormSubmissions } from '@/hooks/useForms'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { 
  ArrowLeft, 
  FileText, 
  Calendar,
  User,
  Download,
  Filter,
  Search,
  Eye
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDateTime } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function FormSubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: form, isLoading: formLoading } = useForm(id!)
  const { data: submissions, isLoading: submissionsLoading } = useFormSubmissions(id!)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  
  const isLoading = formLoading || submissionsLoading
  
  // Check if user is the form creator
  const isFormCreator = form && user && form.creator_id === user.id
  
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }
  
  if (!form) {
    return (
      <div className="max-w-2xl mx-auto text-center px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Form Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The form you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate('/forms')}>Back to Forms</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!isFormCreator) {
    return (
      <div className="max-w-2xl mx-auto text-center px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You can only view submissions for forms you created.
            </p>
            <Button onClick={() => navigate(`/forms/${form.id}`)}>View Form</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const exportSubmissions = () => {
    if (!submissions || submissions.length === 0) return
    
    // Convert submissions to CSV format
    const headers = ['Submission ID', 'Submitted At', 'Submitter']
    const fieldLabels = form.fields?.map(f => f.label) || []
    headers.push(...fieldLabels)
    
    const csvData = submissions.map(submission => {
      const row = [
        submission.id,
        formatDateTime(submission.submitted_at),
        submission.submitter_id || 'Anonymous'
      ]
      
      // Add field values
      form.fields?.forEach(field => {
        const value = submission.submission_data[field.id]
        if (Array.isArray(value)) {
          row.push(value.join(', '))
        } else {
          row.push(value || '')
        }
      })
      
      return row
    })
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_submissions.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
  
  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate(`/forms/${form.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Form Submissions
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {form.title} - {submissions?.length || 0} submissions
            </p>
          </div>
          {submissions && submissions.length > 0 && (
            <Button onClick={exportSubmissions} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Submissions ({submissions?.length || 0})</CardTitle>
              <CardDescription>
                Click on a submission to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!submissions || submissions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No submissions yet"
                  description="When people submit your form, their responses will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <motion.div
                      key={submission.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedSubmission?.id === submission.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  Submission #{submission.id.slice(-8)}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {submission.submitter_id ? 'Registered' : 'Anonymous'}
                              </Badge>
                              <Eye className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Submission Details */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
              <CardDescription>
                {selectedSubmission 
                  ? 'Viewing submission details'
                  : 'Select a submission to view details'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSubmission ? (
                <div className="space-y-4">
                  {/* Submission Meta */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Submission ID:</span>
                      <span className="font-mono text-xs">
                        {selectedSubmission.id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Submitted:</span>
                      <span>
                        {formatDateTime(selectedSubmission.submitted_at)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Type:</span>
                      <Badge variant="outline">
                        {selectedSubmission.submitter_id ? 'Registered User' : 'Anonymous'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Field Values */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 dark:text-white">Responses</h4>
                    {form.fields?.map((field) => {
                      const value = selectedSubmission.submission_data[field.id]
                      
                      return (
                        <div key={field.id} className="space-y-1">
                          <Label className="text-sm font-medium">
                            {field.label}
                            {field.is_required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-1">
                                {value.map((v, i) => (
                                  <Badge key={i} variant="secondary">
                                    {v}
                                  </Badge>
                                ))}
                              </div>
                            ) : value ? (
                              <p className="bg-slate-50 dark:bg-slate-800 rounded p-2 text-sm">
                                {value}
                              </p>
                            ) : (
                              <span className="text-slate-400 italic">No response</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Select a submission from the list to view its details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
