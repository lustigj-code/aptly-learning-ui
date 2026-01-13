/**
 * Coach Context Builder - DEPRECATED
 *
 * @deprecated This file is deprecated. Import from '@/lib/coach/context' instead.
 * This file will be removed in a future version.
 *
 * Migration guide:
 * - Change: import { buildCoachContext } from '@/lib/utils/coachContext'
 * - To:     import { buildCoachContext } from '@/lib/coach/context'
 *
 * The functionality has been split into focused modules:
 * - UserProfileBuilder: User profile fetching and defaults
 * - PerformanceAggregator: Performance metrics and mastery calculation
 * - ConversationContextBuilder: Conversation history and comprehension state
 * - EmotionalStateDetector: Emotional analysis from behavior
 * - LessonContextBuilder: Lesson and atom content fetching
 * - PersonalityStateBuilder: Sage personality and relationship context
 * - ContextStringBuilder: System prompt context formatting
 */

// ============================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================

// Main types
export type {
  UserProfile,
  UserPerformance,
  AtomContent,
  LessonContext,
  ConversationHistory,
  CoachContextData,
  ComprehensionState,
  AdaptiveExplanation,
  PersonalityState,
  RelationshipContext,
  EmotionalAnalysis,
} from '@/lib/coach/context'

// Main functions
export {
  buildCoachContext,
  buildCoachContextLegacy,
} from '@/lib/coach/context'

// Profile functions
export {
  fetchUserProfile,
  getDefaultUserProfile,
} from '@/lib/coach/context'

// Performance functions
export {
  fetchUserPerformance,
  getDefaultPerformance,
  calculateMasteryLevel,
  determineAdaptiveDifficulty,
  identifyConceptStrengths,
} from '@/lib/coach/context'

// Conversation functions
export {
  fetchConversationHistory,
  fetchComprehensionState,
  buildAdaptiveExplanation,
  getStrategyGuidance,
} from '@/lib/coach/context'

// Emotional analysis functions
export {
  buildEmotionalAnalysis,
  isStudentConfused,
  isStudentPositive,
} from '@/lib/coach/context'

// Lesson functions
export {
  fetchLessonContext,
  getCurrentAtom,
} from '@/lib/coach/context'

// Personality functions
export {
  buildPersonalityState,
  buildRelationshipContextFromData,
  determineSuggestedApproach,
} from '@/lib/coach/context'

// Context string builder
export {
  buildContextString,
} from '@/lib/coach/context'
