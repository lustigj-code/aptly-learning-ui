'use client'

import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@/store/unifiedStore'
import { get, post, isSuccess } from '@/lib/api/client'
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
    setIsLoading(true)
    setError(null)

    const response = await get<FlowStateData>(`/api/flow?userId=${userId}`)

    if (isSuccess(response)) {
      setFlowState(response.data)
    } else {
      console.error('[useFlowController] refreshState error:', response.error.message)
      setError(response.error.message)
    }

    setIsLoading(false)
  }, [userId])

  // Load state on mount - standard data fetching pattern
  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshState()
    }
  }, [userId, refreshState])

  // Start a new learning flow
  const startFlow = useCallback(async (options?: FlowOptions): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const response = await post<{ success: boolean; error?: string }>('/api/flow', {
      action: 'start',
      options,
    })

    if (isSuccess(response)) {
      if (!response.data.success) {
        setError(response.data.error || 'Failed to start flow')
        setIsLoading(false)
        return false
      }
      // Refresh state to get current item
      await refreshState()
      setIsLoading(false)
      return true
    }

    console.error('[useFlowController] startFlow error:', response.error.message)
    setError(response.error.message)
    setIsLoading(false)
    return false
  }, [refreshState])

  // Advance to next content after completion
  const advanceFlow = useCallback(async (completion: CompletionData): Promise<SessionItem | null> => {
    setIsLoading(true)
    setError(null)

    const response = await post<{ success: boolean; nextItem?: SessionItem }>('/api/flow', {
      action: 'advance',
      completion,
    })

    if (isSuccess(response)) {
      if (!response.data.success) {
        setError('Failed to advance flow')
        setIsLoading(false)
        return null
      }
      // Refresh state
      await refreshState()
      setIsLoading(false)
      return response.data.nextItem || null
    }

    console.error('[useFlowController] advanceFlow error:', response.error.message)
    setError(response.error.message)
    setIsLoading(false)
    return null
  }, [refreshState])

  // Record a quiz answer
  const recordQuizAnswer = useCallback(async (answer: QuizAnswer): Promise<{ nextAction: string } | null> => {
    const response = await post<{ success: boolean; nextAction: string }>('/api/flow', {
      action: 'quiz',
      answer,
    })

    if (isSuccess(response) && response.data.success) {
      // Refresh state to get updated stats
      await refreshState()
      return { nextAction: response.data.nextAction }
    }

    if (!isSuccess(response)) {
      console.error('[useFlowController] recordQuizAnswer error:', response.error.message)
    }
    return null
  }, [refreshState])

  // Pause the flow
  const pauseFlow = useCallback(async (): Promise<boolean> => {
    const response = await post<{ success: boolean }>('/api/flow', { action: 'pause' })

    if (isSuccess(response) && response.data.success) {
      await refreshState()
      return true
    }

    if (!isSuccess(response)) {
      console.error('[useFlowController] pauseFlow error:', response.error.message)
    }
    return false
  }, [refreshState])

  // Resume a paused flow
  const resumeFlow = useCallback(async (): Promise<SessionItem | null> => {
    setIsLoading(true)

    const response = await post<{ success: boolean; currentItem?: SessionItem }>('/api/flow', { action: 'resume' })

    if (isSuccess(response) && response.data.success) {
      await refreshState()
      setIsLoading(false)
      return response.data.currentItem || null
    }

    if (!isSuccess(response)) {
      console.error('[useFlowController] resumeFlow error:', response.error.message)
    }
    setIsLoading(false)
    return null
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
