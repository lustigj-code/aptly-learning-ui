/**
 * Personality State Builder
 *
 * Builds personality and relationship context for Sage coach.
 * Handles coach character state and student relationship progression.
 */

import {
  determineTone,
  findRelevantOpinion,
  getCelebrationPhrase,
  type PersonalityState,
  type ConversationTone,
} from '@/lib/character/sagePersonality'
import {
  determineRelationshipStage,
  buildRelationshipContext,
  type RelationshipContext,
} from '@/lib/character/relationshipProgression'
import type { EmotionalAnalysis } from '@/lib/utils/emotionalIntelligence'
import type { UserPerformance } from './PerformanceAggregator'
import type { LessonContext } from './LessonContextBuilder'

// Re-export types for convenience
export type { PersonalityState, ConversationTone, RelationshipContext }

// ============================================
// PERSONALITY STATE BUILDING
// ============================================

/**
 * Build personality state for Sage based on context
 */
export function buildPersonalityState(
  emotionalAnalysis: EmotionalAnalysis | null,
  performance: UserPerformance,
  lesson: LessonContext | null,
  masteryLevel: number
): PersonalityState {
  // Determine recent performance level
  let recentPerformance: 'struggling' | 'steady' | 'excelling' = 'steady'
  if (performance.averageQuizScore < 60) {
    recentPerformance = 'struggling'
  } else if (performance.averageQuizScore >= 85) {
    recentPerformance = 'excelling'
  }

  // Determine if this is an achievement context
  const isAchievementContext =
    masteryLevel >= 80 ||
    performance.currentStreak >= 7 ||
    performance.lessonsCompleted.length % 5 === 0

  // Determine appropriate tone
  const currentTone: ConversationTone = determineTone(
    emotionalAnalysis?.primaryState || 'neutral',
    recentPerformance,
    isAchievementContext
  )

  // Check if we should share an opinion
  let shouldShareOpinion = false
  let relevantOpinion = undefined
  if (lesson?.title) {
    relevantOpinion = findRelevantOpinion(lesson.title)
    // Only share occasionally when in a good rapport
    shouldShareOpinion = !!relevantOpinion && Math.random() < 0.3
  }

  // Determine celebration level
  let celebrationLevel: 'none' | 'micro' | 'medium' | 'major' = 'none'
  if (performance.currentStreak >= 30) {
    celebrationLevel = 'major'
  } else if (performance.currentStreak >= 7 || performance.lessonsCompleted.length % 5 === 0) {
    celebrationLevel = 'medium'
  } else if (masteryLevel >= 80 || performance.averageQuizScore >= 90) {
    celebrationLevel = 'micro'
  }

  // Generate personal note based on context
  let personalNote: string | undefined
  if (celebrationLevel !== 'none') {
    personalNote = getCelebrationPhrase(celebrationLevel)
  } else if (recentPerformance === 'struggling') {
    personalNote = 'Remember: struggling is part of learning. This is normal.'
  }

  return {
    currentTone,
    shouldShareOpinion,
    relevantOpinion,
    personalNote,
    celebrationLevel,
  }
}

// ============================================
// RELATIONSHIP CONTEXT BUILDING
// ============================================

/**
 * Build relationship context from user performance data
 * @param performance - User performance data
 * @param lesson - Lesson context (reserved for future lesson-specific relationship features)
 */
export function buildRelationshipContextFromData(
  performance: UserPerformance,
  lesson: LessonContext | null
): RelationshipContext {
  // Calculate days active (approximate from data)
  // Note: lesson context reserved for future per-lesson relationship features
  void lesson
  const daysActive = Math.max(1, Math.floor(performance.totalTimeSpentMinutes / 15))

  // Determine if certification ready (based on progress)
  const isCertified = performance.overallProgress >= 100 && performance.averageQuizScore >= 80

  // Determine relationship stage
  const stage = determineRelationshipStage(
    daysActive,
    isCertified,
    performance.lessonsCompleted.length
  )

  // Build minimal relationship state for context
  const minimalState = {
    userId: 'current',
    stage,
    firstInteractionDate: new Date(Date.now() - daysActive * 24 * 60 * 60 * 1000),
    totalDaysActive: daysActive,
    currentStreak: performance.currentStreak,
    longestStreak: performance.longestStreak,
    milestonesReached: [],
    sharedMemories: [],
    lastInteractionDate: new Date(),
    emotionalDeposits: performance.lessonsCompleted.length * 2,
  }

  return buildRelationshipContext(minimalState)
}

/**
 * Determine suggested teaching approach based on context
 */
export function determineSuggestedApproach(
  experienceLevel: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  learningStyle: 'video' | 'reading' | 'mixed',
  strugglingConcepts: string[],
  goal?: string
): string {
  const approaches: string[] = []

  // Based on difficulty level
  if (difficulty === 'beginner') {
    approaches.push('Use simple language and lots of examples')
    approaches.push('Break concepts into small, digestible pieces')
    approaches.push('Provide step-by-step guidance')
  } else if (difficulty === 'intermediate') {
    approaches.push('Challenge with application questions')
    approaches.push('Connect concepts across lessons')
    approaches.push('Encourage independent problem-solving')
  } else {
    approaches.push('Push for deeper analysis')
    approaches.push('Discuss edge cases and advanced strategies')
    approaches.push('Encourage teaching concepts back')
  }

  // Based on learning style
  if (learningStyle === 'video') {
    approaches.push('Reference visual examples and demonstrations')
  } else if (learningStyle === 'reading') {
    approaches.push('Provide detailed written explanations')
  }

  // Based on struggling areas
  if (strugglingConcepts.length > 0) {
    approaches.push(`Pay special attention to: ${strugglingConcepts.slice(0, 3).join(', ')}`)
  }

  // Based on goal
  if (goal) {
    approaches.push(`Keep their goal in mind: ${goal}`)
  }

  return approaches.join('. ')
}
