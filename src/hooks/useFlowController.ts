'use client'

import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@/store/userProfileStore'
import type { FlowState, FlowOptions, CompletionData, QuizAnswer } from '@/lib/services/flowController'
import type { SessionItem } from '@/lib/adaptive/sessionBuilder'

/**
 * Client-side hook for managing learning flow state
 *
 * Provides functions to start, advance, pause, and resume learning flows.
 * Automatically tracks progress and serves next content in sequence.
 */

type FlowProgress = {
  completed: number
  total: number
  percentage: number
}

type FlowStateData = {
  state: FlowState
  currentItem: SessionItem | null
  currentIndex: number
  allItems: SessionItem[]
  progress: FlowProgress
  sessionStats: {
    itemsCompleted: number
    correctAnswers: number
    totalQuestions: number
    totalTimeSpent: number
  }
  estimatedMinutes?: number
}

type UseFlowControllerReturn = {
  // State
  flowState: FlowStateData | null
  isLoading: boolean
  error: string | null

  // Actions
  startFlow: (options?: FlowOptions) => Promise<boolean>
  advanceFlow: (completion: CompletionData) => Promise<SessionItem | null>
  recordQuizAnswer: (answer: QuizAnswer) => Promise<{ nextAction: string } | null>
  pauseFlow: () => Promise<boolean>
  resumeFlow: () => Promise<SessionItem | null>
  refreshState: () => Promise<void>
}

export function useFlowController(): UseFlowControllerReturn {
  const { user } = useUser()
  const [flowState, setFlowState] = useState<FlowStateData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id || 'anonymous'

  // Fetch current flow state
  const refreshState = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/flow?userId=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch flow state')
      }

      const data = await response.json()
      setFlowState(data)
    } catch (err) {
      console.error('[useFlowController] refreshState error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load flow state')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Load state on mount
  useEffect(() => {
    if (userId) {
      refreshState()
    }
  }, [userId, refreshState])

  // Start a new learning flow
  const startFlow = useCallback(async (options?: FlowOptions): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          options,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to start flow')
        return false
      }

      // Refresh state to get current item
      await refreshState()
      return true
    } catch (err) {
      console.error('[useFlowController] startFlow error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start flow')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshState])

  // Advance to next content after completion
  const advanceFlow = useCallback(async (completion: CompletionData): Promise<SessionItem | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance',
          completion,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError('Failed to advance flow')
        return null
      }

      // Refresh state
      await refreshState()
      return data.nextItem
    } catch (err) {
      console.error('[useFlowController] advanceFlow error:', err)
      setError(err instanceof Error ? err.message : 'Failed to advance flow')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [refreshState])

  // Record a quiz answer
  const recordQuizAnswer = useCallback(async (answer: QuizAnswer): Promise<{ nextAction: string } | null> => {
    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quiz',
          answer,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        return null
      }

      // Refresh state to get updated stats
      await refreshState()
      return { nextAction: data.nextAction }
    } catch (err) {
      console.error('[useFlowController] recordQuizAnswer error:', err)
      return null
    }
  }, [refreshState])

  // Pause the flow
  const pauseFlow = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })

      const data = await response.json()

      if (data.success) {
        await refreshState()
      }

      return data.success
    } catch (err) {
      console.error('[useFlowController] pauseFlow error:', err)
      return false
    }
  }, [refreshState])

  // Resume a paused flow
  const resumeFlow = useCallback(async (): Promise<SessionItem | null> => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })

      const data = await response.json()

      if (data.success) {
        await refreshState()
        return data.currentItem
      }

      return null
    } catch (err) {
      console.error('[useFlowController] resumeFlow error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [refreshState])

  return {
    flowState,
    isLoading,
    error,
    startFlow,
    advanceFlow,
    recordQuizAnswer,
    pauseFlow,
    resumeFlow,
    refreshState,
  }
}
