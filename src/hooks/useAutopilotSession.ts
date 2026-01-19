/**
 * useAutopilotSession - State Machine for AI-Controlled Learning
 *
 * Manages the autopilot learning experience where AI controls:
 * - Content selection and pacing
 * - Transitions between learning, practice, and reflection
 * - Automatic interventions when struggling
 *
 * States:
 * - idle: Not in a learning session
 * - loading: Building personalized session
 * - teaching: Showing content (video, reading)
 * - practicing: User working on quiz/exercise
 * - reflecting: Post-content comprehension check
 * - transitioning: AI deciding what's next
 * - paused: Session temporarily paused
 * - complete: Session finished
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useUser } from '@/store/userProfileStore'
import { buildSession, type LearningSession, type SessionItem } from '@/lib/adaptive/sessionBuilder'
import { detectStruggle, type StruggleAnalysis } from '@/lib/ai/struggle-detection'
import type { Atom, Lesson } from '@/types'

// ============================================
// TYPES
// ============================================

export type AutopilotState =
  | 'idle'
  | 'loading'
  | 'teaching'
  | 'practicing'
  | 'reflecting'
  | 'transitioning'
  | 'paused'
  | 'complete'

export type AutopilotEvent =
  | { type: 'START' }
  | { type: 'SESSION_READY'; session: LearningSession }
  | { type: 'CONTENT_COMPLETE'; atomId: string; score?: number }
  | { type: 'QUIZ_ANSWER'; questionId: string; isCorrect: boolean; score: number }
  | { type: 'USER_MESSAGE'; message: string }
  | { type: 'NEXT_ITEM' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'EXIT' }
  | { type: 'INTERVENTION_SHOWN' }
  | { type: 'INTERVENTION_DISMISSED' }

export type CurrentContent = {
  type: 'video' | 'reading' | 'quiz' | 'practice' | 'review' | 'reflection'
  atom?: Atom
  lesson?: Lesson
  sessionItem?: SessionItem
  coachIntro?: string
}

export type AutopilotSessionState = {
  state: AutopilotState
  session: LearningSession | null
  currentIndex: number
  currentContent: CurrentContent | null
  completedItems: string[]
  sessionStartedAt: Date | null
  struggleAnalysis: StruggleAnalysis | null
  showIntervention: boolean
  interventionMessage: string | null
  sessionSummary: {
    itemsCompleted: number
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
    skillsWorked: string[]
  }
  error: string | null
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: AutopilotSessionState = {
  state: 'idle',
  session: null,
  currentIndex: 0,
  currentContent: null,
  completedItems: [],
  sessionStartedAt: null,
  struggleAnalysis: null,
  showIntervention: false,
  interventionMessage: null,
  sessionSummary: {
    itemsCompleted: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    timeSpent: 0,
    skillsWorked: [],
  },
  error: null,
}

// ============================================
// HOOK
// ============================================

export function useAutopilotSession() {
  const { user } = useUser()
  const [sessionState, setSessionState] = useState<AutopilotSessionState>(initialState)
  const behaviorRef = useRef({
    recentQuizScores: [] as number[],
    atomTimeSpent: 0,
    hintsViewed: 0,
    questionsAttempted: 0,
    quizRetakes: 0,
    recentCoachMessages: [] as string[],
    sessionDuration: 0,
  })

  // Track session duration
  useEffect(() => {
    if (sessionState.state !== 'idle' && sessionState.state !== 'complete') {
      const interval = setInterval(() => {
        behaviorRef.current.sessionDuration += 1
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [sessionState.state])

  /**
   * Dispatch event to state machine
   */
  const dispatch = useCallback(async (event: AutopilotEvent) => {
    setSessionState((prev) => {
      switch (event.type) {
        case 'START':
          return { ...prev, state: 'loading', error: null }

        case 'SESSION_READY':
          const firstItem = event.session.items[0]
          return {
            ...prev,
            state: 'teaching',
            session: event.session,
            currentIndex: 0,
            sessionStartedAt: new Date(),
            currentContent: firstItem ? {
              type: mapItemTypeToContentType(firstItem.type),
              sessionItem: firstItem,
              coachIntro: generateCoachIntro(firstItem, 0, event.session.items.length),
            } : null,
          }

        case 'CONTENT_COMPLETE':
          return handleContentComplete(prev, event.atomId, event.score)

        case 'QUIZ_ANSWER':
          return handleQuizAnswer(prev, event.isCorrect, event.score)

        case 'NEXT_ITEM':
          return advanceToNextItem(prev)

        case 'PAUSE':
          return { ...prev, state: 'paused' }

        case 'RESUME':
          return {
            ...prev,
            state: prev.currentContent?.type === 'quiz' || prev.currentContent?.type === 'practice'
              ? 'practicing'
              : 'teaching',
          }

        case 'EXIT':
          return {
            ...initialState,
            sessionSummary: {
              ...prev.sessionSummary,
              timeSpent: behaviorRef.current.sessionDuration,
            },
          }

        case 'INTERVENTION_SHOWN':
          return { ...prev, showIntervention: true }

        case 'INTERVENTION_DISMISSED':
          return { ...prev, showIntervention: false, interventionMessage: null }

        case 'USER_MESSAGE':
          // Track emotional keywords for struggle detection
          behaviorRef.current.recentCoachMessages.push(event.message)
          if (behaviorRef.current.recentCoachMessages.length > 10) {
            behaviorRef.current.recentCoachMessages.shift()
          }
          return prev

        default:
          return prev
      }
    })
  }, [])

  /**
   * Start autopilot session
   */
  const startSession = useCallback(async (courseId: string = 'ai-at-work') => {
    dispatch({ type: 'START' })

    try {
      const session = await buildSession(
        user?.id || 'anonymous',
        courseId,
        30, // 30 minutes default
        {
          learningPace: 'moderate',
          preferredFormat: 'mixed',
          includeWarmup: true,
          includeCooldown: true,
        }
      )

      dispatch({ type: 'SESSION_READY', session })
    } catch (error) {
      setSessionState(prev => ({
        ...prev,
        state: 'idle',
        error: error instanceof Error ? error.message : 'Failed to build session',
      }))
    }
  }, [user?.id, dispatch])

  /**
   * Complete current content and move forward
   */
  const completeContent = useCallback((atomId: string, score?: number) => {
    dispatch({ type: 'CONTENT_COMPLETE', atomId, score })

    // Check for struggle after quiz
    if (score !== undefined) {
      behaviorRef.current.recentQuizScores.push(score)
      if (behaviorRef.current.recentQuizScores.length > 5) {
        behaviorRef.current.recentQuizScores.shift()
      }

      const analysis = detectStruggle({
        recentQuizScores: behaviorRef.current.recentQuizScores,
        atomTimeSpent: behaviorRef.current.atomTimeSpent,
        estimatedTime: 10 * 60, // 10 minutes
        hintsViewed: behaviorRef.current.hintsViewed,
        questionsAttempted: behaviorRef.current.questionsAttempted,
        quizRetakes: behaviorRef.current.quizRetakes,
        recentCoachMessages: behaviorRef.current.recentCoachMessages,
        sessionDuration: behaviorRef.current.sessionDuration,
        previousSessionAbandoned: false,
      })

      if (analysis.shouldIntervene) {
        setSessionState(prev => ({
          ...prev,
          struggleAnalysis: analysis,
          showIntervention: true,
          interventionMessage: analysis.suggestedIntervention,
        }))
      }
    }

    // Auto-advance after brief pause
    setTimeout(() => {
      dispatch({ type: 'NEXT_ITEM' })
    }, 1500)
  }, [dispatch])

  /**
   * Handle quiz answer
   */
  const submitQuizAnswer = useCallback((questionId: string, isCorrect: boolean, score: number) => {
    behaviorRef.current.questionsAttempted++
    dispatch({ type: 'QUIZ_ANSWER', questionId, isCorrect, score })
  }, [dispatch])

  /**
   * Send message to coach during session
   */
  const sendMessage = useCallback((message: string) => {
    dispatch({ type: 'USER_MESSAGE', message })
  }, [dispatch])

  /**
   * Pause session
   */
  const pauseSession = useCallback(() => {
    dispatch({ type: 'PAUSE' })
  }, [dispatch])

  /**
   * Resume session
   */
  const resumeSession = useCallback(() => {
    dispatch({ type: 'RESUME' })
  }, [dispatch])

  /**
   * Exit session (with graceful save)
   */
  const exitSession = useCallback(() => {
    // Save progress before exiting
    // In production, this would persist to Firestore
    dispatch({ type: 'EXIT' })
  }, [dispatch])

  /**
   * Dismiss intervention
   */
  const dismissIntervention = useCallback(() => {
    dispatch({ type: 'INTERVENTION_DISMISSED' })
  }, [dispatch])

  return {
    // State
    ...sessionState,
    isActive: sessionState.state !== 'idle' && sessionState.state !== 'complete',
    isPaused: sessionState.state === 'paused',
    isLoading: sessionState.state === 'loading',
    progress: sessionState.session
      ? (sessionState.currentIndex / sessionState.session.items.length) * 100
      : 0,

    // Actions
    startSession,
    completeContent,
    submitQuizAnswer,
    sendMessage,
    pauseSession,
    resumeSession,
    exitSession,
    dismissIntervention,
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapItemTypeToContentType(
  type: SessionItem['type']
): CurrentContent['type'] {
  switch (type) {
    case 'warmup':
    case 'cooldown':
      return 'review'
    case 'learn':
      return 'video' // Default to video, would check actual atom type
    case 'practice':
      return 'practice'
    case 'quiz':
      return 'quiz'
    case 'review':
      return 'review'
    default:
      return 'video'
  }
}

function generateCoachIntro(
  item: SessionItem,
  index: number,
  total: number
): string {
  const intros = {
    warmup: [
      "Let's start with a quick review to warm up your memory!",
      "Before we dive in, let's refresh what you learned before.",
    ],
    learn: [
      "Now for some new material. Take your time with this one!",
      "Here's the next concept to master. Ready?",
      "Let's learn something new together!",
    ],
    practice: [
      "Time to put what you learned into practice!",
      "Let's see how well you understood that. Don't worry, I'll help if you get stuck.",
    ],
    quiz: [
      "Quick check to see how you're doing!",
      "Let's test your understanding. You've got this!",
    ],
    cooldown: [
      "Great session! Let's end with a quick recap.",
      "Before we wrap up, let's reinforce what you learned.",
    ],
    review: [
      "This is due for review. Let's make sure it sticks!",
      "Time to strengthen this memory!",
    ],
  }

  const typeIntros = intros[item.type as keyof typeof intros] || intros.learn
  const intro = typeIntros[Math.floor(Math.random() * typeIntros.length)]

  if (index === 0) {
    return `Great choice starting your learning session! ${intro}`
  }

  if (index === total - 1) {
    return `Last one for today! ${intro}`
  }

  return intro
}

function handleContentComplete(
  state: AutopilotSessionState,
  atomId: string,
  score?: number
): AutopilotSessionState {
  const newCompletedItems = [...state.completedItems, atomId]
  const newSummary = {
    ...state.sessionSummary,
    itemsCompleted: state.sessionSummary.itemsCompleted + 1,
  }

  if (score !== undefined) {
    newSummary.totalQuestions++
    if (score >= 70) {
      newSummary.correctAnswers++
    }
  }

  return {
    ...state,
    state: 'transitioning',
    completedItems: newCompletedItems,
    sessionSummary: newSummary,
  }
}

function handleQuizAnswer(
  state: AutopilotSessionState,
  isCorrect: boolean,
  _score: number
): AutopilotSessionState {
  const newSummary = {
    ...state.sessionSummary,
    totalQuestions: state.sessionSummary.totalQuestions + 1,
    correctAnswers: state.sessionSummary.correctAnswers + (isCorrect ? 1 : 0),
  }

  return {
    ...state,
    sessionSummary: newSummary,
  }
}

function advanceToNextItem(state: AutopilotSessionState): AutopilotSessionState {
  if (!state.session) return state

  const nextIndex = state.currentIndex + 1

  // Check if session is complete
  if (nextIndex >= state.session.items.length) {
    return {
      ...state,
      state: 'complete',
      currentContent: null,
    }
  }

  const nextItem = state.session.items[nextIndex]
  const newState: AutopilotState =
    nextItem.type === 'practice' || nextItem.type === 'quiz'
      ? 'practicing'
      : 'teaching'

  return {
    ...state,
    state: newState,
    currentIndex: nextIndex,
    currentContent: {
      type: mapItemTypeToContentType(nextItem.type),
      sessionItem: nextItem,
      coachIntro: generateCoachIntro(nextItem, nextIndex, state.session.items.length),
    },
  }
}

// ============================================
// EXPORTS
// ============================================

export type { LearningSession, SessionItem }
