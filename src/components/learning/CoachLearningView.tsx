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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { InlineContentBlock } from '@/components/coach/InlineContentBlock'
import { useCoach } from '@/hooks/useCoach'
import { useUser } from '@/store/unifiedStore'
import { cn } from '@/lib/utils'
import type { Atom } from '@/types'

// ============================================
// TYPES
// ============================================

type MessageRole = 'coach' | 'user' | 'system'

type LearningMessage = {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  // Content block for inline learning materials
  contentBlock?: Atom
  // Whether this content block has been completed
  contentCompleted?: boolean
  // For comprehension check messages
  isComprehensionCheck?: boolean
  // For video interrupt points
  interruptData?: {
    timestamp: number
    question: string
    awaitingResponse: boolean
  }
}

type CoachLearningViewProps = {
  lessonId?: string
  courseId?: string
  onExit?: () => void
  onLessonComplete?: (lessonId: string) => void
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
      {/* Avatar */}
      {isCoach && <OwlAvatar size="md" />}

      {/* Message Content */}
      <div className={cn(
        'max-w-[80%] flex flex-col',
        isCoach ? 'items-start' : 'items-end'
      )}>
        {/* Text content */}
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

        {/* Inline content block (video, reading, quiz) */}
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

        {/* Timestamp */}
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

  const [messages, setMessages] = useState<LearningMessage[]>([])
  const [input, setInput] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentAtomIndex, setCurrentAtomIndex] = useState(0)
  const [sessionPaused, setSessionPaused] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Add a message helper
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

  // Initialize learning session
  useEffect(() => {
    if (isInitialized || !user) return

    setIsInitialized(true)

    // Welcome message from coach
    addMessage('coach', `Hey ${user.name || 'there'}! 👋 I'm your AI learning coach. Ready to dive into today's lesson?`)

    // After a short delay, introduce the first content
    setTimeout(() => {
      addMessage('coach', "Let's start with a video that covers the fundamentals. Watch it through, and I'll check in with you after to make sure the key points clicked.")

      // Add the first content block (mock for now - would come from lesson data)
      setTimeout(() => {
        const mockVideoAtom: Atom = {
          id: 'video-1',
          lessonId: lessonId || 'lesson-1',
          type: 'video',
          title: 'Introduction to Social Media Marketing',
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
          content: {
            videoUrl: 'https://example.com/video.mp4',
            duration: 300,
            keyTakeaways: [
              'Social media marketing reaches 4.9 billion users worldwide',
              'Paid social offers precise targeting by demographics, interests, behaviors',
              'ROI tracking is possible through pixel-based attribution',
            ],
            transcript: 'Social media marketing has become essential...',
            chapters: [],
          },
        }

        addMessage('coach', '', { contentBlock: mockVideoAtom })
      }, 500)
    }, 1500)
  }, [isInitialized, user, addMessage])

  // Handle content completion
  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    // Mark the content as completed in messages
    setMessages(prev => prev.map(msg =>
      msg.contentBlock?.id === atomId
        ? { ...msg, contentCompleted: true }
        : msg
    ))

    // Coach responds to completion
    const completionResponses = [
      "Great job watching that! Let me ask you a quick question to make sure the main ideas stuck.",
      "Perfect! Before we move on, I want to check your understanding with a quick question.",
      "Nice work! Now let's see if the key concepts clicked with a comprehension check.",
    ]

    const response = completionResponses[Math.floor(Math.random() * completionResponses.length)]

    setTimeout(() => {
      addMessage('coach', response, { isComprehensionCheck: true })

      // Add a quiz question after content
      setTimeout(() => {
        const mockQuizAtom: Atom = {
          id: `quiz-${Date.now()}`,
          lessonId: lessonId || 'lesson-1',
          type: 'quiz',
          title: 'Quick Check',
          estimatedMinutes: 1,
          isRequired: true,
          masteryThreshold: 70,
          content: {
            questions: [
              {
                id: 'q1',
                type: 'multiple-choice',
                question: 'What is the main advantage of paid social media advertising over organic?',
                options: [
                  'It\'s always free',
                  'Precise targeting by demographics and interests',
                  'It requires no strategy',
                  'It only works for big brands',
                ],
                correctAnswer: 1,
                explanation: 'Paid social lets you target specific demographics, interests, and behaviors - something organic reach can\'t guarantee.',
                difficulty: 2,
                skills: ['social-media-fundamentals'],
              },
            ],
            passingScore: 70,
            allowRetakes: true,
          },
        }

        addMessage('coach', '', { contentBlock: mockQuizAtom })
      }, 800)
    }, 1000)
  }, [addMessage])

  // Handle quiz answers
  const handleQuizAnswer = useCallback((questionId: string, isCorrect: boolean, score: number) => {
    setTimeout(() => {
      if (isCorrect) {
        addMessage('coach', "Exactly right! 🎉 You've got a solid grasp of this concept. Ready for the next part of the lesson?")
      } else {
        addMessage('coach', "Not quite, but that's okay! Let me explain it differently. The key insight here is that paid social gives you control over WHO sees your content - something organic posts can't guarantee. Want me to go deeper on this, or shall we continue?")
      }
    }, 500)
  }, [addMessage])

  // Handle user sending a message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || coachLoading) return

    // Add user message
    addMessage('user', trimmedInput)
    setInput('')

    // Get coach response
    try {
      const response = await sendMessage(trimmedInput, 'chat', {
        currentLesson: lessonId,
        currentCourse: courseId,
      })

      if (response) {
        addMessage('coach', response.content)
      }
    } catch (error) {
      addMessage('coach', "I'm here to help! What would you like to know about what we just covered?")
    }
  }, [input, coachLoading, addMessage, sendMessage, lessonId, courseId])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-light-grey/30 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-grey/20">
        <div className="flex items-center gap-3">
          <OwlAvatar size="sm" />
          <div>
            <h1 className="font-semibold text-navy text-sm">Learning Session</h1>
            <p className="text-xs text-grey">Your AI coach is guiding you</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSessionPaused(!sessionPaused)}
          >
            {sessionPaused ? <Play size={18} /> : <Pause size={18} />}
          </Button>
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
            Your coach adapts to your learning style
          </p>
        </div>
      </footer>
    </div>
  )
}

export default CoachLearningView
