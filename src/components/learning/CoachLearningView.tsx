'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  ArrowLeft,
  Brain,
  WifiOff,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useReviewQueue } from '@/hooks/useReviewQueue'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useUser } from '@/store/userProfileStore'
import { useLearningPreference } from '@/hooks/useLearningPreference'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useCourse, useModule, usePrefetchNextLesson } from '@/hooks/useCourseContent'
import { getCourse, getDefaultCourse, DEFAULT_COURSE_ID } from '@/data/courseRegistry'
import type { Lesson, Module } from '@/types'

// Import content renderers
import { ContentRenderer } from './ContentRenderer'
import { SwipeableAtomView } from './SwipeableAtomView'
import { AnimatedContent } from './AnimatedContent'
import { ContentSkeleton } from './ContentSkeleton'

// Import coach chat component (Phase 4 integration)
import { MainCoachChat } from '@/components/coach/MainCoachChat'
import type { CoachAction } from '@/types/coachActions'

// Import intelligence components (Phase 3-2)
import { WhyThisContent } from './WhyThisContent'
// These are imported but currently not used in the JSX - keeping for future use
// import { RealTimeMasteryBar } from './RealTimeMasteryBar'
// import { ContentSkipOption } from './ContentSkipOption'
import { PacingIndicator, calculateAverageResponseTime } from './PacingIndicator'

// Import struggle detection
import {
  initStruggleTracking,
  recordAnswer,
  recordContentView,
  clearStruggleTracking,
  type StruggleState,
  type InterventionType as StruggleInterventionType,
} from '@/lib/coach/struggleDetector'
import { StrugglePrompt } from '@/components/coach/ProactivePrompt'

// Import timing system for proactive coach
import { TimingPrompt } from '@/components/coach/TimingPrompt'
import {
  type TimingTrigger,
  type SessionPhase,
  type TimingPreferences,
  checkSessionTransition,
  filterByPreferences,
  DEFAULT_TIMING_PREFERENCES,
} from '@/lib/coach/optimalTiming'

// Mastery gating (enabled)
import { useMasteryLevels } from '@/hooks/useMasteryLevels'
import { areLessonPrerequisitesMet, getMissingPrerequisites } from '@/data/courseToConceptMap'
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph'

// ============================================
// TYPES
// ============================================

type SessionState = {
  courseId: string
  moduleId: string
  currentLessonIndex: number
  currentAtomIndex: number
  completedAtomIds: string[]
  completedLessonIds: string[]
}

type LearningInsights = {
  // Quiz Performance
  quizAttempts: Array<{
    lessonId: string
    lessonTitle: string
    score: number
    passed: boolean
    timestamp: number
  }>
  struggleAreas: string[]           // Topics user failed on
  strongAreas: string[]             // Topics user aced (90%+)
  totalQuizzesPassed: number
  totalQuizzesFailed: number
  averageQuizScore: number          // Rolling average

  // Time & Engagement
  timeSpentByType: {
    video: number                   // Seconds watching videos
    reading: number                 // Seconds reading
    quiz: number                    // Seconds on quizzes
  }
  sessionCount: number              // How many learning sessions
  totalTimeSpent: number            // Total seconds in learning view
  contentRevisits: number           // How often they go back to review

  // Learning Pace
  lessonsCompletedToday: number
  averageTimePerLesson: number      // Seconds
  fastestQuizTime: number           // Quickest quiz completion
  slowestQuizTime: number           // Longest quiz (may indicate struggle)

  // Coach Interactions
  coachQuestionsAsked: number       // How often they use Ask Sage
  lastCoachQuestion?: string        // Most recent question for context

  // Patterns
  consecutiveCorrectAnswers: number // Current streak within session
  longestCorrectStreak: number      // Best streak ever
  preferredLearningTime?: string    // Morning/Afternoon/Evening/Night

  // Intelligence Features (Phase 3-2)
  responseTimes: number[]           // Track response times for pacing
  skillMastery: Record<string, number> // Skill ID -> mastery percentage
  previousSkillMastery: Record<string, number> // Previous mastery for delta display
}

type CoachLearningViewProps = {
  lessonId?: string
  courseId?: string
  onExit?: () => void
  onLessonComplete?: (lessonId: string) => void
}

// ============================================
// SESSION STORAGE
// ============================================
// SECURITY NOTE: Only non-sensitive data is stored in localStorage:
// - courseId, moduleId (public identifiers)
// - currentLessonIndex, currentAtomIndex (progress indices)
// - completedAtomIds, completedLessonIds (progress arrays)
// NEVER store: tokens, credentials, PII, or user-identifiable data here

const SESSION_KEY = 'aptly_learning_session_v2'

function saveSession(state: SessionState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state))
  }
}

function loadSession(): SessionState | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(SESSION_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  }
  return null
}

function _clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}

// ============================================
// GET MODULE DATA
// ============================================

function getModule(courseId?: string, moduleId?: string): Module {
  const course = getCourse(courseId || DEFAULT_COURSE_ID) || getDefaultCourse()

  // If moduleId specified, find that module
  if (moduleId && course.modules) {
    const mod = course.modules.find(m => m.id === moduleId)
    if (mod) return mod
  }

  // Default to first module
  if (course.modules && course.modules.length > 0) {
    return course.modules[0]
  }

  // Fallback empty module (should never happen with real data)
  return {
    id: 'empty',
    courseId: courseId || DEFAULT_COURSE_ID,
    number: 1,
    title: 'No Content Available',
    objectives: [],
    estimatedMinutes: 0,
    lessons: [],
    isLocked: false,
  }
}

/**
 * Find the next uncompleted lesson in a module
 * Returns the lesson and its index, or null if all lessons are complete
 */
function findNextUncompletedLesson(
  module: Module,
  lessonsCompleted: string[],
  startIndex: number = 0
): { lesson: Lesson; index: number } | null {
  for (let i = startIndex; i < module.lessons.length; i++) {
    const lesson = module.lessons[i]
    if (!lessonsCompleted.includes(lesson.id)) {
      return { lesson, index: i }
    }
  }
  return null // All lessons in module are completed
}

// ============================================
// COACH TIP GENERATOR
// ============================================

const COACH_TIPS: Record<string, string[]> = {
  video: [
    "Watch carefully - I'll ask about this later!",
    "Pay attention to the key points.",
    "Take mental notes while watching.",
  ],
  reading: [
    "Read through this at your own pace.",
    "Focus on the highlighted concepts.",
    "The key takeaways are important.",
  ],
  quiz: [
    "Let's see what you've learned!",
    "Take your time with each question.",
    "Think before you answer.",
  ],
  practice: [
    "Time to apply what you learned!",
    "Practice makes progress.",
    "Show me what you've got!",
  ],
  complete: [
    "Great job! Ready for the next part?",
    "Well done! Let's keep going.",
    "Nice work! Moving forward.",
  ],
}

function getCoachTip(type: string): string {
  const tips = COACH_TIPS[type] || COACH_TIPS.reading
  return tips[Math.floor(Math.random() * tips.length)]
}

// Generate personalized coach message based on context and insights
function getPersonalizedCoachMessage(
  atomType: string,
  lessonTitle: string,
  insights: LearningInsights
): string {
  // If user is reviewing after quiz failure
  if (insights.struggleAreas.includes(lessonTitle) && atomType !== 'quiz') {
    return `Let's review this together. Take your time - understanding ${lessonTitle} will help you succeed!`
  }

  // If user has been doing well
  if (insights.totalQuizzesPassed >= 2 && atomType === 'quiz') {
    return "You're on a roll! Let's see if you can keep the streak going."
  }

  // If this is their first quiz attempt after failures
  if (insights.totalQuizzesFailed > 0 && atomType === 'quiz') {
    return "Ready for another try? You've got this - I believe in you!"
  }

  // Default to standard tips
  return getCoachTip(atomType)
}

// Generate reasoning for why this content was selected (Phase 3-2)
function generateContentReason(lesson: Lesson, insights: LearningInsights): string {
  // If reviewing after failure
  if (insights.struggleAreas.includes(lesson.title)) {
    return `Reviewing ${lesson.title} to strengthen your understanding before moving forward.`
  }
  // If building on strong foundation
  if (insights.strongAreas.length > 0) {
    return `Building on your strong foundation to expand your expertise.`
  }
  // If this is sequential learning
  if (insights.lessonsCompletedToday > 0) {
    return `This lesson builds on concepts you just learned. Perfect timing!`
  }
  // Default reasoning
  return `This content is part of your personalized learning path.`
}

// ============================================
// PROGRESS SIDEBAR
// ============================================

function ProgressSidebar({
  module,
  currentLessonIndex,
  completedLessonIds,
  onSelectLesson,
}: {
  module: Module
  currentLessonIndex: number
  completedLessonIds: string[]
  onSelectLesson: (index: number) => void
}) {
  return (
    <div className="w-64 bg-white border-r border-grey/20 p-4 hidden lg:block">
      <h3 className="text-xs font-semibold text-grey uppercase tracking-wide mb-3">
        {module.title}
      </h3>
      <div className="space-y-2">
        {module.lessons.map((lesson, index) => {
          const isComplete = completedLessonIds.includes(lesson.id)
          const isCurrent = index === currentLessonIndex

          return (
            <button
              key={lesson.id}
              onClick={() => onSelectLesson(index)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                isCurrent && 'bg-teal/10 text-teal font-medium',
                isComplete && !isCurrent && 'text-green-600',
                !isCurrent && !isComplete && 'text-rich-black/70 hover:bg-light-grey'
              )}
            >
              {isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <span className={cn(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0',
                  isCurrent ? 'border-teal' : 'border-grey/40'
                )} />
              )}
              <span className="truncate">{lesson.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// SMART COACH BAR (Floating Glassmorphic Panel)
// ============================================

function SmartCoachBar({
  message,
  onAskSage,
  showContinue,
  onContinue,
}: {
  message: string
  onAskSage: () => void
  showContinue: boolean
  onContinue: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
      }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-30',
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4',
        'px-6 py-4 rounded-2xl',
        'bg-white/90 backdrop-blur-lg overflow-hidden',
        'border border-white/60',
        'shadow-2xl shadow-navy/15',
        'max-w-[90vw] sm:max-w-2xl',
        'relative'
      )}
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-light-teal/5 to-transparent pointer-events-none" />

      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 pointer-events-none" />

      {/* Sage Avatar */}
      <motion.div
        className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal/30 relative z-10"
        whileHover={!prefersReducedMotion ? { scale: 1.05, rotate: [0, -5, 5, 0] } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <span className="text-xl">🦉</span>
      </motion.div>

      {/* Message */}
      <motion.p
        className="flex-1 text-sm text-navy min-w-0 font-medium relative z-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {message}
      </motion.p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto relative z-10">
        <motion.button
          onClick={onAskSage}
          whileHover={!prefersReducedMotion ? { scale: 1.03, boxShadow: '0 4px 12px rgba(33, 168, 176, 0.2)' } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.97 } : undefined}
          className={cn(
            'flex items-center justify-center gap-1.5 px-4 py-2.5',
            'text-sm font-medium text-teal',
            'bg-teal/10 hover:bg-teal/20',
            'rounded-xl transition-all duration-200',
            'min-h-[44px] flex-1 sm:flex-initial',
            'border border-teal/20 hover:border-teal/40'
          )}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Ask Sage</span>
        </motion.button>
        {showContinue && (
          <motion.button
            onClick={onContinue}
            whileHover={!prefersReducedMotion ? { scale: 1.03, boxShadow: '0 8px 24px rgba(33, 168, 176, 0.3)' } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.97 } : undefined}
            className={cn(
              'flex items-center justify-center gap-1.5 px-4 py-2.5',
              'bg-gradient-to-r from-teal to-teal-dark text-white text-sm font-medium',
              'rounded-xl hover:from-teal-dark hover:to-teal transition-all duration-200',
              'min-h-[44px] flex-1 sm:flex-initial',
              'shadow-lg shadow-teal/40'
            )}
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// CHAT OVERLAY - Now using MainCoachChat component
// The inline ChatOverlay was replaced with MainCoachChat
// which provides: conversation history, action buttons,
// immediate context, and memory integration
// ============================================

// ============================================
// MAIN COMPONENT
// ============================================

export function CoachLearningView({
  lessonId: _lessonId,
  courseId,
  onExit,
  onLessonComplete,
}: CoachLearningViewProps) {
  const { user } = useUser()

  // Dynamic course content hooks
  const effectiveCourseId = courseId || user?.progress?.currentCourseId || DEFAULT_COURSE_ID
  const effectiveModuleId = user?.progress?.currentModuleId || ''
  const { data: courseData, isLoading: courseLoading, error: courseError } = useCourse(effectiveCourseId)
  const { data: moduleData, isLoading: moduleLoading, error: moduleError } = useModule(effectiveModuleId)

  const { sessionRecommendation, prefersVideo: _prefersVideo, prefersReading: _prefersReading } = useLearningPreference()
  const { dueCount } = useReviewQueue(user?.id || null)
  const {
    isOnline,
    pendingCount,
    isSyncing,
    withOfflineSupport,
    syncPendingProgress,
  } = useOfflineSync()

  // Dynamic currentModule with fallback to local getModule
  const currentModule = useMemo(() => {
    if (moduleData) return moduleData
    if (courseData?.modules?.length) return courseData.modules[0]
    // Use the local getModule function as fallback
    return getModule(effectiveCourseId, effectiveModuleId)
  }, [moduleData, courseData, effectiveCourseId, effectiveModuleId])

  // Mastery levels for prerequisite checking (cold-start safe)
  const { masteryLevels, isColdStart: _isColdStart } = useMasteryLevels(user?.id || null)
  const [prerequisiteWarning, setPrerequisiteWarning] = useState<string | null>(null)

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const saved = loadSession()
    // Only restore session if both courseId and moduleId match
    if (saved && saved.courseId === effectiveCourseId && saved.moduleId === currentModule.id) {
      return saved
    }
    return {
      courseId: effectiveCourseId,
      moduleId: currentModule.id,
      currentLessonIndex: 0,
      currentAtomIndex: 0,
      completedAtomIds: [],
      completedLessonIds: [],
    }
  })

  const [coachTip, setCoachTip] = useState('')
  const [showChatOverlay, setShowChatOverlay] = useState(false)
  const [contentComplete, setContentComplete] = useState(false)
  const [learningInsights, setLearningInsights] = useState<LearningInsights>({
    quizAttempts: [],
    struggleAreas: [],
    strongAreas: [],
    totalQuizzesPassed: 0,
    totalQuizzesFailed: 0,
    averageQuizScore: 0,
    timeSpentByType: { video: 0, reading: 0, quiz: 0 },
    sessionCount: 1,
    totalTimeSpent: 0,
    contentRevisits: 0,
    lessonsCompletedToday: 0,
    averageTimePerLesson: 0,
    fastestQuizTime: 0,
    slowestQuizTime: 0,
    coachQuestionsAsked: 0,
    consecutiveCorrectAnswers: 0,
    longestCorrectStreak: 0,
    // Intelligence features (Phase 3-2)
    responseTimes: [],
    skillMastery: {},
    previousSkillMastery: {},
  })

  // Intelligence feature state (Phase 3-2)
  const [showPacingIndicator, setShowPacingIndicator] = useState(false)
  const [lastResponseTimeMs, setLastResponseTimeMs] = useState(0)
  const [contentReason, setContentReason] = useState<string>('')

  // Phase 4: Immediate context for quiz answers (passed to MainCoachChat)
  const [immediateContext, setImmediateContext] = useState<{
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    wasCorrect: boolean;
    attemptNumber: number;
  } | null>(null)

  // Struggle detection state
  const [struggleState, setStruggleState] = useState<StruggleState | null>(null)
  const [_struggleContext, _setStruggleContext] = useState<string | null>(null)
  const answerStartTimeRef = useRef<number>(0)

  // Timing trigger state for proactive coach
  const [timingTrigger, setTimingTrigger] = useState<TimingTrigger | null>(null)
  const [timingPreferences] = useState<TimingPreferences>(DEFAULT_TIMING_PREFERENCES)
  const [_previousMastery, _setPreviousMastery] = useState<Record<string, number>>({})
  const [currentSessionPhase, setCurrentSessionPhase] = useState<SessionPhase>('warmup')

  // Navigation direction for smooth transitions
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'backward'>('forward')

  // Generate a unique session ID for struggle tracking (useState with lazy init is allowed for impure calls)
  const [sessionStartTime] = useState(() => Date.now())
  const sessionId = `session_${user?.id || 'anon'}_${sessionStartTime}`

  // Initialize struggle tracking on mount
  useEffect(() => {
    initStruggleTracking(sessionId)
    return () => {
      clearStruggleTracking(sessionId)
    }
  }, [sessionId])

  // Current lesson and atom
  const currentLesson = currentModule.lessons[sessionState.currentLessonIndex]
  const currentAtom = currentLesson?.atoms[sessionState.currentAtomIndex]
  const isLastAtomInLesson = sessionState.currentAtomIndex >= (currentLesson?.atoms.length || 0) - 1
  const isLastLesson = sessionState.currentLessonIndex >= currentModule.lessons.length - 1

  // Prefetch next lesson videos for better UX
  usePrefetchNextLesson(currentLesson?.id || null, currentModule.id)

  // Progress calculations
  const totalAtoms = currentModule.lessons.reduce((sum, l) => sum + l.atoms.length, 0)
  const completedAtoms = sessionState.completedAtomIds.length
  const progressPercent = totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 0

  // Save session on change
  useEffect(() => {
    saveSession(sessionState)
  }, [sessionState])

  // Sync server progress and auto-advance past completed lessons
  // This runs when component mounts or when server progress updates
  const hasAutoAdvancedRef = useRef(false)
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    // Get completed lessons from server (Firebase user progress)
    const serverLessonsCompleted = user?.progress?.lessonsCompleted || []

    // Don't run if no server data yet
    if (serverLessonsCompleted.length === 0) return

    // Get current lesson
    const currentLessonId = currentModule.lessons[sessionState.currentLessonIndex]?.id

    // Check if current lesson is already completed on server
    if (currentLessonId && serverLessonsCompleted.includes(currentLessonId)) {
      // Find next uncompleted lesson starting from current position
      const next = findNextUncompletedLesson(
        currentModule,
        serverLessonsCompleted,
        sessionState.currentLessonIndex
      )

      if (next && !hasAutoAdvancedRef.current) {
        // Navigate to next uncompleted lesson
        hasAutoAdvancedRef.current = true
        setSessionState(prev => ({
          ...prev,
          currentLessonIndex: next.index,
          currentAtomIndex: 0,
          // Sync completedLessonIds from server
          completedLessonIds: serverLessonsCompleted,
        }))
        console.log(`[CoachLearningView] Auto-advanced from completed lesson to: ${next.lesson.title}`)
      } else if (!next) {
        // All lessons in module are completed - just sync the state
        setSessionState(prev => ({
          ...prev,
          completedLessonIds: serverLessonsCompleted,
        }))
        console.log('[CoachLearningView] All lessons in module completed')
      }
    } else {
      // Current lesson is not completed, sync completedLessonIds from server
      setSessionState(prev => {
        // Only update if different to avoid unnecessary re-renders
        const currentIds = prev.completedLessonIds.sort().join(',')
        const serverIds = serverLessonsCompleted.sort().join(',')
        if (currentIds !== serverIds) {
          return {
            ...prev,
            completedLessonIds: serverLessonsCompleted,
          }
        }
        return prev
      })
    }
  }, [user?.progress?.lessonsCompleted, currentModule.id])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Set initial coach tip - personalized based on insights and learning preferences
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentAtom && currentLesson) {
      // Use session recommendation on first atom, otherwise content-specific tips
      const isFirstAtom = sessionState.currentAtomIndex === 0 && sessionState.currentLessonIndex === 0
      const tip = isFirstAtom && sessionRecommendation?.message
        ? sessionRecommendation.message
        : getPersonalizedCoachMessage(currentAtom.type, currentLesson.title, learningInsights)
      setCoachTip(tip)
      setContentComplete(false)
      // Reset pacing indicator when moving to new content
      setShowPacingIndicator(false)
    }
  }, [currentAtom, currentLesson, sessionRecommendation, sessionState.currentAtomIndex, sessionState.currentLessonIndex, learningInsights])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Generate content reasoning when lesson changes (Phase 3-2)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentLesson) {
      const reason = generateContentReason(currentLesson, learningInsights)
      setContentReason(reason)
    }
  }, [currentLesson, learningInsights])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Record content view when atom changes (for re-reading detection)
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (currentAtom) {
      const newStruggleState = recordContentView(sessionId, currentAtom.id)
      setStruggleState(newStruggleState)
      // Reset answer start time for this content
      answerStartTimeRef.current = Date.now()
    }
  }, [currentAtom?.id, sessionId])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Determine session phase based on progress
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const phase: SessionPhase = (() => {
      if (progressPercent >= 100) return 'complete'
      if (progressPercent >= 80) return 'cooldown'
      if (progressPercent >= 20) return 'main'
      return 'warmup'
    })()

    // Check for phase transition
    if (phase !== currentSessionPhase) {
      const trigger = checkSessionTransition(
        { itemsCompleted: completedAtoms, totalItems: totalAtoms },
        currentSessionPhase,
        phase
      )
      if (trigger) {
        const filteredTrigger = filterByPreferences(trigger, timingPreferences)
        if (filteredTrigger) {
          setTimingTrigger(filteredTrigger)
        }
      }
      setCurrentSessionPhase(phase)
    }
  }, [progressPercent, currentSessionPhase, completedAtoms, totalAtoms, timingPreferences])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle timing trigger dismissal
  const handleTimingDismiss = useCallback(() => {
    setTimingTrigger(null)
  }, [])

  // Handle timing trigger action
  const handleTimingAction = useCallback((action: string | undefined) => {
    // Handle different actions
    if (action === 'review_prerequisites') {
      // Could navigate to prerequisite review in the future
      console.log('Review prerequisites action')
    } else if (action === 'start_review') {
      // Could navigate to spaced review
      console.log('Start review action')
    }
    // Close the trigger after action
    setTimingTrigger(null)
  }, [])

  // Handle content completion
  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    // Mark atom as completed
    if (!sessionState.completedAtomIds.includes(atomId)) {
      setSessionState(prev => ({
        ...prev,
        completedAtomIds: [...prev.completedAtomIds, atomId],
      }))
    }

    // Queue progress update with offline support
    const progressType = currentAtom?.type === 'quiz' ? 'quiz_result' : 'atom_complete'
    withOfflineSupport(
      // API call to sync progress
      async () => {
        const response = await fetch('/api/progress/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: progressType,
            atomId,
            lessonId: currentLesson?.id,
            courseId: effectiveCourseId,
            quizScore: score,
            timestamp: Date.now(),
          }),
        })
        return response.ok
      },
      // Offline data to queue
      {
        type: progressType,
        atomId,
        lessonId: currentLesson?.id,
        courseId: effectiveCourseId,
        result: score !== undefined ? { score, passed: score >= 70 } : undefined,
      }
    )

    // Record correct answer for struggle detection (quiz pass)
    if (currentAtom?.type === 'quiz' && score !== undefined && score >= 70) {
      const responseTimeMs = Date.now() - answerStartTimeRef.current
      const newStruggleState = recordAnswer(
        sessionId,
        true, // isCorrect
        responseTimeMs,
        currentLesson?.id // skillId
      )
      setStruggleState(newStruggleState)
      // Clear struggle context on success
      setStruggleContext(null)

      // Track response time and show pacing indicator (Phase 3-2)
      setLastResponseTimeMs(responseTimeMs)
      setLearningInsights(prev => ({
        ...prev,
        responseTimes: [...prev.responseTimes, responseTimeMs],
      }))
      setShowPacingIndicator(true)
      // Auto-hide pacing indicator after 5 seconds
      setTimeout(() => setShowPacingIndicator(false), 5000)
    }

    // Track quiz success if this was a quiz with a passing score
    if (currentAtom?.type === 'quiz' && score !== undefined && score >= 70) {
      setLearningInsights(prev => {
        const newAttempts = [...prev.quizAttempts, {
          lessonId: currentLesson.id,
          lessonTitle: currentLesson.title,
          score,
          passed: true,
          timestamp: Date.now(),
        }]

        // Calculate new average
        const avgScore = newAttempts.length > 0
          ? Math.round(newAttempts.reduce((sum, a) => sum + a.score, 0) / newAttempts.length)
          : 0

        // Track strong areas (90%+ scores)
        const newStrongAreas = score >= 90 && !prev.strongAreas.includes(currentLesson.title)
          ? [...prev.strongAreas, currentLesson.title]
          : prev.strongAreas

        // Remove from struggle areas if they aced it
        const newStruggleAreas = score >= 90
          ? prev.struggleAreas.filter(area => area !== currentLesson.title)
          : prev.struggleAreas

        return {
          ...prev,
          quizAttempts: newAttempts,
          totalQuizzesPassed: prev.totalQuizzesPassed + 1,
          averageQuizScore: avgScore,
          strongAreas: newStrongAreas,
          struggleAreas: newStruggleAreas,
          lessonsCompletedToday: prev.lessonsCompletedToday + 1,
        }
      })
    }

    setContentComplete(true)
    setCoachTip(getCoachTip('complete'))
  }, [sessionState.completedAtomIds, currentAtom?.type, currentLesson, effectiveCourseId, withOfflineSupport, sessionId])

  // Handle quiz failure - send back to review material
  const handleQuizFail = useCallback((atomId: string, score: number) => {
    // Calculate response time for struggle detection
    const responseTimeMs = Date.now() - answerStartTimeRef.current

    // Record wrong answer for struggle detection
    const newStruggleState = recordAnswer(
      sessionId,
      false, // isCorrect
      responseTimeMs,
      currentLesson?.id // skillId
    )
    setStruggleState(newStruggleState)

    // Set struggle context for when coach opens
    if (newStruggleState.isStruggling) {
      setStruggleContext(
        `Student is struggling with ${currentLesson.title}. They just scored ${score}% on a quiz. ` +
        `Signals: ${newStruggleState.signals.map(s => s.type).join(', ')}. ` +
        `Severity: ${newStruggleState.overallSeverity}.`
      )
    }

    // Track the failed quiz attempt
    setLearningInsights(prev => {
      const newStruggleAreas = prev.struggleAreas.includes(currentLesson.title)
        ? prev.struggleAreas
        : [...prev.struggleAreas, currentLesson.title]

      return {
        ...prev,
        quizAttempts: [...prev.quizAttempts, {
          lessonId: currentLesson.id,
          lessonTitle: currentLesson.title,
          score,
          passed: false,
          timestamp: Date.now(),
        }],
        struggleAreas: newStruggleAreas,
        totalQuizzesFailed: prev.totalQuizzesFailed + 1,
      }
    })

    // Go back to the first atom of this lesson (video/reading) to review
    setSessionState(prev => ({
      ...prev,
      currentAtomIndex: 0,
    }))
    setContentComplete(false)
    setCoachTip(`Let's review the material. You scored ${score}% - aim for 70% to continue.`)
  }, [currentLesson, sessionId])

  // Handle continue button
  const handleContinue = useCallback(() => {
    console.log('[CoachLearningView] handleContinue called')
    console.log('[CoachLearningView] isLastAtomInLesson:', isLastAtomInLesson, 'isLastLesson:', isLastLesson)
    console.log('[CoachLearningView] currentAtomIndex:', sessionState.currentAtomIndex, 'totalAtoms:', currentLesson.atoms.length)

    // Set direction to forward
    setNavigationDirection('forward')

    if (isLastAtomInLesson) {
      // Complete current lesson
      if (!sessionState.completedLessonIds.includes(currentLesson.id)) {
        setSessionState(prev => ({
          ...prev,
          completedLessonIds: [...prev.completedLessonIds, currentLesson.id],
        }))
        onLessonComplete?.(currentLesson.id)

        // Queue lesson completion with offline support
        withOfflineSupport(
          async () => {
            const response = await fetch('/api/progress/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'lesson_complete',
                lessonId: currentLesson.id,
                courseId: effectiveCourseId,
                timestamp: Date.now(),
              }),
            })
            return response.ok
          },
          {
            type: 'lesson_complete',
            lessonId: currentLesson.id,
            courseId: effectiveCourseId,
          }
        )
      }

      if (isLastLesson) {
        // Module complete!
        console.log('[CoachLearningView] Module complete!')
        setCoachTip("Congratulations! You've completed this module!")
      } else {
        // Move to next lesson
        console.log('[CoachLearningView] Moving to next lesson')
        setSessionState(prev => ({
          ...prev,
          currentLessonIndex: prev.currentLessonIndex + 1,
          currentAtomIndex: 0,
        }))
      }
    } else {
      // Move to next atom
      console.log('[CoachLearningView] Moving to next atom')
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex + 1,
      }))
    }

    setContentComplete(false)
    console.log('[CoachLearningView] setContentComplete(false) called')
  }, [isLastAtomInLesson, isLastLesson, currentLesson, sessionState.completedLessonIds, sessionState.currentAtomIndex, onLessonComplete, effectiveCourseId, withOfflineSupport])

  // Handle swipe to previous atom
  const handleSwipePrevious = useCallback(() => {
    // Set direction to backward
    setNavigationDirection('backward')

    if (sessionState.currentAtomIndex > 0) {
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex - 1,
      }))
      setContentComplete(false)
    } else if (sessionState.currentLessonIndex > 0) {
      // Go to last atom of previous lesson
      const prevLesson = currentModule.lessons[sessionState.currentLessonIndex - 1]
      setSessionState(prev => ({
        ...prev,
        currentLessonIndex: prev.currentLessonIndex - 1,
        currentAtomIndex: prevLesson.atoms.length - 1,
      }))
      setContentComplete(false)
    }
  }, [sessionState.currentAtomIndex, sessionState.currentLessonIndex, currentModule.lessons])

  // Handle swipe to next atom (only if content is complete)
  const handleSwipeNext = useCallback(() => {
    if (contentComplete) {
      handleContinue()
    }
  }, [contentComplete, handleContinue])

  // Handle lesson selection from sidebar
  const handleSelectLesson = useCallback((index: number) => {
    const targetLesson = currentModule.lessons[index]
    if (!targetLesson) return

    // Check if prerequisites are met (mastery gating)
    const prereqsMet = areLessonPrerequisitesMet(targetLesson.id, masteryLevels)
    if (!prereqsMet) {
      const missing = getMissingPrerequisites(targetLesson.id, masteryLevels)
      const conceptNames = missing.map(id =>
        SOCIAL_MEDIA_MARKETING_GRAPH.concepts[id]?.name || id
      ).join(', ')
      setPrerequisiteWarning(
        `You need to master these concepts first: ${conceptNames}`
      )
      // Clear warning after 5 seconds
      setTimeout(() => setPrerequisiteWarning(null), 5000)
      return // Block navigation to locked lesson
    }

    // Clear any existing warning
    setPrerequisiteWarning(null)

    // Get server-side completed lessons
    const serverLessonsCompleted = user?.progress?.lessonsCompleted || []

    // If selected lesson is already completed, find next uncompleted lesson
    if (serverLessonsCompleted.includes(targetLesson.id)) {
      const next = findNextUncompletedLesson(currentModule, serverLessonsCompleted, index)
      if (next) {
        // Navigate to next uncompleted lesson instead
        setSessionState(prev => ({
          ...prev,
          currentLessonIndex: next.index,
          currentAtomIndex: 0,
          completedLessonIds: serverLessonsCompleted,
        }))
        setContentComplete(false)
        console.log(`[CoachLearningView] Redirected from completed lesson to: ${next.lesson.title}`)
        return
      }
      // All lessons completed - let them view the last one
    }

    setSessionState(prev => ({
      ...prev,
      currentLessonIndex: index,
      currentAtomIndex: 0,
    }))
    setContentComplete(false)
  }, [currentModule, user?.progress?.lessonsCompleted, masteryLevels])

  // Handle struggle intervention acceptance
  const handleStruggleIntervention = useCallback((intervention: StruggleInterventionType) => {
    switch (intervention) {
      case 'coach_session':
        // Open the coach chat with struggle context
        setShowChatOverlay(true)
        setLearningInsights(prev => ({
          ...prev,
          coachQuestionsAsked: prev.coachQuestionsAsked + 1,
        }))
        break
      case 'hint':
      case 'alternative_explanation':
        // Open coach to provide help
        setShowChatOverlay(true)
        break
      case 'prerequisite_review':
        // Go to the first content atom (usually foundational material)
        setSessionState(prev => ({
          ...prev,
          currentAtomIndex: 0,
        }))
        setContentComplete(false)
        setCoachTip("Let's review the basics before tackling this quiz again.")
        break
      case 'simpler_practice':
        // For now, go back to earlier content
        setSessionState(prev => ({
          ...prev,
          currentAtomIndex: Math.max(0, prev.currentAtomIndex - 1),
        }))
        setContentComplete(false)
        setCoachTip("Let's practice with some simpler examples first.")
        break
      case 'break_suggestion':
        setCoachTip("Taking a break is smart! Come back refreshed in a few minutes.")
        break
      case 'engagement_prompt':
        setCoachTip("Take your time - there's no rush. Really think about this one.")
        break
      default:
        // Open coach for general help
        setShowChatOverlay(true)
        break
    }
    // Clear struggle state after handling
    setStruggleState(null)
  }, [])

  // Handle struggle prompt dismiss
  const handleStruggleDismiss = useCallback(() => {
    // Don't clear struggle state, just let the prompt hide
    // The StrugglePrompt handles its own visibility
  }, [])

  // Phase 4: Handle coach action buttons
  const handleCoachAction = useCallback((action: CoachAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.target === 'next_lesson') {
          handleContinue()
        } else if (action.target === 'retry_quiz') {
          // Reset to quiz atom
          const quizIndex = currentLesson?.atoms.findIndex(a => a.type === 'quiz')
          if (quizIndex !== undefined && quizIndex >= 0) {
            setSessionState(prev => ({
              ...prev,
              currentAtomIndex: quizIndex,
            }))
            setContentComplete(false)
          }
        } else if (action.target === 'review_content') {
          // Go back to first content atom
          setSessionState(prev => ({
            ...prev,
            currentAtomIndex: 0,
          }))
          setContentComplete(false)
        }
        break
      case 'show_hint':
        setCoachTip(action.content)
        break
      case 'suggest_break':
        setCoachTip(`Taking a break is smart! ${action.reason}`)
        break
      default:
        console.log('[CoachLearningView] Unhandled action:', action)
    }
  }, [handleContinue, currentLesson])

  // Phase 4: Handle quiz answer to capture immediate context for AI coach
  const handleQuizAnswer = useCallback((details: {
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    wasCorrect: boolean;
    attemptNumber: number;
  }) => {
    // Set immediate context for the coach when user answers a quiz
    setImmediateContext(details)
    console.log('[CoachLearningView] Quiz answer captured for coach context:', details)
  }, [])

  // Handle content skip for mastered content (Phase 3-2)
  const _handleSkipToQuiz = useCallback(() => {
    // Find the quiz atom in the current lesson
    const quizIndex = currentLesson?.atoms.findIndex(atom => atom.type === 'quiz')
    if (quizIndex !== undefined && quizIndex >= 0) {
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: quizIndex,
      }))
      setContentComplete(false)
      setCoachTip("Let's see what you know! Ready for a quick assessment?")
    }
  }, [currentLesson])

  // Get current skill mastery for the lesson (Phase 3-2)
  const _currentSkillMastery = useMemo(() => {
    return learningInsights.skillMastery[currentLesson?.id] ?? learningInsights.averageQuizScore
  }, [learningInsights.skillMastery, learningInsights.averageQuizScore, currentLesson?.id])

  // Get previous skill mastery for delta display (Phase 3-2)
  const _previousSkillMastery = useMemo(() => {
    return learningInsights.previousSkillMastery[currentLesson?.id]
  }, [learningInsights.previousSkillMastery, currentLesson?.id])

  // Calculate average response time for pacing (Phase 3-2)
  const avgResponseTime = useMemo(() => {
    return calculateAverageResponseTime(learningInsights.responseTimes, 30000)
  }, [learningInsights.responseTimes])

  // Loading state for async data
  if (courseLoading || moduleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal mx-auto mb-4" />
          <p className="text-grey">Loading learning content...</p>
        </div>
      </div>
    )
  }

  // Error state for async data
  if (courseError || moduleError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-navy mb-2">Unable to Load Content</h2>
          <p className="text-grey mb-4">
            {courseError?.message || moduleError?.message || 'An error occurred while loading the learning content.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!currentLesson || !currentAtom) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-yellow" />
          </div>
          <h2 className="text-lg font-semibold text-navy mb-2">Content Not Found</h2>
          <p className="text-grey mb-4">
            We couldn&apos;t find this lesson. Your progress may have been saved with outdated content.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              _clearSession();
              window.location.reload();
            }}
          >
            Start Fresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Progress Sidebar */}
      <ProgressSidebar
        module={currentModule}
        currentLessonIndex={sessionState.currentLessonIndex}
        completedLessonIds={sessionState.completedLessonIds}
        onSelectLesson={handleSelectLesson}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content Area - Full Screen (with bottom padding for floating coach bar) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-48 sm:pb-32">
          {/* Inline Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-navy bg-light-grey/50 hover:bg-light-grey border border-grey/20 hover:border-grey/40 rounded-lg transition-colors flex-shrink-0 min-h-[44px]"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Exit</span>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="font-medium text-navy truncate text-sm sm:text-base">{currentLesson.title}</h1>
                <p className="text-xs text-grey">
                  Part {sessionState.currentAtomIndex + 1} of {currentLesson.atoms.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Prerequisite Warning */}
              {prerequisiteWarning && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full text-xs font-medium max-w-xs">
                  <span className="truncate">{prerequisiteWarning}</span>
                  <button
                    onClick={() => setPrerequisiteWarning(null)}
                    className="hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {/* Offline Status Indicator */}
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}
              {/* Pending Sync Indicator */}
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={() => syncPendingProgress()}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2 py-1 bg-teal/10 text-teal rounded-full text-xs font-medium hover:bg-teal/20 transition-colors min-h-[32px]"
                >
                  <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                  <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : `${pendingCount} pending`}</span>
                </button>
              )}
              {/* Review Due Badge */}
              {dueCount > 0 && (
                <a
                  href="/review"
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-purple/10 text-purple rounded-full text-xs font-medium hover:bg-purple/20 transition-colors min-h-[32px]"
                >
                  <Brain className="w-3 h-3" />
                  <span>{dueCount} due</span>
                </a>
              )}
              {/* Desktop Progress Bar */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-20 h-1 bg-grey/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-grey tabular-nums">{progressPercent}%</span>
              </div>
              {/* Mobile Progress - Circular */}
              <div className="md:hidden relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-grey/10"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-teal"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercent} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-navy">
                  {progressPercent}
                </span>
              </div>
            </div>
          </div>

          {/* Phase 3-2 intelligence components - Why This Content */}
          {contentReason && (
            <div className="mb-4">
              <WhyThisContent
                reason={contentReason}
                skillName={currentLesson?.title}
                currentMastery={learningInsights.averageQuizScore}
                size="sm"
              />
            </div>
          )}

          {/* Content - Fills remaining space */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <SwipeableAtomView
              currentIndex={sessionState.currentAtomIndex}
              totalCount={currentLesson.atoms.length}
              onSwipeNext={handleSwipeNext}
              onSwipePrevious={handleSwipePrevious}
              canSwipeNext={contentComplete && !isLastLesson}
              canSwipePrevious={sessionState.currentAtomIndex > 0 || sessionState.currentLessonIndex > 0}
              disabled={false}
            >
              {currentAtom ? (
                <AnimatedContent
                  contentKey={currentAtom.id}
                  direction={navigationDirection}
                >
                  <ContentRenderer
                    atom={currentAtom}
                    onComplete={handleContentComplete}
                    onQuizFail={handleQuizFail}
                    onContinue={handleContinue}
                    isActive={!contentComplete}
                    onQuizAnswer={handleQuizAnswer}
                  />
                </AnimatedContent>
              ) : (
                <ContentSkeleton type="reading" />
              )}
            </SwipeableAtomView>
          </div>

          {/* Pacing Indicator after quiz answers (Phase 3-2) */}
          {showPacingIndicator && currentAtom?.type === 'quiz' && lastResponseTimeMs > 0 && (
            <div className="mt-3 flex-shrink-0">
              <PacingIndicator
                responseTimeMs={lastResponseTimeMs}
                avgTimeMs={avgResponseTime}
                show={showPacingIndicator}
                isCorrect={contentComplete}
                size="md"
                autoHideMs={5000}
              />
            </div>
          )}

          {/* Smart Coach Bar */}
          <SmartCoachBar
            message={coachTip}
            onAskSage={() => {
              setShowChatOverlay(true)
              setLearningInsights(prev => ({
                ...prev,
                coachQuestionsAsked: prev.coachQuestionsAsked + 1,
              }))
            }}
            showContinue={contentComplete}
            onContinue={handleContinue}
          />
        </div>
      </div>

      {/* Chat Overlay - Now using MainCoachChat with full features */}
      <AnimatePresence>
        {showChatOverlay && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-navy/30 z-40"
              onClick={() => {
                setShowChatOverlay(false)
                setStruggleContext(null)
                setImmediateContext(null)
              }}
            />

            {/* Chat Panel using MainCoachChat */}
            <motion.div
              initial={{ y: '100%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              className={cn(
                'fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bottom-4 z-50',
                'w-full max-w-lg',
                'bg-white/95 backdrop-blur-md overflow-hidden',
                'border border-white/60',
                'rounded-2xl shadow-xl shadow-navy/15',
                'max-h-[80vh] sm:max-h-[70vh] flex flex-col'
              )}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowChatOverlay(false)
                  setStruggleContext(null)
                  setImmediateContext(null)
                }}
                className="absolute top-2 right-2 z-10 p-2 hover:bg-grey/10 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-grey" />
              </button>

              {/* MainCoachChat with full features */}
              <MainCoachChat
                lessonId={currentLesson?.id}
                immediateContext={immediateContext ?? undefined}
                onAction={handleCoachAction}
                lessonContext={{
                  currentCourse: getCourse(effectiveCourseId)?.title,
                  currentLesson: currentLesson?.title,
                  atomType: currentAtom?.type,
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Struggle Prompt - appears when user is struggling */}
      <StrugglePrompt
        struggleState={struggleState}
        onAccept={handleStruggleIntervention}
        onDismiss={handleStruggleDismiss}
        showDelay={2000}
      />

      {/* Timing Prompt - shows at optimal learning moments (lower z-index than struggle prompt) */}
      <TimingPrompt
        trigger={timingTrigger}
        onAction={handleTimingAction}
        onDismiss={handleTimingDismiss}
      />
    </div>
  )
}

export default CoachLearningView
