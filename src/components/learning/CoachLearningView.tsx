'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  X,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCoach } from '@/hooks/useCoach'
import { useUser } from '@/store/unifiedStore'
import { cn } from '@/lib/utils'
import { getCourse, getDefaultCourse, DEFAULT_COURSE_ID } from '@/data/courseRegistry'
import type { Atom, Lesson, Module } from '@/types'

// Import content renderers
import { ContentRenderer } from './ContentRenderer'
// TODO: Re-enable when API is stable
// import { useMasteryLevels } from '@/hooks/useMasteryLevels'
// import { areLessonPrerequisitesMet, getMissingPrerequisites } from '@/data/courseToConceptMap'
// import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery'

// ============================================
// TYPES
// ============================================

type SessionState = {
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
// SMART COACH BAR
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 bg-light-grey/50 rounded-xl mt-4 flex-shrink-0"
    >
      {/* Sage Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0">
        <span className="text-lg">🦉</span>
      </div>

      {/* Message */}
      <p className="flex-1 text-sm text-navy">{message}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onAskSage}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal hover:bg-teal/10 rounded-lg transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Ask Sage</span>
        </button>
        {showContinue && (
          <button
            onClick={onContinue}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal-dark transition-colors"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
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
}: {
  isOpen: boolean
  onClose: () => void
  lessonContext: { lessonId: string; atomType?: string; lessonTitle: string }
  insights: LearningInsights
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'coach'; content: string }>>([])
  const { sendMessage, isLoading } = useCoach()
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate a personalized greeting based on insights
  const getGreeting = () => {
    if (insights.struggleAreas.length > 0) {
      const areas = insights.struggleAreas.slice(0, 2).join(' and ')
      return `Hi! I noticed you're working through some challenging content. I'm here to help you master ${areas}. What would you like to know?`
    }
    if (insights.totalQuizzesPassed > 0) {
      return `Great progress so far! You've passed ${insights.totalQuizzesPassed} quiz${insights.totalQuizzesPassed > 1 ? 'zes' : ''}. How can I help you continue learning?`
    }
    return "Hi! I'm here to help. What would you like to know about this lesson?"
  }

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      if (messages.length === 0) {
        setMessages([{ role: 'coach', content: getGreeting() }])
      }
    }
  }, [isOpen, messages.length])

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
      if (response) {
        setMessages(prev => [...prev, { role: 'coach', content: response.content }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'coach', content: "I'm here to help! Could you rephrase your question?" }])
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-x-0 bottom-0 bg-white border-t border-grey/20 shadow-2xl z-50 max-h-[60vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-grey/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center">
            <span className="text-sm">🦉</span>
          </div>
          <span className="font-medium text-navy">Ask Sage</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-light-grey rounded">
          <X className="w-5 h-5 text-grey" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[80%] px-3 py-2 rounded-lg text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-teal text-white'
                : 'bg-light-grey text-rich-black'
            )}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-grey text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-grey/20">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your question..."
            className="flex-1 px-3 py-2 rounded-lg border border-grey/30 text-sm focus:border-teal focus:ring-1 focus:ring-teal/20 outline-none"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
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
  // Get courseId from props, user progress, or default
  const effectiveCourseId = courseId || user?.progress?.currentCourseId || DEFAULT_COURSE_ID
  const effectiveModuleId = user?.progress?.currentModuleId
  const module = getModule(effectiveCourseId, effectiveModuleId)
  // TODO: Re-enable when API is stable
  // const { masteryLevels } = useMasteryLevels(user?.id || null)
  // const [prerequisiteWarning, setPrerequisiteWarning] = useState<string | null>(null)

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const saved = loadSession()
    if (saved && saved.moduleId === module.id) {
      return saved
    }
    return {
      moduleId: module.id,
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
  })

  // Current lesson and atom
  const currentLesson = module.lessons[sessionState.currentLessonIndex]
  const currentAtom = currentLesson?.atoms[sessionState.currentAtomIndex]
  const isLastAtomInLesson = sessionState.currentAtomIndex >= (currentLesson?.atoms.length || 0) - 1
  const isLastLesson = sessionState.currentLessonIndex >= module.lessons.length - 1

  // Progress calculations
  const totalAtoms = module.lessons.reduce((sum, l) => sum + l.atoms.length, 0)
  const completedAtoms = sessionState.completedAtomIds.length
  const progressPercent = totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 0

  // Save session on change
  useEffect(() => {
    saveSession(sessionState)
  }, [sessionState])

  // Set initial coach tip - personalized based on insights
  useEffect(() => {
    if (currentAtom && currentLesson) {
      setCoachTip(getPersonalizedCoachMessage(currentAtom.type, currentLesson.title, learningInsights))
      setContentComplete(false)
    }
  }, [currentAtom])

  // Handle content completion
  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    // Mark atom as completed
    if (!sessionState.completedAtomIds.includes(atomId)) {
      setSessionState(prev => ({
        ...prev,
        completedAtomIds: [...prev.completedAtomIds, atomId],
      }))
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
  }, [sessionState.completedAtomIds, currentAtom?.type, currentLesson])

  // Handle quiz failure - send back to review material
  const handleQuizFail = useCallback((atomId: string, score: number) => {
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
  }, [currentLesson])

  // Handle continue button
  const handleContinue = useCallback(() => {
    if (isLastAtomInLesson) {
      // Complete current lesson
      if (!sessionState.completedLessonIds.includes(currentLesson.id)) {
        setSessionState(prev => ({
          ...prev,
          completedLessonIds: [...prev.completedLessonIds, currentLesson.id],
        }))
        onLessonComplete?.(currentLesson.id)
      }

      if (isLastLesson) {
        // Module complete!
        setCoachTip("Congratulations! You've completed this module! 🎉")
      } else {
        // Move to next lesson
        setSessionState(prev => ({
          ...prev,
          currentLessonIndex: prev.currentLessonIndex + 1,
          currentAtomIndex: 0,
        }))
      }
    } else {
      // Move to next atom
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex + 1,
      }))
    }

    setContentComplete(false)
  }, [isLastAtomInLesson, isLastLesson, currentLesson, sessionState.completedLessonIds, onLessonComplete])

  // Handle lesson selection from sidebar
  const handleSelectLesson = useCallback((index: number) => {
    const targetLesson = module.lessons[index]
    if (!targetLesson) return

    // TODO: Re-enable prerequisite checking when API is stable
    // const prereqsMet = areLessonPrerequisitesMet(targetLesson.id, masteryLevels)
    // if (!prereqsMet) { ... }

    setSessionState(prev => ({
      ...prev,
      currentLessonIndex: index,
      currentAtomIndex: 0,
    }))
    setContentComplete(false)
  }, [module.lessons])

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
        module={module}
        currentLessonIndex={sessionState.currentLessonIndex}
        completedLessonIds={sessionState.completedLessonIds}
        onSelectLesson={handleSelectLesson}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content Area - Full Screen */}
        <div className="flex-1 flex flex-col px-8 py-6">
          {/* Inline Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-grey hover:text-navy hover:bg-light-grey rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Exit</span>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="font-medium text-navy truncate">{currentLesson.title}</h1>
                <p className="text-xs text-grey">
                  Part {sessionState.currentAtomIndex + 1} of {currentLesson.atoms.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-1 bg-grey/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-grey tabular-nums">{progressPercent}%</span>
            </div>
          </div>

          {/* Content - Fills remaining space */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <ContentRenderer
              atom={currentAtom}
              onComplete={handleContentComplete}
              onQuizFail={handleQuizFail}
              onContinue={handleContinue}
              isActive={!contentComplete}
            />
          </div>

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
            onClose={() => setShowChatOverlay(false)}
            lessonContext={{
              lessonId: currentLesson.id,
              lessonTitle: currentLesson.title,
              atomType: currentAtom.type,
            }}
            insights={learningInsights}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default CoachLearningView
