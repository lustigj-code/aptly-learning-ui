'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Module, Lesson } from '@/types'

// ============================================
// TYPES
// ============================================

export type SessionState = {
  courseId: string
  moduleId: string
  currentLessonIndex: number
  currentAtomIndex: number
  completedAtomIds: string[]
  completedLessonIds: string[]
}

// ============================================
// SESSION STORAGE
// ============================================
// SECURITY NOTE: Only non-sensitive data is stored in localStorage:
// - courseId, moduleId (public identifiers)
// - currentLessonIndex, currentAtomIndex (progress indices)
// - completedAtomIds, completedLessonIds (progress arrays)
// NEVER store: tokens, credentials, PII, or user-identifiable data here

const SESSION_KEY = 'aptly_learning_session_v2'

function saveSession(state: SessionState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state))
  }
}

function isValidSessionState(obj: unknown): obj is SessionState {
  if (!obj || typeof obj !== 'object') return false
  const session = obj as Record<string, unknown>
  return (
    typeof session.courseId === 'string' &&
    typeof session.moduleId === 'string' &&
    typeof session.currentLessonIndex === 'number' &&
    typeof session.currentAtomIndex === 'number' &&
    Array.isArray(session.completedAtomIds) &&
    Array.isArray(session.completedLessonIds) &&
    session.currentLessonIndex >= 0 &&
    session.currentAtomIndex >= 0
  )
}

function loadSession(): SessionState | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(SESSION_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (isValidSessionState(parsed)) {
        return parsed
      }
      // Invalid session data, clear it
      localStorage.removeItem(SESSION_KEY)
      return null
    } catch {
      // Corrupted JSON, clear it
      localStorage.removeItem(SESSION_KEY)
      return null
    }
  }
  return null
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}

// ============================================
// MULTI-TAB SYNC
// ============================================
// When localStorage is modified in another tab, the 'storage' event fires
// We use this to sync session state across tabs and prevent conflicts

type StorageEventHandler = (newState: SessionState | null) => void;

function subscribeToStorageChanges(onStorageChange: StorageEventHandler): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorageEvent = (event: StorageEvent) => {
    // Only respond to changes to our session key
    if (event.key !== SESSION_KEY) return;

    // If the key was deleted
    if (event.newValue === null) {
      onStorageChange(null);
      return;
    }

    // Parse and validate the new value
    try {
      const parsed = JSON.parse(event.newValue);
      if (isValidSessionState(parsed)) {
        onStorageChange(parsed);
      }
    } catch {
      // Invalid JSON, ignore
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find the next uncompleted lesson in a module
 * Returns the lesson and its index, or null if all lessons are complete
 */
export function findNextUncompletedLesson(
  module: Module,
  lessonsCompleted: string[],
  startIndex: number = 0
): { lesson: Lesson; index: number } | null {
  for (let i = startIndex; i < module.lessons.length; i++) {
    const lesson = module.lessons[i]
    if (!lessonsCompleted.includes(lesson.id)) {
      return { lesson, index: i }
    }
  }
  return null // All lessons in module are completed
}

// ============================================
// HOOK
// ============================================

export function useLearningSession(
  courseId: string,
  moduleId: string,
  currentModule: Module,
  serverLessonsCompleted: string[]
) {
  // Initialize session state from localStorage or defaults
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const saved = loadSession()
    // Only restore session if both courseId and moduleId match
    if (saved && saved.courseId === courseId && saved.moduleId === moduleId) {
      // Bounds check: ensure indices are within current module's bounds
      const lessonCount = currentModule.lessons?.length ?? 0
      const validLessonIndex = Math.min(
        Math.max(0, saved.currentLessonIndex),
        Math.max(0, lessonCount - 1)
      )

      const atomCount = currentModule.lessons?.[validLessonIndex]?.atoms?.length ?? 0
      const validAtomIndex = Math.min(
        Math.max(0, saved.currentAtomIndex),
        Math.max(0, atomCount - 1)
      )

      return {
        ...saved,
        currentLessonIndex: validLessonIndex,
        currentAtomIndex: validAtomIndex,
      }
    }
    return {
      courseId,
      moduleId,
      currentLessonIndex: 0,
      currentAtomIndex: 0,
      completedAtomIds: [],
      completedLessonIds: [],
    }
  })

  // Persist session state to localStorage
  useEffect(() => {
    saveSession(sessionState)
  }, [sessionState])

  // Track if we're processing our own update (to avoid loop with storage events)
  const isOwnUpdateRef = useRef(false)

  // Multi-tab sync: Listen for storage changes from other tabs
  useEffect(() => {
    const unsubscribe = subscribeToStorageChanges((newState) => {
      // Ignore if this is our own update
      if (isOwnUpdateRef.current) {
        isOwnUpdateRef.current = false
        return
      }

      if (newState === null) {
        // Session was cleared in another tab - reset to defaults
        console.log('[useLearningSession] Session cleared in another tab')
        setSessionState({
          courseId,
          moduleId,
          currentLessonIndex: 0,
          currentAtomIndex: 0,
          completedAtomIds: [],
          completedLessonIds: [],
        })
        return
      }

      // Only update if the change is for the same course/module
      if (newState.courseId === courseId && newState.moduleId === moduleId) {
        console.log('[useLearningSession] Session updated from another tab:', {
          newLessonIndex: newState.currentLessonIndex,
          newAtomIndex: newState.currentAtomIndex,
        })

        // Merge completed items (other tab may have completed more)
        setSessionState((prev) => {
          const mergedCompletedAtomIds = Array.from(
            new Set([...prev.completedAtomIds, ...newState.completedAtomIds])
          )
          const mergedCompletedLessonIds = Array.from(
            new Set([...prev.completedLessonIds, ...newState.completedLessonIds])
          )

          // Take the more advanced position (higher indices = more progress)
          const newLessonIndex = Math.max(prev.currentLessonIndex, newState.currentLessonIndex)
          const newAtomIndex = newLessonIndex > prev.currentLessonIndex
            ? newState.currentAtomIndex
            : newLessonIndex === prev.currentLessonIndex
              ? Math.max(prev.currentAtomIndex, newState.currentAtomIndex)
              : prev.currentAtomIndex

          return {
            ...prev,
            currentLessonIndex: newLessonIndex,
            currentAtomIndex: newAtomIndex,
            completedAtomIds: mergedCompletedAtomIds,
            completedLessonIds: mergedCompletedLessonIds,
          }
        })
      }
    })

    return unsubscribe
  }, [courseId, moduleId])

  // Derived values
  const currentLesson = useMemo(() =>
    currentModule.lessons[sessionState.currentLessonIndex],
    [currentModule.lessons, sessionState.currentLessonIndex]
  )

  const currentAtom = useMemo(() =>
    currentLesson?.atoms[sessionState.currentAtomIndex],
    [currentLesson, sessionState.currentAtomIndex]
  )

  const isLastAtomInLesson = sessionState.currentAtomIndex >= (currentLesson?.atoms.length || 0) - 1
  const isLastLesson = sessionState.currentLessonIndex >= currentModule.lessons.length - 1

  // Progress calculations
  const totalAtoms = useMemo(() =>
    currentModule.lessons.reduce((sum, l) => sum + l.atoms.length, 0),
    [currentModule.lessons]
  )
  const completedAtoms = sessionState.completedAtomIds.length
  const progressPercent = totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 0

  // Navigation handlers
  const handleSelectLesson = useCallback((index: number) => {
    const targetLesson = currentModule.lessons[index]
    if (!targetLesson) return

    // If selected lesson is already completed, find next uncompleted lesson
    if (serverLessonsCompleted.includes(targetLesson.id)) {
      const next = findNextUncompletedLesson(currentModule, serverLessonsCompleted, index)
      if (next) {
        setSessionState(prev => ({
          ...prev,
          currentLessonIndex: next.index,
          currentAtomIndex: 0,
          completedLessonIds: serverLessonsCompleted,
        }))
        return
      }
      // All lessons completed - let them view the last one
    }

    setSessionState(prev => ({
      ...prev,
      currentLessonIndex: index,
      currentAtomIndex: 0,
    }))
  }, [currentModule, serverLessonsCompleted])

  return {
    sessionState,
    setSessionState,
    currentLesson,
    currentAtom,
    isLastAtomInLesson,
    isLastLesson,
    totalAtoms,
    completedAtoms,
    progressPercent,
    handleSelectLesson,
    clearSession,
  }
}
