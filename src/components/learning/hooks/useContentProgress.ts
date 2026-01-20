'use client'

import { useState, useCallback } from 'react'
import { post, isSuccess } from '@/lib/api/client'
import type { SessionState } from './useLearningSession'
import type { Module } from '@/types'

export type ImmediateContext = {
  questionId: string
  questionText: string
  selectedAnswer: string
  wasCorrect: boolean
  attemptNumber: number
}

export function useContentProgress(
  sessionState: SessionState,
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>,
  currentModule: Module,
  effectiveCourseId: string,
  withOfflineSupport: (apiCall: () => Promise<boolean>, offlineData: Record<string, unknown>) => Promise<boolean>,
  onLessonComplete?: (lessonId: string) => void
) {
  const [contentComplete, setContentComplete] = useState(false)
  const [immediateContext, setImmediateContext] = useState<ImmediateContext | null>(null)

  // Derived values for external use (not used in callbacks to avoid stale closures)
  const currentLesson = currentModule.lessons[sessionState.currentLessonIndex]
  const _currentAtom = currentLesson?.atoms[sessionState.currentAtomIndex]
  const _isLastAtomInLesson = sessionState.currentAtomIndex >= (currentLesson?.atoms.length || 0) - 1
  const _isLastLesson = sessionState.currentLessonIndex >= currentModule.lessons.length - 1

  // Handle content completion (video watched, reading done, quiz passed)
  // Uses functional setSessionState to avoid stale closures
  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    // Mark atom as completed using functional update to get latest state
    setSessionState(prev => {
      if (prev.completedAtomIds.includes(atomId)) {
        return prev // No change needed
      }
      return {
        ...prev,
        completedAtomIds: [...prev.completedAtomIds, atomId],
      }
    })

    // Get current lesson/atom from module directly to avoid stale closure
    setSessionState(prev => {
      const lesson = currentModule.lessons[prev.currentLessonIndex]
      const atom = lesson?.atoms[prev.currentAtomIndex]
      const progressType = atom?.type === 'quiz' ? 'quiz_result' : 'atom_complete'

      // Queue progress update with offline support (fire and forget)
      withOfflineSupport(
        async () => {
          const response = await post<{ success: boolean }>('/api/progress/sync', {
            type: progressType,
            atomId,
            lessonId: lesson?.id,
            courseId: effectiveCourseId,
            quizScore: score,
            timestamp: Date.now(),
          })
          return isSuccess(response)
        },
        {
          type: progressType,
          atomId,
          lessonId: lesson?.id,
          courseId: effectiveCourseId,
          result: score !== undefined ? { score, passed: score >= 70 } : undefined,
        }
      )

      return prev // No state change here, just side effect
    })

    setContentComplete(true)
  }, [currentModule, effectiveCourseId, withOfflineSupport, setSessionState])

  // Handle continue button
  // Uses functional setSessionState to compute derived values from latest state
  const handleContinue = useCallback(() => {
    setSessionState(prev => {
      // Compute current values from latest state
      const lesson = currentModule.lessons[prev.currentLessonIndex]
      const atomCount = lesson?.atoms?.length ?? 0
      const isLastAtom = prev.currentAtomIndex >= atomCount - 1
      const isLastLessonInModule = prev.currentLessonIndex >= currentModule.lessons.length - 1

      if (isLastAtom) {
        // Complete current lesson if not already completed
        const newCompletedLessons = prev.completedLessonIds.includes(lesson.id)
          ? prev.completedLessonIds
          : [...prev.completedLessonIds, lesson.id]

        // Notify parent of lesson completion
        if (!prev.completedLessonIds.includes(lesson.id)) {
          onLessonComplete?.(lesson.id)

          // Queue lesson completion with offline support (fire and forget)
          withOfflineSupport(
            async () => {
              const response = await post<{ success: boolean }>('/api/progress/sync', {
                type: 'lesson_complete',
                lessonId: lesson.id,
                courseId: effectiveCourseId,
                timestamp: Date.now(),
              })
              return isSuccess(response)
            },
            {
              type: 'lesson_complete',
              lessonId: lesson.id,
              courseId: effectiveCourseId,
            }
          )
        }

        if (!isLastLessonInModule) {
          // Move to next lesson
          return {
            ...prev,
            completedLessonIds: newCompletedLessons,
            currentLessonIndex: prev.currentLessonIndex + 1,
            currentAtomIndex: 0,
          }
        } else {
          // Last lesson - just mark complete
          return {
            ...prev,
            completedLessonIds: newCompletedLessons,
          }
        }
      } else {
        // Move to next atom
        return {
          ...prev,
          currentAtomIndex: prev.currentAtomIndex + 1,
        }
      }
    })

    setContentComplete(false)
  }, [currentModule, onLessonComplete, effectiveCourseId, withOfflineSupport, setSessionState])

  // Navigate to previous atom
  const handlePrevious = useCallback(() => {
    if (sessionState.currentAtomIndex > 0) {
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex - 1,
      }))
    } else if (sessionState.currentLessonIndex > 0) {
      const prevLesson = currentModule.lessons[sessionState.currentLessonIndex - 1]
      setSessionState(prev => ({
        ...prev,
        currentLessonIndex: prev.currentLessonIndex - 1,
        currentAtomIndex: (prevLesson?.atoms.length || 1) - 1,
      }))
    }
    setContentComplete(false)
  }, [sessionState.currentAtomIndex, sessionState.currentLessonIndex, currentModule.lessons, setSessionState])

  // Handle quiz answer (for immediate context)
  const handleQuizAnswer = useCallback((details: ImmediateContext) => {
    setImmediateContext(details)
  }, [])

  // Handle quiz failure - reset to first atom for review
  const handleQuizFail = useCallback((_atomId: string, _score: number) => {
    // Go back to the first atom of this lesson (video/reading) to review
    setSessionState(prev => ({
      ...prev,
      currentAtomIndex: 0,
    }))
    setContentComplete(false)
  }, [setSessionState])

  // Skip to quiz atom
  const handleSkipToQuiz = useCallback(() => {
    const quizIndex = currentLesson?.atoms.findIndex(atom => atom.type === 'quiz')
    if (quizIndex !== undefined && quizIndex >= 0) {
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: quizIndex,
      }))
      setContentComplete(false)
    }
  }, [currentLesson, setSessionState])

  return {
    contentComplete,
    setContentComplete,
    immediateContext,
    setImmediateContext,
    handleContentComplete,
    handleContinue,
    handlePrevious,
    handleQuizAnswer,
    handleQuizFail,
    handleSkipToQuiz,
  }
}
