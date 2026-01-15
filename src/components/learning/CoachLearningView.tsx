'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  X,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  ArrowLeft,
  Brain,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCoach } from '@/hooks/useCoach'
import { useReviewQueue } from '@/hooks/useReviewQueue'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useUser } from '@/store/userProfileStore'
import { useLearningPreference } from '@/hooks/useLearningPreference'
import { cn } from '@/lib/utils'
import { getCourse, getDefaultCourse, DEFAULT_COURSE_ID } from '@/data/courseRegistry'
import type { Atom, Lesson, Module } from '@/types'

// Import content renderers
import { ContentRenderer } from './ContentRenderer'
import { SwipeableAtomView } from './SwipeableAtomView'

// Import intelligence components (Phase 3-2)
import { WhyThisContent } from './WhyThisContent'
import { RealTimeMasteryBar, MasteryIndicator } from './RealTimeMasteryBar'
import { ContentSkipOption, SkipOptionBadge } from './ContentSkipOption'
import { PacingIndicator, calculateAverageResponseTime } from './PacingIndicator'

// Import struggle detection
import {
  initStruggleTracking,
  recordAnswer,
  recordContentView,
  recordMasteryChange,
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
  checkMasteryMilestone,
  checkDifficultContentPrep,
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

function clearSession() {
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4',
        'px-5 py-4 rounded-2xl',
        'bg-white/70 backdrop-blur-xl',
        'border border-white/50',
        'shadow-lg shadow-navy/10',
        'max-w-[90vw] sm:max-w-2xl'
      )}
    >
      {/* Sage Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0 shadow-md">
        <span className="text-lg">🦉</span>
      </div>

      {/* Message */}
      <p className="flex-1 text-sm text-navy min-w-0 font-medium">{message}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
        <motion.button
          onClick={onAskSage}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center justify-center gap-1.5 px-4 py-2.5',
            'text-sm font-medium text-teal',
            'bg-teal/10 hover:bg-teal/20',
            'rounded-xl transition-colors',
            'min-h-[44px] flex-1 sm:flex-initial'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Ask Sage</span>
        </motion.button>
        {showContinue && (
          <motion.button
            onClick={onContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center justify-center gap-1.5 px-4 py-2.5',
              'bg-teal text-white text-sm font-medium',
              'rounded-xl hover:bg-teal-dark transition-colors',
              'min-h-[44px] flex-1 sm:flex-initial',
              'shadow-md shadow-teal/30'
            )}
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
// CHAT OVERLAY
// ============================================

function ChatOverlay({
  isOpen,
  onClose,
  lessonContext,
  insights,
  struggleContext,
}: {
  isOpen: boolean
  onClose: () => void
  lessonContext: { lessonId: string; atomType?: string; lessonTitle: string }
  insights: LearningInsights
  struggleContext?: string | null
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'coach'; content: string }>>([])
  const { sendMessage, isLoading } = useCoach()
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate a personalized greeting based on insights and struggle context
  const getGreeting = () => {
    // If there's active struggle context, use that for a more targeted greeting
    if (struggleContext) {
      return "I noticed you might be having a tough time with this topic. That's completely normal - some concepts take a bit more time to click. Let me help you work through this. What specific part is giving you trouble?"
    }
    if (insights.struggleAreas.length > 0) {
      const areas = insights.struggleAreas.slice(0, 2).join(' and ')
      return `Hi! I noticed you're working through some challenging content. I'm here to help you master ${areas}. What would you like to know?`
    }
    if (insights.totalQuizzesPassed > 0) {
      return `Great progress so far! You've passed ${insights.totalQuizzesPassed} quiz${insights.totalQuizzesPassed > 1 ? 'zes' : ''}. How can I help you continue learning?`
    }
    return "Hi! I'm here to help. What would you like to know about this lesson?"
  }

  // Initialize greeting message when chat opens
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      if (!hasInitializedRef.current && messages.length === 0) {
        hasInitializedRef.current = true
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setMessages([{ role: 'coach', content: getGreeting() }])
        }, 0)
      }
    } else {
      hasInitializedRef.current = false
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await sendMessage(userMessage, 'chat', {
        currentLesson: lessonContext.lessonTitle,
        atomType: lessonContext.atomType,
      })
      if (response && response.content) {
        setMessages(prev => [...prev, { role: 'coach', content: response.content }])
      } else {
        // Handle case where sendMessage returned null (e.g., conversation init failed)
        console.warn('[ChatOverlay] No response from coach, adding fallback message')
        setMessages(prev => [...prev, {
          role: 'coach',
          content: "I'm having trouble connecting right now. Let me try again - what would you like to know?"
        }])
      }
    } catch (err) {
      console.error('[ChatOverlay] Coach request failed:', err)
      setMessages(prev => [...prev, {
        role: 'coach',
        content: "I'm having a moment - let me try again. Could you rephrase that for me?"
      }])
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-45"
        onClick={onClose}
      />

      {/* Chat Panel */}
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
          'sm:w-full sm:max-w-lg',
          'bg-white/80 backdrop-blur-xl',
          'border border-white/60',
          'rounded-2xl shadow-xl shadow-navy/15',
          'max-h-[75vh] sm:max-h-[65vh] flex flex-col',
          'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grey/10 bg-white/50">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
            >
              <span className="text-base">🦉</span>
            </motion.div>
            <motion.span
              className="font-semibold text-navy"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              Ask Sage
            </motion.span>
          </div>
          <motion.button
            onClick={onClose}
            className="p-2 hover:bg-grey/10 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5 text-grey" />
          </motion.button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: i * 0.05,
              }}
              className={cn(
                'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm',
                msg.role === 'user'
                  ? 'ml-auto bg-teal text-white rounded-br-md shadow-md shadow-teal/20'
                  : 'bg-light-grey/70 text-rich-black rounded-bl-md'
              )}
            >
              {msg.content}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              className="flex items-center gap-2 text-grey text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-grey/10 bg-white/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl',
                'bg-white/70 border border-grey/20',
                'text-sm placeholder:text-grey/60',
                'focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none',
                'min-h-[44px] transition-all'
              )}
              disabled={isLoading}
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="min-h-[44px] min-w-[44px] rounded-xl shadow-md shadow-teal/20"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CoachLearningView({
  lessonId,
  courseId,
  onExit,
  onLessonComplete,
}: CoachLearningViewProps) {
  const { user } = useUser()
  const { sessionRecommendation, prefersVideo, prefersReading } = useLearningPreference()
  const { dueCount } = useReviewQueue(user?.id || null)
  const {
    isOnline,
    pendingCount,
    isSyncing,
    withOfflineSupport,
    syncPendingProgress,
  } = useOfflineSync()
  // Get courseId from props, user progress, or default
  const effectiveCourseId = courseId || user?.progress?.currentCourseId || DEFAULT_COURSE_ID
  const effectiveModuleId = user?.progress?.currentModuleId
  const currentModule = getModule(effectiveCourseId, effectiveModuleId)

  // Mastery levels for prerequisite checking (cold-start safe)
  const { masteryLevels, isColdStart } = useMasteryLevels(user?.id || null)
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

  // Struggle detection state
  const [struggleState, setStruggleState] = useState<StruggleState | null>(null)
  const [struggleContext, setStruggleContext] = useState<string | null>(null)
  const answerStartTimeRef = useRef<number>(0)

  // Timing trigger state for proactive coach
  const [timingTrigger, setTimingTrigger] = useState<TimingTrigger | null>(null)
  const [timingPreferences] = useState<TimingPreferences>(DEFAULT_TIMING_PREFERENCES)
  const [previousMastery, setPreviousMastery] = useState<Record<string, number>>({})
  const [currentSessionPhase, setCurrentSessionPhase] = useState<SessionPhase>('warmup')

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

  // Set initial coach tip - personalized based on insights and learning preferences
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
  }, [currentAtom, sessionRecommendation])

  // Generate content reasoning when lesson changes (Phase 3-2)
  useEffect(() => {
    if (currentLesson) {
      const reason = generateContentReason(currentLesson, learningInsights)
      setContentReason(reason)
    }
  }, [currentLesson?.id])

  // Record content view when atom changes (for re-reading detection)
  useEffect(() => {
    if (currentAtom) {
      const newStruggleState = recordContentView(sessionId, currentAtom.id)
      setStruggleState(newStruggleState)
      // Reset answer start time for this content
      answerStartTimeRef.current = Date.now()
    }
  }, [currentAtom?.id, sessionId])

  // Determine session phase based on progress
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
  }, [isLastAtomInLesson, isLastLesson, currentLesson, sessionState.completedLessonIds, onLessonComplete, effectiveCourseId, withOfflineSupport])

  // Handle swipe to previous atom
  const handleSwipePrevious = useCallback(() => {
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
  }, [currentModule.lessons, currentModule, user?.progress?.lessonsCompleted, masteryLevels])

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

  // Handle content skip for mastered content (Phase 3-2)
  const handleSkipToQuiz = useCallback(() => {
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
  const currentSkillMastery = useMemo(() => {
    return learningInsights.skillMastery[currentLesson?.id] ?? learningInsights.averageQuizScore
  }, [learningInsights.skillMastery, learningInsights.averageQuizScore, currentLesson?.id])

  // Get previous skill mastery for delta display (Phase 3-2)
  const previousSkillMastery = useMemo(() => {
    return learningInsights.previousSkillMastery[currentLesson?.id]
  }, [learningInsights.previousSkillMastery, currentLesson?.id])

  // Calculate average response time for pacing (Phase 3-2)
  const avgResponseTime = useMemo(() => {
    return calculateAverageResponseTime(learningInsights.responseTimes, 30000)
  }, [learningInsights.responseTimes])

  if (!currentLesson || !currentAtom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-grey">No lesson content available.</p>
      </div>
    )
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-24">
          {/* Inline Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-grey hover:text-navy hover:bg-light-grey rounded-lg transition-colors flex-shrink-0 min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit</span>
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

          {/* Phase 3-2 intelligence components hidden for cleaner UI
              - RealTimeMasteryBar (duplicate with header progress)
              - WhyThisContent (yellow explanation box)
              - ContentSkipOption (green skip box)
          */}

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
              <ContentRenderer
                atom={currentAtom}
                onComplete={handleContentComplete}
                onQuizFail={handleQuizFail}
                onContinue={handleContinue}
                isActive={!contentComplete}
              />
            </SwipeableAtomView>
          </div>

          {/* Pacing Indicator after quiz answers (Phase 3-2) */}
          {showPacingIndicator && currentAtom.type === 'quiz' && lastResponseTimeMs > 0 && (
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
            showContinue={false}
            onContinue={handleContinue}
          />
        </div>
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChatOverlay && (
          <ChatOverlay
            isOpen={showChatOverlay}
            onClose={() => {
              setShowChatOverlay(false)
              // Clear struggle context when chat closes
              setStruggleContext(null)
            }}
            lessonContext={{
              lessonId: currentLesson.id,
              lessonTitle: currentLesson.title,
              atomType: currentAtom.type,
            }}
            struggleContext={struggleContext}
            insights={learningInsights}
          />
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
