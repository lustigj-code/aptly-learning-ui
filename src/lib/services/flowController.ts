/**
 * Flow Controller Service
 *
 * Orchestrates learning sequences for the AI coach, bridging the autopilot
 * session system with the coach interface so learning flows through conversation.
 *
 * Stores flow state in Firestore for persistence across sessions.
 */

import { adminDb } from '@/lib/firebase/admin'
import { buildSession, type LearningSession, type SessionItem } from '@/lib/adaptive/sessionBuilder'

// ============================================
// TYPES
// ============================================

export type FlowState = 'idle' | 'teaching' | 'practicing' | 'reflecting' | 'transitioning' | 'paused' | 'complete'

export type FlowOptions = {
  courseId?: string
  focusSkill?: string
  sessionLength?: 'short' | 'medium' | 'long'
}

export type CompletionData = {
  atomId: string
  score?: number
  timeSpent?: number
}

export type FlowStateData = {
  state: FlowState
  session: LearningSession | null
  currentIndex: number
  completedItems: string[]
  startedAt: string | null
  pausedAt: string | null
  lastActivityAt: string
  sessionStats: {
    itemsCompleted: number
    correctAnswers: number
    totalQuestions: number
    totalTimeSpent: number
  }
}

// ============================================
// CONSTANTS
// ============================================

const SESSION_LENGTHS = {
  short: 15,
  medium: 30,
  long: 45,
}

// ============================================
// FLOW STATE STORAGE
// ============================================

/**
 * Get flow state from Firestore
 */
async function getFlowStateDoc(userId: string): Promise<FlowStateData> {
  const doc = await adminDb
    .collection('users')
    .doc(userId)
    .collection('flowState')
    .doc('current')
    .get()

  if (!doc.exists) {
    return getDefaultFlowState()
  }

  return doc.data() as FlowStateData
}

/**
 * Save flow state to Firestore
 */
async function saveFlowState(userId: string, state: FlowStateData): Promise<void> {
  await adminDb
    .collection('users')
    .doc(userId)
    .collection('flowState')
    .doc('current')
    .set({
      ...state,
      lastActivityAt: new Date().toISOString(),
    })
}

/**
 * Get default flow state
 */
function getDefaultFlowState(): FlowStateData {
  return {
    state: 'idle',
    session: null,
    currentIndex: 0,
    completedItems: [],
    startedAt: null,
    pausedAt: null,
    lastActivityAt: new Date().toISOString(),
    sessionStats: {
      itemsCompleted: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      totalTimeSpent: 0,
    },
  }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Start a new learning flow session
 */
export async function startLearningFlow(
  userId: string,
  options?: FlowOptions
): Promise<{ success: boolean; session: LearningSession | null; error?: string }> {
  try {
    const currentState = await getFlowStateDoc(userId)

    // Check if already in a session
    if (currentState.state !== 'idle' && currentState.state !== 'complete') {
      return {
        success: false,
        session: null,
        error: 'Already in an active learning session. Pause or complete the current session first.',
      }
    }

    // Determine session duration
    const duration = SESSION_LENGTHS[options?.sessionLength || 'medium']

    // Build the session using existing sessionBuilder
    const session = await buildSession(userId, duration, {
      learningPace: 'moderate',
      preferredFormat: 'mixed',
      includeWarmup: true,
      includeCooldown: true,
    })

    // Determine initial state based on first item
    const firstItem = session.items[0]
    const initialState: FlowState = firstItem
      ? (firstItem.type === 'practice' || firstItem.type === 'quiz' ? 'practicing' : 'teaching')
      : 'idle'

    // Save new flow state
    const newState: FlowStateData = {
      state: initialState,
      session,
      currentIndex: 0,
      completedItems: [],
      startedAt: new Date().toISOString(),
      pausedAt: null,
      lastActivityAt: new Date().toISOString(),
      sessionStats: {
        itemsCompleted: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        totalTimeSpent: 0,
      },
    }

    await saveFlowState(userId, newState)

    return { success: true, session }
  } catch (error) {
    console.error('[FlowController] Error starting flow:', error)
    return {
      success: false,
      session: null,
      error: error instanceof Error ? error.message : 'Failed to start learning flow',
    }
  }
}

/**
 * Get current flow state
 */
export async function getCurrentFlowState(userId: string): Promise<{
  state: FlowState
  currentItem: SessionItem | null
  progress: { completed: number; total: number; percentage: number }
  sessionStats: FlowStateData['sessionStats']
}> {
  const flowState = await getFlowStateDoc(userId)

  const currentItem = flowState.session?.items[flowState.currentIndex] || null
  const total = flowState.session?.items.length || 0
  const completed = flowState.completedItems.length

  return {
    state: flowState.state,
    currentItem,
    progress: {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    sessionStats: flowState.sessionStats,
  }
}

/**
 * Advance flow after completing content
 */
export async function advanceFlow(
  userId: string,
  completion: CompletionData
): Promise<{
  success: boolean
  nextItem: SessionItem | null
  newState: FlowState
  sessionComplete: boolean
}> {
  try {
    const flowState = await getFlowStateDoc(userId)

    if (flowState.state === 'idle' || flowState.state === 'complete') {
      return {
        success: false,
        nextItem: null,
        newState: flowState.state,
        sessionComplete: flowState.state === 'complete',
      }
    }

    // Update stats
    const newStats = { ...flowState.sessionStats }
    newStats.itemsCompleted++
    if (completion.timeSpent) {
      newStats.totalTimeSpent += completion.timeSpent
    }
    if (completion.score !== undefined) {
      newStats.totalQuestions++
      if (completion.score >= 70) {
        newStats.correctAnswers++
      }
    }

    // Mark item as completed
    const newCompletedItems = [...flowState.completedItems, completion.atomId]

    // Advance to next item
    const nextIndex = flowState.currentIndex + 1
    const session = flowState.session

    // Check if session is complete
    if (!session || nextIndex >= session.items.length) {
      const completeState: FlowStateData = {
        ...flowState,
        state: 'complete',
        currentIndex: nextIndex,
        completedItems: newCompletedItems,
        sessionStats: newStats,
      }
      await saveFlowState(userId, completeState)

      return {
        success: true,
        nextItem: null,
        newState: 'complete',
        sessionComplete: true,
      }
    }

    // Get next item and determine new state
    const nextItem = session.items[nextIndex]
    const newState: FlowState =
      nextItem.type === 'practice' || nextItem.type === 'quiz'
        ? 'practicing'
        : 'teaching'

    const updatedState: FlowStateData = {
      ...flowState,
      state: newState,
      currentIndex: nextIndex,
      completedItems: newCompletedItems,
      sessionStats: newStats,
    }
    await saveFlowState(userId, updatedState)

    return {
      success: true,
      nextItem,
      newState,
      sessionComplete: false,
    }
  } catch (error) {
    console.error('[FlowController] Error advancing flow:', error)
    return {
      success: false,
      nextItem: null,
      newState: 'idle',
      sessionComplete: false,
    }
  }
}

/**
 * Pause the current flow
 */
export async function pauseFlow(userId: string): Promise<{ success: boolean }> {
  try {
    const flowState = await getFlowStateDoc(userId)

    if (flowState.state === 'idle' || flowState.state === 'complete' || flowState.state === 'paused') {
      return { success: false }
    }

    await saveFlowState(userId, {
      ...flowState,
      state: 'paused',
      pausedAt: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('[FlowController] Error pausing flow:', error)
    return { success: false }
  }
}

/**
 * Resume a paused flow
 */
export async function resumeFlow(userId: string): Promise<{
  success: boolean
  currentItem: SessionItem | null
  state: FlowState
}> {
  try {
    const flowState = await getFlowStateDoc(userId)

    if (flowState.state !== 'paused') {
      return {
        success: false,
        currentItem: null,
        state: flowState.state,
      }
    }

    const currentItem = flowState.session?.items[flowState.currentIndex] || null
    const resumeState: FlowState = currentItem
      ? (currentItem.type === 'practice' || currentItem.type === 'quiz' ? 'practicing' : 'teaching')
      : 'idle'

    await saveFlowState(userId, {
      ...flowState,
      state: resumeState,
      pausedAt: null,
    })

    return {
      success: true,
      currentItem,
      state: resumeState,
    }
  } catch (error) {
    console.error('[FlowController] Error resuming flow:', error)
    return {
      success: false,
      currentItem: null,
      state: 'idle',
    }
  }
}

/**
 * Get flow context string for coach prompt injection
 */
export async function getFlowContext(userId: string): Promise<string> {
  const flowState = await getFlowStateDoc(userId)

  if (flowState.state === 'idle') {
    return `## LEARNING FLOW STATE
Status: idle
No active learning session.
Coach can: suggest starting a learning session with startLearningFlow()`
  }

  if (flowState.state === 'complete') {
    const stats = flowState.sessionStats
    const accuracy = stats.totalQuestions > 0
      ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
      : 0

    return `## LEARNING FLOW STATE
Status: complete
Session finished!
Results: ${stats.itemsCompleted} items completed, ${accuracy}% accuracy
Coach can: celebrate completion, offer to start a new session`
  }

  const session = flowState.session
  const currentItem = session?.items[flowState.currentIndex]
  const total = session?.items.length || 0
  const completed = flowState.completedItems.length
  const stats = flowState.sessionStats

  if (flowState.state === 'paused') {
    return `## LEARNING FLOW STATE
Status: paused
Current: "${currentItem?.reason || 'Unknown'}" (${completed + 1} of ${total} in session)
Progress: ${completed} completed
Coach can: encourage resuming, ask if they need a break`
  }

  // Active states: teaching, practicing, reflecting, transitioning
  const accuracy = stats.totalQuestions > 0
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
    : 0

  const stateActions: Record<FlowState, string> = {
    teaching: 'provide hints, explain concepts, encourage, answer questions',
    practicing: 'provide hints on exercises, guide without giving answers, celebrate correct answers',
    reflecting: 'ask comprehension questions, reinforce key points',
    transitioning: 'preview next content, build anticipation',
    idle: '',
    paused: '',
    complete: '',
  }

  return `## LEARNING FLOW STATE
Status: ${flowState.state}
Current: ${currentItem?.type} - "${currentItem?.reason || 'Unknown'}" (${completed + 1} of ${total} in session)
Progress: ${completed} completed${stats.totalQuestions > 0 ? `, ${accuracy}% correct so far` : ''}
Coach can: ${stateActions[flowState.state]}`
}
