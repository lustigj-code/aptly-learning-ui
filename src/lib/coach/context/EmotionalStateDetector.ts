/**
 * Emotional State Detector
 *
 * Detects user emotional state from interaction patterns.
 * Used for adaptive coaching responses.
 */

import {
  detectEmotionalState as detectEmotionalStateFromSignals,
  analyzeMessageForEmotions,
  type EmotionalSignals,
  type EmotionalAnalysis,
} from '@/lib/utils/emotionalIntelligence'
import type { UserPerformance } from './PerformanceAggregator'
import type { ConversationHistory } from './ConversationContextBuilder'

// Re-export types from emotionalIntelligence for convenience
export type { EmotionalSignals, EmotionalAnalysis }

// ============================================
// EMOTIONAL ANALYSIS
// ============================================

/**
 * Build emotional analysis from available behavioral data
 */
export function buildEmotionalAnalysis(
  performance: UserPerformance,
  conversation: ConversationHistory | null,
  latestMessage?: string
): EmotionalAnalysis | null {
  try {
    // Analyze the latest message for emotional keywords
    const messageAnalysis = latestMessage
      ? analyzeMessageForEmotions(latestMessage)
      : { helpKeywordsUsed: false, frustrationKeywordsUsed: false, questionMarksCount: 0 }

    // Calculate consecutive wrong/correct answers from recent scores
    let consecutiveWrongAnswers = 0
    let consecutiveCorrectAnswers = 0
    const recentScores = performance.recentScores.slice(-10).map(s => s.score)

    // Count from the end
    for (let i = recentScores.length - 1; i >= 0; i--) {
      if (recentScores[i] < 70) {
        if (consecutiveCorrectAnswers === 0) consecutiveWrongAnswers++
        else break
      } else if (recentScores[i] >= 70) {
        if (consecutiveWrongAnswers === 0) consecutiveCorrectAnswers++
        else break
      }
    }

    // Build emotional signals from available data
    const signals: EmotionalSignals = {
      recentScores,
      consecutiveWrongAnswers,
      consecutiveCorrectAnswers,
      averageTimePerQuestion: 30, // Default, would need actual tracking
      sessionDurationMinutes: Math.min(performance.totalTimeSpentMinutes, 60),
      atomsSkipped: 0, // Would need actual tracking
      atomsCompleted: performance.atomsCompleted.length,
      hintsUsed: 0, // Would need actual tracking
      timeSinceLastActivity: 0, // Would need actual tracking
      averageSessionLength: 15, // Default average
      messageLength: latestMessage?.length || 0,
      questionMarksInMessage: messageAnalysis.questionMarksCount,
      helpKeywordsUsed: messageAnalysis.helpKeywordsUsed,
      frustrationKeywordsUsed: messageAnalysis.frustrationKeywordsUsed,
    }

    return detectEmotionalStateFromSignals(signals)
  } catch (error) {
    console.warn('Error building emotional analysis:', error)
    return null
  }
}

/**
 * Determine if student is showing signs of confusion/frustration
 */
export function isStudentConfused(emotionalAnalysis: EmotionalAnalysis | null): boolean {
  if (!emotionalAnalysis) return false
  return emotionalAnalysis.primaryState === 'confused' ||
         emotionalAnalysis.primaryState === 'frustrated'
}

/**
 * Determine if student is in a positive emotional state
 */
export function isStudentPositive(emotionalAnalysis: EmotionalAnalysis | null): boolean {
  if (!emotionalAnalysis) return false
  return emotionalAnalysis.primaryState === 'confident' ||
         emotionalAnalysis.primaryState === 'flowing'
}
