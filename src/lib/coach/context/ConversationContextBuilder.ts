/**
 * Conversation Context Builder
 *
 * Builds conversation context from history.
 * Manages conversation state for AI continuity.
 */

import { adminDb } from '@/lib/firebase/admin'
import {
  getUnverifiedConcepts,
  getComprehensionState,
  getExplanationHistory,
  getUntriedStrategies,
} from '@/lib/services/coachService'

// ============================================
// TYPES
// ============================================

export type ConversationHistory = {
  id: string
  messages: Array<{
    role: 'user' | 'coach'
    content: string
    timestamp: Date
  }>
  sessionGoal?: string
  startedAt: Date
}

export type ComprehensionState = {
  unverifiedConcepts: string[]      // Concept names pending verification
  lastVerifiedMinutesAgo: number    // Time since last verification
  shouldTriggerVerification: boolean // Whether to prompt verification now
}

export type AdaptiveExplanation = {
  isConfused: boolean
  confusedAbout: string | null      // Concept they're struggling with
  triedStrategies: string[]         // What we've already tried
  suggestedStrategy: string         // Next strategy to try
  strategyGuidance: string          // How to apply this strategy
}

// ============================================
// STRATEGY GUIDANCE
// ============================================

const STRATEGY_GUIDANCE: Record<string, string> = {
  analogy: "Use a familiar comparison. For lookalike audiences: 'It's like having a great party guest who knows exactly who else would love your party.'",
  example: "Use a specific, real-world brand example. 'When Nike does this, they...'",
  breakdown: "Break into 3 smaller pieces. 'First, let's just focus on...'",
  visual: "Describe it as if drawing a diagram. 'Picture a Venn diagram where...'",
  socratic: "Ask simpler questions to find the exact confusion point. 'When you hear X, what comes to mind?'",
  direct: "Give a clear, straightforward explanation with the key definition and one example.",
}

// ============================================
// CONVERSATION FETCHING
// ============================================

/**
 * Fetch conversation history from Firestore
 */
export async function fetchConversationHistory(
  conversationId: string
): Promise<ConversationHistory | null> {
  try {
    const convDoc = await adminDb.collection('conversations').doc(conversationId).get()

    if (!convDoc.exists) {
      return null
    }

    const data = convDoc.data()
    return {
      id: conversationId,
      messages: (data?.messages || []).slice(-15).map((m: Record<string, unknown>) => ({
        role: m.role as 'user' | 'coach',
        content: m.content as string,
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as string),
      })),
      sessionGoal: data?.sessionGoal,
      startedAt: data?.createdAt instanceof Date ? data.createdAt : new Date(data?.createdAt),
    }
  } catch (error) {
    console.error(`Error fetching conversation history for ${conversationId}:`, error)
    return null
  }
}

// ============================================
// COMPREHENSION STATE
// ============================================

/**
 * Fetch comprehension state for a conversation
 */
export async function fetchComprehensionState(
  conversationId: string
): Promise<ComprehensionState | null> {
  try {
    const unverifiedConcepts = await getUnverifiedConcepts(conversationId)
    const fullState = await getComprehensionState(conversationId)

    if (unverifiedConcepts.length === 0 && !fullState) {
      return null
    }

    // Calculate minutes since last verification
    let lastVerifiedMinutesAgo = 999 // Default to large number if never verified
    if (fullState?.lastVerifiedAt) {
      const lastVerifiedDate = fullState.lastVerifiedAt instanceof Date
        ? fullState.lastVerifiedAt
        : new Date(fullState.lastVerifiedAt)
      lastVerifiedMinutesAgo = Math.floor(
        (Date.now() - lastVerifiedDate.getTime()) / (1000 * 60)
      )
    }

    // Determine if verification should be triggered
    const unverifiedCount = unverifiedConcepts.length
    const shouldTriggerVerification =
      unverifiedCount > 0 &&
      (lastVerifiedMinutesAgo > 5 || unverifiedCount >= 3)

    console.log(`[ConversationContext] Comprehension state: ${unverifiedCount} unverified, trigger=${shouldTriggerVerification}`)

    return {
      unverifiedConcepts: unverifiedConcepts.map((c) => c.conceptName),
      lastVerifiedMinutesAgo,
      shouldTriggerVerification,
    }
  } catch (error) {
    console.warn('[ConversationContext] Comprehension state fetch failed:', error)
    return null
  }
}

// ============================================
// ADAPTIVE EXPLANATION
// ============================================

/**
 * Build adaptive explanation guidance when student shows confusion
 */
export async function buildAdaptiveExplanation(
  conversationId: string,
  conversationHistory: ConversationHistory | null,
  comprehensionState: ComprehensionState | null
): Promise<AdaptiveExplanation | null> {
  try {
    // Try to identify what concept they're confused about from recent messages
    let confusedAbout: string | null = null
    if (conversationHistory?.messages && conversationHistory.messages.length > 0) {
      // Look at recent messages for concept keywords from comprehension state
      const recentContent = conversationHistory.messages
        .slice(-5)
        .map((m) => m.content.toLowerCase())
        .join(' ')

      // Check against unverified concepts
      if (comprehensionState?.unverifiedConcepts) {
        for (const concept of comprehensionState.unverifiedConcepts) {
          if (recentContent.includes(concept.toLowerCase())) {
            confusedAbout = concept
            break
          }
        }
      }
    }

    // Get explanation history and suggest next strategy
    const conceptId = confusedAbout?.toLowerCase().replace(/\s+/g, '-') || 'general'
    const history = await getExplanationHistory(conversationId, conceptId)
    const triedStrategies = history.map((h) => h.strategy)
    const untriedStrategies = await getUntriedStrategies(conversationId, conceptId)

    // Pick the best next strategy (prefer analogy, example, breakdown for confused students)
    const preferredOrder = ['analogy', 'example', 'breakdown', 'visual', 'socratic', 'direct']
    const suggestedStrategy = preferredOrder.find((s) => untriedStrategies.includes(s)) ||
                              (untriedStrategies[0] || 'breakdown')

    console.log(`[ConversationContext] Suggesting strategy: ${suggestedStrategy}`)

    return {
      isConfused: true,
      confusedAbout,
      triedStrategies,
      suggestedStrategy,
      strategyGuidance: STRATEGY_GUIDANCE[suggestedStrategy] || STRATEGY_GUIDANCE.breakdown,
    }
  } catch (error) {
    console.warn('[ConversationContext] Adaptive explanation failed:', error)
    return null
  }
}

/**
 * Get strategy guidance for a given strategy
 */
export function getStrategyGuidance(strategy: string): string {
  return STRATEGY_GUIDANCE[strategy] || STRATEGY_GUIDANCE.breakdown
}
