/**
 * Coach Context Module
 *
 * Unified context building for AI coach.
 * Provides comprehensive context for personalized tutoring.
 */

// ============================================
// RE-EXPORTS
// ============================================

export {
  type UserProfile,
  fetchUserProfile,
  getDefaultUserProfile,
} from './UserProfileBuilder'

export {
  type UserPerformance,
  fetchUserPerformance,
  getDefaultPerformance,
  identifyConceptStrengths,
  calculateMasteryLevel,
  determineAdaptiveDifficulty,
} from './PerformanceAggregator'

export {
  type ConversationHistory,
  type ComprehensionState,
  type AdaptiveExplanation,
  fetchConversationHistory,
  fetchComprehensionState,
  buildAdaptiveExplanation,
  getStrategyGuidance,
} from './ConversationContextBuilder'

export {
  type EmotionalSignals,
  type EmotionalAnalysis,
  buildEmotionalAnalysis,
  isStudentConfused,
  isStudentPositive,
} from './EmotionalStateDetector'

export {
  type AtomContent,
  type LessonContext,
  fetchLessonContext,
  getCurrentAtom,
} from './LessonContextBuilder'

export {
  type PersonalityState,
  type ConversationTone,
  type RelationshipContext,
  buildPersonalityState,
  buildRelationshipContextFromData,
  determineSuggestedApproach,
} from './PersonalityStateBuilder'

export {
  type ContextStringData,
  buildContextString,
} from './ContextStringBuilder'

// ============================================
// IMPORTS FOR MAIN BUILDER
// ============================================

import { fetchUserProfile, getDefaultUserProfile, type UserProfile } from './UserProfileBuilder'
import {
  fetchUserPerformance,
  getDefaultPerformance,
  calculateMasteryLevel,
  determineAdaptiveDifficulty,
  type UserPerformance,
} from './PerformanceAggregator'
import {
  fetchConversationHistory,
  fetchComprehensionState,
  buildAdaptiveExplanation,
  type ConversationHistory,
  type ComprehensionState,
  type AdaptiveExplanation,
} from './ConversationContextBuilder'
import { buildEmotionalAnalysis, isStudentConfused, type EmotionalAnalysis } from './EmotionalStateDetector'
import { fetchLessonContext, getCurrentAtom, type LessonContext, type AtomContent } from './LessonContextBuilder'
import {
  buildPersonalityState,
  buildRelationshipContextFromData,
  determineSuggestedApproach,
  type PersonalityState,
  type RelationshipContext,
} from './PersonalityStateBuilder'
import { buildContextString } from './ContextStringBuilder'

// External dependencies for main builder
import {
  retrieveRelevantContent,
  formatRetrievedContext,
} from '@/lib/ai/retrievalService'
import {
  selectPedagogicalPattern,
  deriveStudentState,
  inferInteractionType,
  type PedagogicalPattern,
  type PedagogicalSignals,
} from '@/lib/ai/pedagogicalPatterns'
import { getFlowContext } from '@/lib/services/flowController'

// ============================================
// MAIN CONTEXT TYPE
// ============================================

export type CoachContextData = {
  user: UserProfile
  performance: UserPerformance
  lesson: LessonContext | null
  currentAtom: AtomContent | null
  conversation: ConversationHistory | null
  masteryLevel: number
  adaptiveDifficulty: 'beginner' | 'intermediate' | 'advanced'
  suggestedApproach: string
  emotionalAnalysis: EmotionalAnalysis | null
  personalityState: PersonalityState | null
  relationshipContext: RelationshipContext | null
  ragContent: string | null
  pedagogicalPattern: PedagogicalPattern | null
  comprehensionState: ComprehensionState | null
  adaptiveExplanation: AdaptiveExplanation | null
  flowContext: string | null
  contextString: string
}

// ============================================
// MAIN CONTEXT BUILDER
// ============================================

/**
 * Build comprehensive context for coach system prompt
 * Fetches all relevant data to provide personalized tutoring
 */
export async function buildCoachContext(
  userId: string,
  lessonId?: string,
  atomId?: string,
  conversationId?: string,
  latestMessage?: string
): Promise<CoachContextData> {
  try {
    // Fetch all context data in parallel for performance
    const [userProfile, userPerformance, lessonContext, conversationHistory] = await Promise.all([
      fetchUserProfile(userId),
      fetchUserPerformance(userId),
      lessonId ? fetchLessonContext(lessonId) : Promise.resolve(null),
      conversationId ? fetchConversationHistory(conversationId) : Promise.resolve(null),
    ])

    // Get current atom if specified
    const currentAtom = atomId && lessonContext
      ? getCurrentAtom(lessonContext, atomId)
      : null

    // Calculate mastery and adaptive difficulty
    const masteryLevel = calculateMasteryLevel(
      userPerformance,
      lessonContext?.id,
      lessonContext?.atoms.length,
      lessonContext?.atoms.map(a => a.id)
    )
    const adaptiveDifficulty = determineAdaptiveDifficulty(
      userProfile.experienceLevel,
      masteryLevel,
      userPerformance.averageQuizScore
    )

    // Determine teaching approach
    const suggestedApproach = determineSuggestedApproach(
      userProfile.experienceLevel,
      adaptiveDifficulty,
      userProfile.learningStyle,
      userPerformance.strugglingConcepts,
      userProfile.goal
    )

    // Perform emotional analysis
    const emotionalAnalysis = buildEmotionalAnalysis(
      userPerformance,
      conversationHistory,
      latestMessage
    )

    // Build personality state
    const personalityState = buildPersonalityState(
      emotionalAnalysis,
      userPerformance,
      lessonContext,
      masteryLevel
    )

    // Build relationship context
    const relationshipContext = buildRelationshipContextFromData(
      userPerformance,
      lessonContext
    )

    // Retrieve relevant RAG content if user message provided
    let ragContent: string | null = null
    if (latestMessage && latestMessage.trim().length > 0) {
      try {
        console.log('[CoachContext] Retrieving RAG content for:', latestMessage.substring(0, 50) + '...')
        const retrievedChunks = await retrieveRelevantContent(latestMessage, {
          topK: 5,
          minScore: 0.5,
          courseFilter: lessonContext?.courseId,
        })

        if (retrievedChunks.length > 0) {
          ragContent = formatRetrievedContext(retrievedChunks)
          console.log(`[CoachContext] Retrieved ${retrievedChunks.length} relevant chunks`)
        } else {
          console.log('[CoachContext] No relevant RAG content found (below threshold)')
        }
      } catch (ragError) {
        console.warn('[CoachContext] RAG retrieval failed:', ragError)
      }
    }

    // Fetch comprehension state if conversationId provided
    let comprehensionStateData: ComprehensionState | null = null
    if (conversationId) {
      comprehensionStateData = await fetchComprehensionState(conversationId)
    }

    // Build adaptive explanation guidance when student shows confusion
    let adaptiveExplanationData: AdaptiveExplanation | null = null
    if (isStudentConfused(emotionalAnalysis) && conversationId) {
      adaptiveExplanationData = await buildAdaptiveExplanation(
        conversationId,
        conversationHistory,
        comprehensionStateData
      )
    }

    // Select pedagogical pattern based on current signals
    let pedagogicalPattern: PedagogicalPattern | null = null
    try {
      const studentState = deriveStudentState(masteryLevel, emotionalAnalysis)
      const lastInteractionType = inferInteractionType(latestMessage || '')

      // Check if milestone was just completed
      const previousLessonsCount = conversationHistory?.messages.length
        ? userPerformance.lessonsCompleted.length - 1
        : userPerformance.lessonsCompleted.length
      const justCompletedMilestone = userPerformance.lessonsCompleted.length > previousLessonsCount ||
        userPerformance.currentStreak >= 7 && userPerformance.currentStreak % 7 === 0

      const pedagogicalSignals: PedagogicalSignals = {
        studentState,
        lastInteractionType,
        emotionalState: emotionalAnalysis,
        masteryLevel,
        justCompletedMilestone,
      }

      pedagogicalPattern = selectPedagogicalPattern(pedagogicalSignals)
      console.log(`[CoachContext] Selected pedagogical pattern: ${pedagogicalPattern.patternName}`)
    } catch (patternError) {
      console.warn('[CoachContext] Pattern selection failed:', patternError)
    }

    // Fetch learning flow context
    let flowContextData: string | null = null
    try {
      flowContextData = await getFlowContext(userId)
      console.log('[CoachContext] Flow context loaded')
    } catch (flowError) {
      console.warn('[CoachContext] Flow context fetch failed:', flowError)
    }

    // Build the comprehensive context string
    const contextString = buildContextString({
      user: userProfile,
      performance: userPerformance,
      lesson: lessonContext,
      currentAtom,
      conversation: conversationHistory,
      masteryLevel,
      adaptiveDifficulty,
      suggestedApproach,
      emotionalAnalysis,
      personalityState,
      relationshipContext,
      ragContent,
      pedagogicalPattern,
      comprehensionState: comprehensionStateData,
      adaptiveExplanation: adaptiveExplanationData,
      flowContext: flowContextData,
      // Phase 2 & 4: These are passed from the API route when available
      immediateContext: null,
      userMemory: null,
    })

    return {
      user: userProfile,
      performance: userPerformance,
      lesson: lessonContext,
      currentAtom,
      conversation: conversationHistory,
      masteryLevel,
      adaptiveDifficulty,
      suggestedApproach,
      emotionalAnalysis,
      personalityState,
      relationshipContext,
      ragContent,
      pedagogicalPattern,
      comprehensionState: comprehensionStateData,
      adaptiveExplanation: adaptiveExplanationData,
      flowContext: flowContextData,
      contextString,
    }
  } catch (error) {
    console.error(`Error building coach context for user ${userId}:`, error)
    return buildMinimalContext(userId)
  }
}

// ============================================
// FALLBACK CONTEXT
// ============================================

/**
 * Build minimal context when full context building fails
 */
function buildMinimalContext(userId: string): CoachContextData {
  const user = getDefaultUserProfile(userId)
  const performance = getDefaultPerformance()

  return {
    user,
    performance,
    lesson: null,
    currentAtom: null,
    conversation: null,
    masteryLevel: 0,
    adaptiveDifficulty: 'beginner',
    suggestedApproach: 'Use simple language and build from fundamentals.',
    emotionalAnalysis: null,
    personalityState: null,
    relationshipContext: null,
    ragContent: null,
    pedagogicalPattern: null,
    comprehensionState: null,
    adaptiveExplanation: null,
    flowContext: null,
    contextString: `Student ID: ${userId}\nNo additional context available. Provide general support and guidance.`,
  }
}

// ============================================
// LEGACY SUPPORT
// ============================================

/**
 * Legacy function signature for backward compatibility
 * @deprecated Use buildCoachContext instead
 */
export async function buildCoachContextLegacy(
  userId: string,
  lessonId: string
): Promise<{ contextString: string; lessonTitle: string; masteryLevel: number }> {
  const context = await buildCoachContext(userId, lessonId)
  return {
    contextString: context.contextString,
    lessonTitle: context.lesson?.title || 'Unknown',
    masteryLevel: context.masteryLevel,
  }
}
