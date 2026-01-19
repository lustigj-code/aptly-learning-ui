'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CoachLearningView } from '@/components/learning/CoachLearningView'
import { useUser } from '@/store/userProfileStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// Custom error fallback for learning view
function LearningErrorFallback({ onReset, onGoHome }: { onReset: () => void; onGoHome: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-light-grey/30 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            Learning session interrupted
          </h2>
          <p className="text-gray-600">
            Something went wrong while loading your lesson. Your progress has been saved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

function LearnPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useUser()

  // Get lesson/course from URL params
  const lessonId = searchParams.get('lesson') || undefined
  const courseId = searchParams.get('course') || undefined

  // Handle exit - go back to dashboard
  const handleExit = () => {
    router.push('/dashboard')
  }

  // Handle lesson completion - only redirect when module is complete
  const handleLessonComplete = (_completedLessonId: string) => {
    // Do nothing on individual lesson completion
    // CoachLearningView handles advancing to next lesson
    // Only redirect when user clicks exit or completes entire module
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-grey/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🦉</span>
          </div>
          <p className="text-grey">Loading your session...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="h-screen">
      <ErrorBoundary
        fallback={
          <LearningErrorFallback
            onReset={() => window.location.reload()}
            onGoHome={() => router.push('/dashboard')}
          />
        }
        onError={(error, errorInfo) => {
          console.error('[Learn Page] Error in learning view:', error, errorInfo)
        }}
      >
        <CoachLearningView
          lessonId={lessonId}
          courseId={courseId}
          onExit={handleExit}
          onLessonComplete={handleLessonComplete}
        />
      </ErrorBoundary>
    </div>
  )
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-light-grey/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🦉</span>
          </div>
          <p className="text-grey">Loading...</p>
        </div>
      </div>
    }>
      <LearnPageContent />
    </Suspense>
  )
}
