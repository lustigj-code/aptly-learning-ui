'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  Sparkles,
  Play,
  Pause,
  X,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { InlineContentBlock } from '@/components/coach/InlineContentBlock'
import { useCoach } from '@/hooks/useCoach'
import { useUser } from '@/store/unifiedStore'
import { cn } from '@/lib/utils'
import { COURSE_1_MODULE_1 } from '@/data/mockData'
import type { Atom, Lesson } from '@/types'

// ============================================
// TYPES
// ============================================

type MessageRole = 'coach' | 'user' | 'system'

type LearningMessage = {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  contentBlock?: Atom
  contentCompleted?: boolean
  isComprehensionCheck?: boolean
}

type SessionState = {
  lessonId: string
  currentAtomIndex: number
  completedAtomIds: string[]
  lessonComplete: boolean
}

type CoachLearningViewProps = {
  lessonId?: string
  courseId?: string
  onExit?: () => void
  onLessonComplete?: (lessonId: string) => void
}

// ============================================
// SESSION STORAGE HELPERS
// ============================================

const SESSION_KEY = 'aptly_learning_session'

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
// GET LESSON DATA
// ============================================

function getLesson(lessonId?: string): Lesson {
  // For now, use the first lesson from Course 1 Module 1
  // In production, this would fetch from API based on lessonId
  const lesson = COURSE_1_MODULE_1.lessons.find(l => l.id === lessonId)
    || COURSE_1_MODULE_1.lessons[0]
  return lesson
}

// ============================================
// OWL AVATAR
// ============================================

function OwlAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn(
      sizeClasses[size],
      'rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0'
    )}>
      <span className="text-white text-lg">🦉</span>
    </div>
  )
}

// ============================================
// MESSAGE BUBBLE
// ============================================

function MessageBubble({
  message,
  onContentComplete,
  onQuizAnswer,
}: {
  message: LearningMessage
  onContentComplete?: (atomId: string, score?: number) => void
  onQuizAnswer?: (questionId: string, isCorrect: boolean, score: number) => void
}) {
  const isCoach = message.role === 'coach'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-light-grey/50 rounded-full px-4 py-2 text-xs text-grey">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 mb-4',
        isCoach ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {isCoach && <OwlAvatar size="md" />}

      <div className={cn(
        'max-w-[80%] flex flex-col',
        isCoach ? 'items-start' : 'items-end'
      )}>
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-3',
            isCoach
              ? 'bg-white border border-grey/20 rounded-tl-sm'
              : 'bg-teal text-white rounded-tr-sm'
          )}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {message.contentBlock && (
          <div className="w-full mt-2">
            <InlineContentBlock
              atom={message.contentBlock}
              onComplete={(atomId, score) => {
                onContentComplete?.(atomId, score)
              }}
              onQuizAnswer={onQuizAnswer}
              isActive={!message.contentCompleted}
            />
          </div>
        )}

        <span className="text-xs text-grey mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ============================================
// TYPING INDICATOR
// ============================================

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <OwlAvatar size="md" />
      <div className="bg-white border border-grey/20 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-grey/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-grey/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-grey/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
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
  const { sendMessage, isLoading: coachLoading } = useCoach()

  // Get the lesson data
  const lesson = getLesson(lessonId)
  const atoms = lesson.atoms

  // Session state - tracks progress through the lesson
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    // Try to restore from localStorage
    const saved = loadSession()
    if (saved && saved.lessonId === lesson.id) {
      return saved
    }
    // Start fresh
    return {
      lessonId: lesson.id,
      currentAtomIndex: 0,
      completedAtomIds: [],
      lessonComplete: false,
    }
  })

  const [messages, setMessages] = useState<LearningMessage[]>([])
  const [input, setInput] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [awaitingNextAtom, setAwaitingNextAtom] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Current atom based on session state
  const currentAtom = atoms[sessionState.currentAtomIndex]
  const isLastAtom = sessionState.currentAtomIndex >= atoms.length - 1
  const progress = ((sessionState.completedAtomIds.length) / atoms.length) * 100

  // Save session state whenever it changes
  useEffect(() => {
    saveSession(sessionState)
  }, [sessionState])

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Add message helper
  const addMessage = useCallback((
    role: MessageRole,
    content: string,
    options?: Partial<LearningMessage>
  ) => {
    const newMessage: LearningMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      ...options,
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id
  }, [])

  // Present current atom to user
  const presentAtom = useCallback((atom: Atom, isFirst: boolean = false) => {
    const introMessages: Record<string, string[]> = {
      video: [
        "Let's watch this video together. I'll check in after to make sure the key points clicked.",
        "Here's a video that covers this topic. Watch it through and we'll discuss.",
        "Time for a video! Pay attention to the main concepts - I'll quiz you after.",
      ],
      reading: [
        "Here's some reading material. Take your time with it.",
        "Let's go through this reading together.",
        "Read through this carefully - the concepts here are important.",
      ],
      quiz: [
        "Let's test your understanding with a quick quiz.",
        "Time to check what you've learned!",
        "Here's a quiz to reinforce the concepts.",
      ],
      practice: [
        "Now let's practice what you've learned.",
        "Time to put your knowledge into action!",
        "Here's a practice exercise for you.",
      ],
    }

    const messages = introMessages[atom.type] || introMessages.reading
    const intro = messages[Math.floor(Math.random() * messages.length)]

    if (isFirst) {
      addMessage('coach', `Alright, let's start with "${lesson.title}"!\n\n${intro}`)
    } else {
      addMessage('coach', intro)
    }

    // Add the content block after a short delay
    setTimeout(() => {
      addMessage('coach', '', { contentBlock: atom })
    }, 500)
  }, [addMessage, lesson.title])

  // Initialize session
  useEffect(() => {
    if (isInitialized || !user) return
    setIsInitialized(true)

    // Check if resuming or starting fresh
    if (sessionState.completedAtomIds.length > 0 && !sessionState.lessonComplete) {
      // Resuming - show where they are
      addMessage('coach', `Welcome back, ${user.name || 'there'}! You're ${Math.round(progress)}% through "${lesson.title}". Let's pick up where you left off.`)

      setTimeout(() => {
        if (currentAtom) {
          presentAtom(currentAtom, false)
        }
      }, 1500)
    } else if (sessionState.lessonComplete) {
      // Lesson already complete
      addMessage('coach', `Hey ${user.name || 'there'}! You've already completed "${lesson.title}". Would you like to review it again or move to the next lesson?`)
    } else {
      // Fresh start
      addMessage('coach', `Hey ${user.name || 'there'}! I'm your AI learning coach. Ready to dive into "${lesson.title}"?`)

      setTimeout(() => {
        if (currentAtom) {
          presentAtom(currentAtom, true)
        }
      }, 2000)
    }
  }, [isInitialized, user, sessionState, currentAtom, progress, lesson.title, addMessage, presentAtom])

  // Move to next atom
  const advanceToNextAtom = useCallback(() => {
    const nextIndex = sessionState.currentAtomIndex + 1

    if (nextIndex >= atoms.length) {
      // Lesson complete!
      setSessionState(prev => ({ ...prev, lessonComplete: true }))
      addMessage('coach', `Congratulations! 🎉 You've completed "${lesson.title}"! You covered ${atoms.length} sections and built a solid foundation. Ready for the next lesson?`)
      onLessonComplete?.(lesson.id)
    } else {
      // Move to next atom
      setSessionState(prev => ({
        ...prev,
        currentAtomIndex: nextIndex,
      }))

      const nextAtom = atoms[nextIndex]
      addMessage('coach', "Great work! Let's continue to the next part.")

      setTimeout(() => {
        presentAtom(nextAtom, false)
      }, 1000)
    }

    setAwaitingNextAtom(false)
  }, [sessionState.currentAtomIndex, atoms, lesson, addMessage, presentAtom, onLessonComplete])

  // Handle content completion
  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    // Mark content as completed in messages
    setMessages(prev => prev.map(msg =>
      msg.contentBlock?.id === atomId
        ? { ...msg, contentCompleted: true }
        : msg
    ))

    // Add to completed atoms if not already there
    if (!sessionState.completedAtomIds.includes(atomId)) {
      setSessionState(prev => ({
        ...prev,
        completedAtomIds: [...prev.completedAtomIds, atomId],
      }))
    }

    // Get the atom type for appropriate response
    const completedAtom = atoms.find(a => a.id === atomId)

    if (completedAtom?.type === 'quiz') {
      // Quiz completed - give feedback and move on
      const passed = score !== undefined && score >= 70
      if (passed) {
        addMessage('coach', `Excellent work! You scored ${score}%. You've got a solid understanding of this material.`)
      } else {
        addMessage('coach', `You scored ${score}%. Don't worry - learning takes practice. Let's keep moving forward.`)
      }

      // Auto-advance after quiz
      setTimeout(() => {
        advanceToNextAtom()
      }, 2000)
    } else {
      // Non-quiz content - show encouragement and advance
      const encouragements = [
        "Nice work! Ready for the next part?",
        "Great job! Let's keep the momentum going.",
        "Perfect! Moving on to the next section.",
      ]
      const msg = encouragements[Math.floor(Math.random() * encouragements.length)]
      addMessage('coach', msg)

      // Auto-advance after short delay
      setTimeout(() => {
        advanceToNextAtom()
      }, 1500)
    }
  }, [sessionState.completedAtomIds, atoms, addMessage, advanceToNextAtom])

  // Handle quiz answers (for per-question feedback)
  const handleQuizAnswer = useCallback((questionId: string, isCorrect: boolean, score: number) => {
    // This is called per-question, but we wait for full quiz completion
    // The InlineContentBlock handles showing per-question feedback
  }, [])

  // Handle user sending a message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || coachLoading) return

    addMessage('user', trimmedInput)
    setInput('')

    // Check for navigation intents
    const lowerInput = trimmedInput.toLowerCase()

    if (lowerInput.includes('continue') || lowerInput.includes('next') || lowerInput.includes('move on')) {
      if (awaitingNextAtom) {
        advanceToNextAtom()
        return
      }
    }

    if (lowerInput.includes('restart') || lowerInput.includes('start over')) {
      clearSession()
      setSessionState({
        lessonId: lesson.id,
        currentAtomIndex: 0,
        completedAtomIds: [],
        lessonComplete: false,
      })
      setMessages([])
      setIsInitialized(false)
      return
    }

    // Get coach response for general questions
    try {
      const response = await sendMessage(trimmedInput, 'chat', {
        currentLesson: lesson.id,
        currentCourse: courseId,
        atomType: currentAtom?.type,
      })

      if (response) {
        addMessage('coach', response.content)
      }
    } catch (error) {
      addMessage('coach', "I'm here to help! What would you like to know about what we're learning?")
    }
  }, [input, coachLoading, addMessage, sendMessage, lesson.id, courseId, currentAtom, awaitingNextAtom, advanceToNextAtom])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-light-grey/30 to-white">
      {/* Header with progress */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-grey/20">
        <div className="flex items-center gap-3">
          <OwlAvatar size="sm" />
          <div>
            <h1 className="font-semibold text-navy text-sm">{lesson.title}</h1>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-grey/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-grey">
                {sessionState.completedAtomIds.length}/{atoms.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionState.lessonComplete && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <CheckCircle size={14} />
              Complete
            </span>
          )}
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              <X size={18} />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                onContentComplete={handleContentComplete}
                onQuizAnswer={handleQuizAnswer}
              />
            ))}
          </AnimatePresence>

          {coachLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="border-t border-grey/20 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about the lesson..."
                className="w-full px-4 py-3 pr-12 rounded-xl border border-grey/30 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm"
                disabled={coachLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Sparkles className="w-5 h-5 text-grey/40" />
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || coachLoading}
              className="px-4"
            >
              {coachLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-grey text-center mt-2">
            {sessionState.lessonComplete
              ? 'Lesson complete! Ask questions or move to next lesson.'
              : `Part ${sessionState.currentAtomIndex + 1} of ${atoms.length}`
            }
          </p>
        </div>
      </footer>
    </div>
  )
}

export default CoachLearningView
