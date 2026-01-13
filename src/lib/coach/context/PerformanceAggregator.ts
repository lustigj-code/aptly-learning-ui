/**
 * Performance Aggregator
 *
 * Aggregates user performance metrics for coach context.
 * Calculates mastery, accuracy, speed metrics.
 */

import { adminDb } from '@/lib/firebase/admin'
import type { AssessmentScore } from '@/lib/auth/schemas'

// ============================================
// TYPES
// ============================================

export type UserPerformance = {
  xp: number
  currentStreak: number
  longestStreak: number
  overallProgress: number // percentage
  atomsCompleted: string[]
  lessonsCompleted: string[]
  modulesCompleted: string[]
  recentScores: Array<{
    lessonId: string
    score: number
    date: Date
  }>
  strugglingConcepts: string[]
  strongConcepts: string[]
  averageQuizScore: number
  totalTimeSpentMinutes: number
}

// ============================================
// PERFORMANCE FETCHING
// ============================================

/**
 * Fetch user performance data from Firestore
 * Returns default performance if user not found
 */
export async function fetchUserPerformance(userId: string): Promise<UserPerformance> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return getDefaultPerformance()
    }

    const data = userDoc.data()
    const progress = data?.progress || {}
    const streak = data?.streak || {}

    // Get assessment scores
    const assessmentScores: AssessmentScore[] = progress.assessmentScores || []
    const recentScores = assessmentScores.slice(-10).map((s) => ({
      lessonId: s.assessmentId || '',
      score: s.score,
      date: s.completedAt instanceof Date ? s.completedAt : new Date(s.completedAt),
    }))

    // Calculate average quiz score
    const averageQuizScore =
      recentScores.length > 0
        ? recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length
        : 0

    // Identify struggling and strong concepts based on scores
    const { strugglingConcepts, strongConcepts } = identifyConceptStrengths(assessmentScores)

    return {
      xp: progress.xp || 0,
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      overallProgress: progress.overallPercentage || 0,
      atomsCompleted: progress.atomsCompleted || [],
      lessonsCompleted: progress.lessonsCompleted || [],
      modulesCompleted: progress.modulesCompleted || [],
      recentScores,
      strugglingConcepts,
      strongConcepts,
      averageQuizScore,
      totalTimeSpentMinutes: progress.totalTimeSpentMinutes || 0,
    }
  } catch (error) {
    console.error(`Error fetching user performance for ${userId}:`, error)
    return getDefaultPerformance()
  }
}

/**
 * Get default performance for new users
 */
export function getDefaultPerformance(): UserPerformance {
  return {
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    overallProgress: 0,
    atomsCompleted: [],
    lessonsCompleted: [],
    modulesCompleted: [],
    recentScores: [],
    strugglingConcepts: [],
    strongConcepts: [],
    averageQuizScore: 0,
    totalTimeSpentMinutes: 0,
  }
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Identify struggling and strong concepts based on assessment scores
 */
export function identifyConceptStrengths(scores: AssessmentScore[]): {
  strugglingConcepts: string[]
  strongConcepts: string[]
} {
  // Group scores by concept/topic
  const conceptScores: Record<string, number[]> = {}

  for (const score of scores) {
    const concept = score.assessmentId || 'general'
    if (!conceptScores[concept]) {
      conceptScores[concept] = []
    }
    conceptScores[concept].push(score.score)
  }

  const strugglingConcepts: string[] = []
  const strongConcepts: string[] = []

  for (const [concept, conceptScoreList] of Object.entries(conceptScores)) {
    const avg = conceptScoreList.reduce((a, b) => a + b, 0) / conceptScoreList.length
    if (avg < 60) {
      strugglingConcepts.push(concept)
    } else if (avg >= 85) {
      strongConcepts.push(concept)
    }
  }

  return { strugglingConcepts, strongConcepts }
}

/**
 * Calculate mastery level based on performance and lesson context
 */
export function calculateMasteryLevel(
  performance: UserPerformance,
  lessonId?: string,
  lessonAtomCount?: number,
  lessonAtomIds?: string[]
): number {
  // Weight: 40% completion, 40% quiz scores, 20% consistency
  let completionScore = 0
  if (lessonId && lessonAtomCount && lessonAtomIds) {
    const completedInLesson = performance.atomsCompleted.filter((a) =>
      lessonAtomIds.includes(a) || a.startsWith(lessonId)
    ).length
    completionScore = lessonAtomCount > 0 ? (completedInLesson / lessonAtomCount) * 40 : 0
  } else {
    // Overall completion
    completionScore = (performance.overallProgress / 100) * 40
  }

  const quizScore = (performance.averageQuizScore / 100) * 40

  // Consistency based on streak
  const consistencyScore = Math.min(performance.currentStreak / 7, 1) * 20

  return Math.round(completionScore + quizScore + consistencyScore)
}

/**
 * Determine adaptive difficulty level based on performance
 */
export function determineAdaptiveDifficulty(
  experienceLevel: number,
  masteryLevel: number,
  averageQuizScore: number
): 'beginner' | 'intermediate' | 'advanced' {
  const combinedScore = (experienceLevel * 0.3 + masteryLevel * 0.4 + averageQuizScore * 0.3)

  if (combinedScore < 40) return 'beginner'
  if (combinedScore < 75) return 'intermediate'
  return 'advanced'
}
