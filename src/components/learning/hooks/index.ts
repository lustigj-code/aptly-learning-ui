/**
 * Learning Hooks - Extracted from CoachLearningView
 *
 * These hooks encapsulate learning session and content progress logic
 * for cleaner component architecture and better testability.
 */

export { useLearningSession, clearSession, findNextUncompletedLesson } from './useLearningSession'
export type { SessionState } from './useLearningSession'

export { useContentProgress } from './useContentProgress'
export type { ImmediateContext } from './useContentProgress'
