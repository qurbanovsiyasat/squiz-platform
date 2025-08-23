import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from '@/contexts/QueryProvider'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AdminProvider } from '@/contexts/AdminContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import AIChat from '@/components/AIChat'

// Layout components
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import BottomNavigation from '@/components/layout/BottomNavigation'

// Page components
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import QuizzesPage from '@/pages/QuizzesPage'
import QuizDetailPage from '@/pages/QuizDetailPage'
import QuizEditPage from '@/pages/QuizEditPage'
import QuizTakePage from '@/pages/QuizTakePage'
import QuizResultPage from '@/pages/QuizResultPage'
import CreateQuizPage from '@/pages/CreateQuizPage'
import ForumPage from '@/pages/ForumPage'
import ForumPostPage from '@/pages/ForumPostPage'
import CreateForumPostPage from '@/pages/CreateForumPostPage'
import FormDetailPage from '@/pages/FormDetailPage'
import FormsPage from '@/pages/FormsPage'
import CreateFormPage from '@/pages/CreateFormPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import AdminPanel from '@/pages/AdminPanel'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import SuperAdminPanel from '@/pages/SuperAdminPanel'
import UserStatsPage from '@/pages/UserStatsPage'
import FormSharePage from '@/pages/FormSharePage'
import FormSubmissionPage from '@/pages/FormSubmissionPage'
import QAPage from '@/pages/QAPage'
import QAQuestionPage from '@/pages/QAQuestionPage'
import CreateQAQuestionPage from '@/pages/CreateQAQuestionPage'
import AuthCallback from '@/pages/AuthCallback'
import LoadingPage from '@/pages/LoadingPage'
import AboutPage from '@/pages/AboutPage'
import FeaturesPage from '@/pages/FeaturesPage'
import ContactPage from '@/pages/ContactPage'
import SocialMediaPage from '@/pages/SocialMediaPage'
import GeminiTestPage from '@/pages/GeminiTestPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingPage />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  
  if (loading) {
    return <LoadingPage />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth()
  
  if (loading) {
    return <LoadingPage />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}



function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  if (!user) {
    return (
      <div className="min-h-screen bg-soft-grey">
        <Navbar />
        <main>{children}</main>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-soft-grey">
      {/* Desktop Sidebar */}
      <Sidebar isOpen={true} isMobile={false} />
      
      {/* Mobile Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isMobile={true} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-soft-grey pb-20 lg:pb-0">
          {children}
        </main>
        
        {/* Bottom Navigation for Mobile */}
        <BottomNavigation />
      </div>
      
      {/* AI Chat */}
      <AIChat />
    </div>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes" element={
            <ProtectedRoute>
              <QuizzesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes/create" element={
            <ProtectedRoute>
              <CreateQuizPage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes/:id" element={
            <ProtectedRoute>
              <QuizDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes/:id/edit" element={
            <ProtectedRoute>
              <QuizEditPage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes/:id/take" element={
            <ProtectedRoute>
              <QuizTakePage />
            </ProtectedRoute>
          } />
          
          <Route path="/quizzes/:quizId/results/:resultId" element={
            <ProtectedRoute>
              <QuizResultPage />
            </ProtectedRoute>
          } />
          
          <Route path="/forum" element={
            <ProtectedRoute>
              <ForumPage />
            </ProtectedRoute>
          } />
          
          <Route path="/forum/create" element={
            <ProtectedRoute>
              <CreateForumPostPage />
            </ProtectedRoute>
          } />
          
          <Route path="/forum/:id" element={
            <ProtectedRoute>
              <ForumPostPage />
            </ProtectedRoute>
          } />
          
          <Route path="/qa" element={
            <ProtectedRoute>
              <QAPage />
            </ProtectedRoute>
          } />
          
          <Route path="/qa/create" element={
            <ProtectedRoute>
              <CreateQAQuestionPage />
            </ProtectedRoute>
          } />
          
          <Route path="/qa/:id" element={
            <ProtectedRoute>
              <QAQuestionPage />
            </ProtectedRoute>
          } />
          
          <Route path="/forms" element={
            <ProtectedRoute>
              <FormsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/forms/create" element={
            <ProtectedRoute>
              <CreateFormPage />
            </ProtectedRoute>
          } />
          
          <Route path="/form/:id" element={
            <ProtectedRoute>
              <FormDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/form/:id/submit" element={
            <ProtectedRoute>
              <FormSubmissionPage />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/:id" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/social-media" element={
            <ProtectedRoute>
              <SocialMediaPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } />
          
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/super" element={
            <SuperAdminRoute>
              <SuperAdminPanel />
            </SuperAdminRoute>
          } />
          
          <Route path="/stats" element={
            <ProtectedRoute>
              <UserStatsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/form/:id/share" element={
            <ProtectedRoute>
              <FormSharePage />
            </ProtectedRoute>
          } />
          
          <Route path="/gemini-test" element={
            <ProtectedRoute>
              <GeminiTestPage />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="squiz-theme">
        <QueryProvider>
          <AuthProvider>
            <AdminProvider>
              <LanguageProvider>
                <AppRoutes />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              </LanguageProvider>
            </AdminProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App