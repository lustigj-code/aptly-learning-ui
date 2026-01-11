/**
 * Autopilot Director - AI Decision Logic for Learning Sessions
 *
 * Controls the pacing and flow of autopilot learning sessions:
 * - Decides what content to show next
 * - Determines when to intervene for struggling students
 * - Manages transitions between learning, practice, and review
 * - Integrates with FSRS/BKT for mastery-aware decisions
 */

import type { Atom, Lesson } from '@/types'
import type { SessionItem, LearningSession } from '@/lib/adaptive/sessionBuilder'
import type { StruggleAnalysis } from './struggle-detection'

// ============================================
// TYPES
// ============================================

export type AutopilotAction =
  | { type: 'show_content'; atom: Atom; intro: string }
  | { type: 'ask_question'; question: string; expectedTopics: string[] }
  | { type: 'offer_break'; reason: string; suggestedMinutes: number }
  | { type: 'switch_to_review'; skills: string[]; reason: string }
  | { type: 'provide_hint'; hint: string; hintLevel: 1 | 2 | 3 }
  | { type: 'celebrate'; achievement: string; xpEarned: number }
  | { type: 'session_complete'; summary: SessionSummary }
  | { type: 'intervene'; intervention: string; interventionType: InterventionType }

export type InterventionType =
  | 'hint'
  | 'scaffold'
  | 'prerequisite_review'
  | 'break_suggestion'
  | 'encouragement'

export type SessionSummary = {
  itemsCompleted: number
  correctAnswers: number
  totalQuestions: number
  timeSpentMinutes: number
  skillsWorked: string[]
  masteryGained: Record<string, number>
  nextRecommendation: string
}

export type AutopilotContext = {
  session: LearningSession
  currentIndex: number
  completedItems: string[]
  struggleAnalysis: StruggleAnalysis | null
  userMastery: Record<string, number>
  sessionDurationSeconds: number
  recentPerformance: number[] // Last 5 quiz scores
  hintsUsed: number
  lastInteraction: Date
}

// ============================================
// MAIN DECISION FUNCTION
// ============================================

/**
 * Decide the next action for the autopilot session
 */
export function decideNextAction(context: AutopilotContext): AutopilotAction {
  const {
    session,
    currentIndex,
    completedItems,
    struggleAnalysis,
    sessionDurationSeconds,
    recentPerformance,
  } = context

  // Check if session is complete
  if (currentIndex >= session.items.length) {
    return createSessionComplete(context)
  }

  // Check for struggle intervention
  if (struggleAnalysis?.shouldIntervene) {
    return handleStruggleIntervention(struggleAnalysis, context)
  }

  // Check for break suggestion (every 15-20 minutes of focused work)
  if (shouldSuggestBreak(sessionDurationSeconds, recentPerformance)) {
    return {
      type: 'offer_break',
      reason: "You've been working hard! A short break can help consolidate what you've learned.",
      suggestedMinutes: 2,
    }
  }

  // Get next session item
  const nextItem = session.items[currentIndex]

  // Check for celebration moments
  const celebration = checkForCelebration(context, nextItem)
  if (celebration) {
    return celebration
  }

  // Return next content to show
  return createShowContentAction(nextItem, context)
}

// ============================================
// CONTENT INTRODUCTION GENERATION
// ============================================

/**
 * Generate contextual introduction for content
 */
export function generateContentIntro(
  item: SessionItem,
  context: AutopilotContext
): string {
  const { currentIndex, session, userMastery, recentPerformance } = context
  const totalItems = session.items.length
  const progress = (currentIndex / totalItems) * 100

  // Base intros by content type
  const typeIntros: Record<SessionItem['type'], string[]> = {
    warmup: [
      "Let's start with a quick warm-up to get your brain in learning mode!",
      "Before we dive into new material, let's refresh your memory on this.",
      "A quick review to prime your thinking...",
    ],
    learn: [
      "Here's the next concept to master.",
      "Ready to learn something new? Here we go!",
      "This is an important one - take your time with it.",
      "Let's explore this together.",
    ],
    practice: [
      "Time to put what you've learned into practice!",
      "Let's see how well you've grasped this.",
      "Practice makes perfect - give this a try.",
    ],
    quiz: [
      "Quick check - don't worry, I'm here to help if you get stuck.",
      "Let's test your understanding with a few questions.",
      "Quiz time! Show me what you know.",
    ],
    review: [
      "This one's due for review - let's make sure it sticks!",
      "Time to reinforce this concept.",
      "Let's strengthen this memory.",
    ],
    cooldown: [
      "Great session! Let's end with a quick recap.",
      "Before we wrap up, let's reinforce what you learned.",
      "Final review to lock in today's learning.",
    ],
  }

  // Select random base intro
  const baseIntros = typeIntros[item.type] || typeIntros.learn
  let intro = baseIntros[Math.floor(Math.random() * baseIntros.length)]

  // Add progress context
  if (currentIndex === 0) {
    intro = `Let's get started! ${intro}`
  } else if (currentIndex === totalItems - 1) {
    intro = `Last one for today! ${intro}`
  } else if (progress >= 50 && progress < 60) {
    intro = `Halfway there! ${intro}`
  } else if (progress >= 75) {
    intro = `Almost done - great progress! ${intro}`
  }

  // Add performance-based encouragement
  const avgScore = recentPerformance.length > 0
    ? recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length
    : 100

  if (avgScore >= 90 && item.type !== 'warmup') {
    intro += " You're on fire today!"
  } else if (avgScore < 60 && item.type === 'learn') {
    intro += " Take your time - understanding is more important than speed."
  }

  return intro
}

// ============================================
// STRUGGLE INTERVENTION
// ============================================

function handleStruggleIntervention(
  struggle: StruggleAnalysis,
  context: AutopilotContext
): AutopilotAction {
  const { hintsUsed } = context

  // Progressive intervention based on struggle level and hints used
  if (struggle.level === 'severe') {
    return {
      type: 'intervene',
      intervention: struggle.suggestedIntervention ||
        "I can see this is challenging. Let's step back and approach it differently.",
      interventionType: struggle.interventionType || 'scaffold',
    }
  }

  if (struggle.level === 'moderate') {
    // Provide escalating hints
    const hintLevel = Math.min(3, hintsUsed + 1) as 1 | 2 | 3
    return {
      type: 'provide_hint',
      hint: generateHint(context, hintLevel),
      hintLevel,
    }
  }

  // Mild struggle - gentle encouragement
  return {
    type: 'intervene',
    intervention: "You're doing well! Remember, struggling a bit is part of learning.",
    interventionType: 'encouragement',
  }
}

function generateHint(context: AutopilotContext, level: 1 | 2 | 3): string {
  const hints: Record<1 | 2 | 3, string> = {
    1: "Think about how this connects to what you learned earlier...",
    2: "Here's a clue: focus on the key relationship between the main concepts.",
    3: "Let me break this down step by step...",
  }
  return hints[level]
}

// ============================================
// BREAK SUGGESTIONS
// ============================================

function shouldSuggestBreak(
  durationSeconds: number,
  recentPerformance: number[]
): boolean {
  // Suggest break every 15-20 minutes
  const durationMinutes = durationSeconds / 60

  if (durationMinutes < 15) return false
  if (durationMinutes > 20 && durationMinutes % 15 < 1) return true

  // Also suggest if performance is declining
  if (recentPerformance.length >= 3) {
    const recent3 = recentPerformance.slice(-3)
    const trend = recent3[2] - recent3[0]
    if (trend < -20) return true // Declining performance
  }

  return false
}

// ============================================
// CELEBRATIONS
// ============================================

function checkForCelebration(
  context: AutopilotContext,
  nextItem: SessionItem
): AutopilotAction | null {
  const { completedItems, recentPerformance } = context

  // First item completed
  if (completedItems.length === 1) {
    return {
      type: 'celebrate',
      achievement: 'First step complete!',
      xpEarned: 10,
    }
  }

  // Perfect score streak
  if (recentPerformance.length >= 3) {
    const last3 = recentPerformance.slice(-3)
    if (last3.every(score => score >= 90)) {
      return {
        type: 'celebrate',
        achievement: 'Perfect streak! 3 in a row!',
        xpEarned: 25,
      }
    }
  }

  // Halfway point
  if (completedItems.length === Math.floor(context.session.items.length / 2)) {
    return {
      type: 'celebrate',
      achievement: 'Halfway there!',
      xpEarned: 15,
    }
  }

  return null
}

// ============================================
// CONTENT ACTIONS
// ============================================

function createShowContentAction(
  item: SessionItem,
  context: AutopilotContext
): AutopilotAction {
  // Create mock atom for now - in production, fetch from database
  const mockAtom: Atom = {
    id: item.itemId,
    lessonId: 'lesson-1',
    type: item.type === 'quiz' ? 'quiz' :
          item.type === 'practice' ? 'practice' :
          item.type === 'warmup' || item.type === 'cooldown' || item.type === 'review' ? 'reading' :
          'video',
    title: item.reason,
    content: {
      videoUrl: '',
      transcript: '',
      duration: item.estimatedMinutes * 60,
      chapters: [],
      keyTakeaways: [],
    },
    estimatedMinutes: item.estimatedMinutes,
    isRequired: true,
    masteryThreshold: 70,
  }

  return {
    type: 'show_content',
    atom: mockAtom,
    intro: generateContentIntro(item, context),
  }
}

function createSessionComplete(context: AutopilotContext): AutopilotAction {
  const { session, completedItems, sessionDurationSeconds } = context

  // Calculate summary
  const summary: SessionSummary = {
    itemsCompleted: completedItems.length,
    correctAnswers: 0, // Would be tracked during session
    totalQuestions: 0,
    timeSpentMinutes: Math.ceil(sessionDurationSeconds / 60),
    skillsWorked: session.skillsFocused,
    masteryGained: {},
    nextRecommendation: generateNextRecommendation(context),
  }

  return {
    type: 'session_complete',
    summary,
  }
}

function generateNextRecommendation(context: AutopilotContext): string {
  const { recentPerformance, session } = context

  const avgScore = recentPerformance.length > 0
    ? recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length
    : 100

  if (avgScore >= 90) {
    return "You're doing great! Ready to tackle more advanced material tomorrow."
  } else if (avgScore >= 70) {
    return "Good progress! A quick review tomorrow will help solidify this knowledge."
  } else {
    return "Let's revisit these concepts tomorrow - repetition is key to mastery."
  }
}

// ============================================
// ADAPTIVE PACING
// ============================================

/**
 * Adjust pacing based on user performance and engagement
 */
export function adjustPacing(
  context: AutopilotContext
): 'faster' | 'normal' | 'slower' {
  const { recentPerformance, struggleAnalysis, sessionDurationSeconds } = context

  // Check performance trend
  const avgScore = recentPerformance.length > 0
    ? recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length
    : 100

  // Slow down if struggling
  if (struggleAnalysis?.level === 'moderate' || struggleAnalysis?.level === 'severe') {
    return 'slower'
  }

  // Slow down if low scores
  if (avgScore < 60) {
    return 'slower'
  }

  // Speed up if doing well and session is long
  if (avgScore >= 90 && sessionDurationSeconds > 600) {
    return 'faster'
  }

  return 'normal'
}

/**
 * Get time multiplier for content based on pacing
 */
export function getPacingMultiplier(pacing: 'faster' | 'normal' | 'slower'): number {
  switch (pacing) {
    case 'faster':
      return 0.8 // 20% less time between items
    case 'slower':
      return 1.5 // 50% more time, more explanation
    default:
      return 1.0
  }
}

// ============================================
// MASTERY INTEGRATION
// ============================================

/**
 * Check if user should skip content based on mastery
 */
export function shouldSkipContent(
  skillId: string,
  mastery: number,
  contentType: SessionItem['type']
): boolean {
  // Never skip quizzes or practice - they're for verification
  if (contentType === 'quiz' || contentType === 'practice') {
    return false
  }

  // Skip learning content if mastery is very high
  if (contentType === 'learn' && mastery >= 0.95) {
    return true
  }

  // Skip warmup/review if mastery is perfect
  if ((contentType === 'warmup' || contentType === 'review') && mastery >= 0.98) {
    return true
  }

  return false
}

/**
 * Recommend review items based on mastery decay
 */
export function getReviewRecommendations(
  mastery: Record<string, number>,
  limit: number = 3
): string[] {
  return Object.entries(mastery)
    .filter(([_, level]) => level < 0.7) // Below 70% mastery
    .sort((a, b) => a[1] - b[1]) // Sort by lowest mastery first
    .slice(0, limit)
    .map(([skillId]) => skillId)
}
