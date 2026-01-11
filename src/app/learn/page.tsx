'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CoachLearningView } from '@/components/learning/CoachLearningView'
import { useUser } from '@/store/unifiedStore'

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
  const handleLessonComplete = (completedLessonId: string) => {
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
      <CoachLearningView
        lessonId={lessonId}
        courseId={courseId}
        onExit={handleExit}
        onLessonComplete={handleLessonComplete}
      />
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
