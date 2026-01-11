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
import { FSM_MODULE_1 } from '@/data/fsmCourse'
import type { Atom, Lesson, Module } from '@/types'

// Import content renderers
import { ContentRenderer } from './ContentRenderer'

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

function getModule(): Module {
  return FSM_MODULE_1
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
// COACH BAR (Minimal)
// ============================================

function CoachBar({
  tip,
  onContinue,
  onAskQuestion,
  showContinue,
  isLoading,
}: {
  tip: string
  onContinue: () => void
  onAskQuestion: () => void
  showContinue: boolean
  isLoading: boolean
}) {
  return (
    <div className="bg-white border-t border-grey/20 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
        {/* Owl avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🦉</span>
        </div>

        {/* Tip text */}
        <p className="flex-1 text-sm text-rich-black/70">{tip}</p>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAskQuestion}
            className="text-grey hover:text-teal"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Ask Question
          </Button>

          {showContinue && (
            <Button
              variant="primary"
              size="sm"
              onClick={onContinue}
              disabled={isLoading}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// CHAT OVERLAY
// ============================================

function ChatOverlay({
  isOpen,
  onClose,
  lessonContext,
}: {
  isOpen: boolean
  onClose: () => void
  lessonContext: { lessonId: string; atomType?: string }
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'coach'; content: string }>>([])
  const { sendMessage, isLoading } = useCoach()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      if (messages.length === 0) {
        setMessages([{ role: 'coach', content: "Hi! I'm here to help. What would you like to know about this lesson?" }])
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
        currentLesson: lessonContext.lessonId,
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
  const module = getModule()

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

  // Set initial coach tip
  useEffect(() => {
    if (currentAtom) {
      setCoachTip(getCoachTip(currentAtom.type))
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

    setContentComplete(true)
    setCoachTip(getCoachTip('complete'))
  }, [sessionState.completedAtomIds])

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
    setSessionState(prev => ({
      ...prev,
      currentLessonIndex: index,
      currentAtomIndex: 0,
    }))
    setContentComplete(false)
  }, [])

  if (!currentLesson || !currentAtom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-grey">No lesson content available.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-light-grey/30">
      {/* Progress Sidebar */}
      <ProgressSidebar
        module={module}
        currentLessonIndex={sessionState.currentLessonIndex}
        completedLessonIds={sessionState.completedLessonIds}
        onSelectLesson={handleSelectLesson}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-grey/20 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onExit && (
                <button onClick={onExit} className="p-1 hover:bg-light-grey rounded">
                  <ArrowLeft className="w-5 h-5 text-grey" />
                </button>
              )}
              <div>
                <h1 className="font-semibold text-navy">{currentLesson.title}</h1>
                <p className="text-xs text-grey">
                  Part {sessionState.currentAtomIndex + 1} of {currentLesson.atoms.length}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-grey/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-grey font-medium">{progressPercent}%</span>
            </div>
          </div>
        </header>

        {/* Content Area - LARGE */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <ContentRenderer
              atom={currentAtom}
              onComplete={handleContentComplete}
              isActive={!contentComplete}
            />
          </div>
        </div>

        {/* Coach Bar */}
        <CoachBar
          tip={coachTip}
          onContinue={handleContinue}
          onAskQuestion={() => setShowChatOverlay(true)}
          showContinue={contentComplete}
          isLoading={false}
        />
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChatOverlay && (
          <ChatOverlay
            isOpen={showChatOverlay}
            onClose={() => setShowChatOverlay(false)}
            lessonContext={{
              lessonId: currentLesson.id,
              atomType: currentAtom.type,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default CoachLearningView
