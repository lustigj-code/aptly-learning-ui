/**
 * Coach Context Builder - Enhanced Version
 * Provides comprehensive context for AI coach including:
 * - User profile, goals, and preferences
 * - Current lesson/atom content
 * - Performance history and struggling areas
 * - Conversation history
 * - Emotional state detection and response strategies
 * - Character personality and relationship progression
 */

import { adminDb } from '@/lib/firebase/admin'
import { COURSE_3_MODULE_1, COURSE_1_MODULE_1 } from '@/data/mockData'
import type { AssessmentScore } from '@/lib/auth/schemas'
import type { Lesson as MockLesson } from '@/types'
import {
  detectEmotionalState,
  buildEmotionalContext,
  analyzeMessageForEmotions,
  type EmotionalSignals,
  type EmotionalAnalysis,
} from './emotionalIntelligence'
import {
  buildPersonalityContext,
  determineTone,
  findRelevantOpinion,
  getCelebrationPhrase,
  type PersonalityState,
  type ConversationTone,
} from '@/lib/character/sagePersonality'
import {
  determineRelationshipStage,
  buildRelationshipContext,
  buildRelationshipContextString,
  type RelationshipContext,
  type RelationshipStage,
} from '@/lib/character/relationshipProgression'
import {
  retrieveRelevantContent,
  formatRetrievedContext,
  type RetrievedChunk,
} from '@/lib/ai/retrievalService'
import {
  selectPedagogicalPattern,
  deriveStudentState,
  inferInteractionType,
  type PedagogicalPattern,
  type PedagogicalSignals,
} from '@/lib/ai/pedagogicalPatterns'
import {
  getUnverifiedConcepts,
  getComprehensionState,
  getExplanationHistory,
  getUntriedStrategies,
  type ConceptComprehension,
  type ExplanationAttempt,
} from '@/lib/services/coachService'

// ============================================
// TYPES
// ============================================

export type UserProfile = {
  id: string
  name: string
  email: string
  goal?: string
  experienceLevel: number // 0-100
  learningStyle: 'video' | 'reading' | 'mixed'
  dailyGoalMinutes: number
  voiceEnabled: boolean
}

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

export type AtomContent = {
  id: string
  type: 'reading' | 'video' | 'quiz' | 'practice'
  title: string
  content: string | object
  objectives?: string[]
  keyPoints?: string[]
  expectedOutcomes?: string[]
  rubric?: Array<{
    criterion: string
    weight: number
  }>
}

export type LessonContext = {
  id: string
  title: string
  objectives: string[]
  atoms: AtomContent[]
  moduleId: string
  moduleName: string
  courseId: string
  courseName: string
  estimatedMinutes: number
  prerequisitesConcepts: string[]
}

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
  ragContent: string | null // RAG-retrieved curriculum content
  pedagogicalPattern: PedagogicalPattern | null // Selected teaching pattern
  comprehensionState: {
    unverifiedConcepts: string[]      // Concept names pending verification
    lastVerifiedMinutesAgo: number    // Time since last verification
    shouldTriggerVerification: boolean // Whether to prompt verification now
  } | null
  adaptiveExplanation: {
    isConfused: boolean
    confusedAbout: string | null      // Concept they're struggling with
    triedStrategies: string[]         // What we've already tried
    suggestedStrategy: string         // Next strategy to try
    strategyGuidance: string          // How to apply this strategy
  } | null
  contextString: string
}

// ============================================
// ADAPTIVE EXPLANATION STRATEGIES
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
  latestMessage?: string // Optional: for emotional analysis
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
    let currentAtom: AtomContent | null = null
    if (atomId && lessonContext) {
      currentAtom = lessonContext.atoms.find((a) => a.id === atomId) || null
    }

    // Calculate mastery and adaptive difficulty
    const masteryLevel = calculateMasteryLevel(userPerformance, lessonContext)
    const adaptiveDifficulty = determineAdaptiveDifficulty(
      userProfile.experienceLevel,
      masteryLevel,
      userPerformance.averageQuizScore
    )

    // Determine teaching approach
    const suggestedApproach = determineSuggestedApproach(
      userProfile,
      userPerformance,
      masteryLevel,
      adaptiveDifficulty
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
        // RAG is non-critical - coach can still function without it
        console.warn('[CoachContext] RAG retrieval failed:', ragError)
      }
    }

    // Fetch comprehension state if conversationId provided
    let comprehensionStateData: CoachContextData['comprehensionState'] = null
    if (conversationId) {
      try {
        const unverifiedConcepts = await getUnverifiedConcepts(conversationId)
        const fullState = await getComprehensionState(conversationId)

        if (unverifiedConcepts.length > 0 || fullState) {
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

          comprehensionStateData = {
            unverifiedConcepts: unverifiedConcepts.map((c) => c.conceptName),
            lastVerifiedMinutesAgo,
            shouldTriggerVerification,
          }
          console.log(`[CoachContext] Comprehension state: ${unverifiedCount} unverified, trigger=${shouldTriggerVerification}`)
        }
      } catch (compError) {
        // Comprehension tracking is non-critical
        console.warn('[CoachContext] Comprehension state fetch failed:', compError)
      }
    }

    // Build adaptive explanation guidance when student shows confusion
    let adaptiveExplanationData: CoachContextData['adaptiveExplanation'] = null
    const isConfused = emotionalAnalysis?.primaryState === 'confused' ||
                       emotionalAnalysis?.primaryState === 'frustrated'

    if (isConfused && conversationId) {
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
          if (comprehensionStateData?.unverifiedConcepts) {
            for (const concept of comprehensionStateData.unverifiedConcepts) {
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

        adaptiveExplanationData = {
          isConfused: true,
          confusedAbout,
          triedStrategies,
          suggestedStrategy,
          strategyGuidance: STRATEGY_GUIDANCE[suggestedStrategy] || STRATEGY_GUIDANCE.breakdown,
        }
        console.log(`[CoachContext] Student confused, suggesting strategy: ${suggestedStrategy}`)
      } catch (adaptError) {
        console.warn('[CoachContext] Adaptive explanation failed:', adaptError)
      }
    }

    // Select pedagogical pattern based on current signals
    let pedagogicalPattern: PedagogicalPattern | null = null
    try {
      const studentState = deriveStudentState(masteryLevel, emotionalAnalysis)
      const lastInteractionType = inferInteractionType(latestMessage || '')

      // Check if milestone was just completed (new lesson completion)
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
      // Pattern selection is non-critical
      console.warn('[CoachContext] Pattern selection failed:', patternError)
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
      contextString,
    }
  } catch (error) {
    console.error(`Error building coach context for user ${userId}:`, error)
    // Return minimal context on error
    return buildMinimalContext(userId)
  }
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return getDefaultUserProfile(userId)
    }

    const data = userDoc.data()
    return {
      id: userId,
      name: data?.name || 'Learner',
      email: data?.email || '',
      goal: data?.preferences?.goal || data?.goal || undefined,
      experienceLevel: data?.preferences?.experienceLevel || 0,
      learningStyle: data?.preferences?.preferReadingOrVideo === 'video' ? 'video' :
                     data?.preferences?.preferReadingOrVideo === 'reading' ? 'reading' : 'mixed',
      dailyGoalMinutes: data?.preferences?.dailyGoalMinutes || 15,
      voiceEnabled: data?.preferences?.voiceEnabled || false,
    }
  } catch (error) {
    console.error(`Error fetching user profile for ${userId}:`, error)
    return getDefaultUserProfile(userId)
  }
}

async function fetchUserPerformance(userId: string): Promise<UserPerformance> {
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

async function fetchLessonContext(lessonId: string): Promise<LessonContext | null> {
  try {
    // First try Firestore
    const lessonDoc = await adminDb.collection('lessons').doc(lessonId).get()

    if (lessonDoc.exists) {
      const data = lessonDoc.data()

      // Fetch full atom content
      const atoms: AtomContent[] = (data?.atoms || []).map((atom: Record<string, unknown>) => ({
        id: atom.id as string || '',
        type: atom.type as AtomContent['type'] || 'reading',
        title: atom.title as string || '',
        content: atom.content || '',
        objectives: atom.objectives as string[] || [],
        keyPoints: atom.keyPoints as string[] || [],
        expectedOutcomes: atom.expectedOutcomes as string[] || [],
        rubric: atom.rubric as AtomContent['rubric'] || [],
      }))

      return {
        id: lessonDoc.id,
        title: data?.title || 'Unknown Lesson',
        objectives: data?.objectives || [],
        atoms,
        moduleId: data?.moduleId || '',
        moduleName: '',
        courseId: data?.courseId || '',
        courseName: '',
        estimatedMinutes: data?.estimatedMinutes || 15,
        prerequisitesConcepts: data?.prerequisites || [],
      }
    }

    // Fall back to mock data if not found in Firestore
    const mockModules = [COURSE_3_MODULE_1, COURSE_1_MODULE_1]
    for (const module of mockModules) {
      const mockLesson = module.lessons.find((l: MockLesson) => l.id === lessonId)
      if (mockLesson) {
        // Convert mock lesson to LessonContext
        const atoms: AtomContent[] = (mockLesson.atoms || []).map((atom) => ({
          id: atom.id,
          type: atom.type as AtomContent['type'],
          title: atom.title,
          content: atom.content || '',
          objectives: [],
          keyPoints: (atom.content as { keyTakeaways?: string[] })?.keyTakeaways || [],
          expectedOutcomes: (atom.content as { expectedOutcomes?: string[] })?.expectedOutcomes || [],
          rubric: (atom.content as { rubric?: Array<{ criterion: string; weight: number }> })?.rubric || [],
        }))

        return {
          id: mockLesson.id,
          title: mockLesson.title,
          objectives: mockLesson.objectives || [],
          atoms,
          moduleId: module.id,
          moduleName: module.title,
          courseId: module.courseId,
          courseName: '', // Would need to look this up
          estimatedMinutes: mockLesson.estimatedMinutes || 15,
          prerequisitesConcepts: [],
        }
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching lesson context for ${lessonId}:`, error)
    return null
  }
}

async function fetchConversationHistory(
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
// EMOTIONAL ANALYSIS
// ============================================

/**
 * Build emotional analysis from available behavioral data
 */
function buildEmotionalAnalysis(
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

    return detectEmotionalState(signals)
  } catch (error) {
    console.warn('Error building emotional analysis:', error)
    return null
  }
}

// ============================================
// PERSONALITY & RELATIONSHIP FUNCTIONS
// ============================================

/**
 * Build personality state for Sage based on context
 */
function buildPersonalityState(
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

/**
 * Build relationship context from user performance data
 */
function buildRelationshipContextFromData(
  performance: UserPerformance,
  lesson: LessonContext | null
): RelationshipContext {
  // Calculate days active (approximate from data)
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

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function identifyConceptStrengths(scores: AssessmentScore[]): {
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

function calculateMasteryLevel(
  performance: UserPerformance,
  lesson: LessonContext | null
): number {
  // Weight: 40% completion, 40% quiz scores, 20% consistency
  let completionScore = 0
  if (lesson) {
    const atomsInLesson = lesson.atoms.length
    const completedInLesson = performance.atomsCompleted.filter((a) =>
      a.startsWith(lesson.id)
    ).length
    completionScore = atomsInLesson > 0 ? (completedInLesson / atomsInLesson) * 40 : 0
  } else {
    // Overall completion
    completionScore = (performance.overallProgress / 100) * 40
  }

  const quizScore = (performance.averageQuizScore / 100) * 40

  // Consistency based on streak
  const consistencyScore = Math.min(performance.currentStreak / 7, 1) * 20

  return Math.round(completionScore + quizScore + consistencyScore)
}

function determineAdaptiveDifficulty(
  experienceLevel: number,
  masteryLevel: number,
  averageQuizScore: number
): 'beginner' | 'intermediate' | 'advanced' {
  const combinedScore = (experienceLevel * 0.3 + masteryLevel * 0.4 + averageQuizScore * 0.3)

  if (combinedScore < 40) return 'beginner'
  if (combinedScore < 75) return 'intermediate'
  return 'advanced'
}

function determineSuggestedApproach(
  user: UserProfile,
  performance: UserPerformance,
  masteryLevel: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
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
  if (user.learningStyle === 'video') {
    approaches.push('Reference visual examples and demonstrations')
  } else if (user.learningStyle === 'reading') {
    approaches.push('Provide detailed written explanations')
  }

  // Based on struggling areas
  if (performance.strugglingConcepts.length > 0) {
    approaches.push(`Pay special attention to: ${performance.strugglingConcepts.slice(0, 3).join(', ')}`)
  }

  // Based on goal
  if (user.goal) {
    approaches.push(`Keep their goal in mind: ${user.goal}`)
  }

  return approaches.join('. ')
}

// ============================================
// CONTEXT STRING BUILDER
// ============================================

function buildContextString(data: Omit<CoachContextData, 'contextString'>): string {
  const sections: string[] = []

  // Personality Context (Sage's character)
  if (data.personalityState) {
    sections.push(buildPersonalityContext(data.personalityState))
  }

  // Relationship Context (history with student)
  if (data.relationshipContext) {
    sections.push(buildRelationshipContextString(data.relationshipContext))
  }

  // Emotional State Section (prioritize if detected with confidence)
  if (data.emotionalAnalysis && data.emotionalAnalysis.confidence >= 0.25) {
    sections.push(buildEmotionalContext(data.emotionalAnalysis))
  }

  // User Profile Section
  sections.push(`
=== STUDENT PROFILE ===
Name: ${data.user.name}
Goal: ${data.user.goal || 'Not specified'}
Experience Level: ${data.user.experienceLevel}% (${data.adaptiveDifficulty})
Learning Preference: ${data.user.learningStyle === 'video' ? 'Prefers video content' : data.user.learningStyle === 'reading' ? 'Prefers reading' : 'Mixed'}
Daily Goal: ${data.user.dailyGoalMinutes} minutes`)

  // Performance Section
  sections.push(`
=== PERFORMANCE DATA ===
Overall Progress: ${data.performance.overallProgress}%
Current Mastery Level: ${data.masteryLevel}%
XP Earned: ${data.performance.xp.toLocaleString()}
Current Streak: ${data.performance.currentStreak} days
Average Quiz Score: ${Math.round(data.performance.averageQuizScore)}%
Total Study Time: ${data.performance.totalTimeSpentMinutes} minutes

Lessons Completed: ${data.performance.lessonsCompleted.length}
Atoms Completed: ${data.performance.atomsCompleted.length}`)

  // Struggling/Strong Areas
  if (data.performance.strugglingConcepts.length > 0) {
    sections.push(`
Areas Needing Attention: ${data.performance.strugglingConcepts.join(', ')}`)
  }
  if (data.performance.strongConcepts.length > 0) {
    sections.push(`
Strong Areas: ${data.performance.strongConcepts.join(', ')}`)
  }

  // Current Lesson Section
  if (data.lesson) {
    sections.push(`
=== CURRENT LESSON ===
Course: ${data.lesson.courseName || data.lesson.courseId}
Module: ${data.lesson.moduleName || data.lesson.moduleId}
Lesson: ${data.lesson.title}
Objectives:
${data.lesson.objectives.map((o) => `  - ${o}`).join('\n')}
Estimated Time: ${data.lesson.estimatedMinutes} minutes`)
  }

  // Current Atom Section (if applicable)
  if (data.currentAtom) {
    sections.push(`
=== CURRENT CONTENT ===
Type: ${data.currentAtom.type}
Title: ${data.currentAtom.title}`)

    if (data.currentAtom.keyPoints && data.currentAtom.keyPoints.length > 0) {
      sections.push(`Key Points:
${data.currentAtom.keyPoints.map((k) => `  - ${k}`).join('\n')}`)
    }

    if (data.currentAtom.type === 'practice' && data.currentAtom.expectedOutcomes) {
      sections.push(`Expected Outcomes:
${data.currentAtom.expectedOutcomes.map((o) => `  - ${o}`).join('\n')}`)
    }

    if (data.currentAtom.type === 'practice' && data.currentAtom.rubric) {
      sections.push(`Evaluation Rubric:
${data.currentAtom.rubric.map((r) => `  - ${r.criterion} (${Math.round(r.weight * 100)}%)`).join('\n')}`)
    }

    // Include actual content for reading atoms (truncated if long)
    if (data.currentAtom.type === 'reading' && typeof data.currentAtom.content === 'string') {
      const truncatedContent =
        data.currentAtom.content.length > 2000
          ? data.currentAtom.content.substring(0, 2000) + '...[truncated]'
          : data.currentAtom.content
      sections.push(`
Content Being Studied:
${truncatedContent}`)
    }
  }

  // RAG Content Section (relevant curriculum material for the user's question)
  if (data.ragContent) {
    sections.push(`
=== RELEVANT COURSE MATERIAL ===
The following content from the FSM curriculum is relevant to the student's question:

${data.ragContent}

Use this content to inform your response, but remember:
- Don't quote directly unless teaching a specific concept
- Guide the student to discover insights through questions
- Reference the source lesson when helpful`)
  }

  // Verification Needed Section (when unverified concepts accumulate)
  if (data.comprehensionState?.shouldTriggerVerification) {
    sections.push(`
=== VERIFICATION NEEDED ===
Before continuing, verify the student's understanding of these concepts:
${data.comprehensionState.unverifiedConcepts.join(', ')}

Use the VERIFY pattern: Ask them to explain one concept in their own words,
or apply it to a scenario. Don't just ask "do you understand?" - that's useless.

If they demonstrate understanding, acknowledge it specifically.
If they struggle, don't re-explain yet - ask a simpler question to find the gap.`)
  }

  // Adaptive Explanation Section (when student is confused)
  if (data.adaptiveExplanation?.isConfused) {
    const { confusedAbout, triedStrategies, suggestedStrategy, strategyGuidance } = data.adaptiveExplanation
    sections.push(`
=== STUDENT NEEDS DIFFERENT APPROACH ===
The student seems confused${confusedAbout ? ` about: ${confusedAbout}` : ''}.

Already tried: ${triedStrategies.length > 0 ? triedStrategies.join(', ') : 'nothing yet'}

Try this strategy: ${suggestedStrategy.toUpperCase()}
${strategyGuidance}

DO NOT repeat the same explanation. If the first approach didn't work, a different
angle is needed. Acknowledge their struggle and try the new approach.`)
  }

  // Conversation History Section
  if (data.conversation && data.conversation.messages.length > 0) {
    sections.push(`
=== CONVERSATION CONTEXT ===
Session Goal: ${data.conversation.sessionGoal || 'General learning support'}
Previous Messages in This Session: ${data.conversation.messages.length}

Recent Conversation:
${data.conversation.messages
  .slice(-5)
  .map((m) => `[${m.role.toUpperCase()}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
  .join('\n')}`)
  }

  // Pedagogical Pattern Section (specific teaching approach for this interaction)
  if (data.pedagogicalPattern) {
    const pattern = data.pedagogicalPattern
    const exampleExchange = pattern.exampleExchanges[0] // Use first example
    sections.push(`
=== PEDAGOGICAL APPROACH ===
For this interaction, use the ${pattern.patternName} pattern:
${pattern.promptTemplate}

Example of this pattern in action:
Student: "${exampleExchange.student}"
Coach: "${exampleExchange.coach}"`)
  }

  // Teaching Approach Section
  sections.push(`
=== TEACHING APPROACH ===
${data.suggestedApproach}

IMPORTANT INSTRUCTIONS:
1. NEVER give direct answers - use Socratic questioning to guide discovery
2. Adapt complexity to the student's ${data.adaptiveDifficulty} level
3. Connect new concepts to their existing knowledge
4. Celebrate progress and acknowledge challenges
5. Be concise but thorough - respect their time
6. If they seem frustrated, acknowledge it and simplify
7. Always check understanding with follow-up questions`)

  return sections.join('\n')
}

// ============================================
// DEFAULT/FALLBACK FUNCTIONS
// ============================================

function getDefaultUserProfile(userId: string): UserProfile {
  return {
    id: userId,
    name: 'Learner',
    email: '',
    goal: undefined,
    experienceLevel: 25,
    learningStyle: 'mixed',
    dailyGoalMinutes: 15,
    voiceEnabled: false,
  }
}

function getDefaultPerformance(): UserPerformance {
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
    contextString: `Student ID: ${userId}\nNo additional context available. Provide general support and guidance.`,
  }
}

// ============================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================

// Keep the old function signature working
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
