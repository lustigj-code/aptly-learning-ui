'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  Sparkles,
  Pause,
  Play,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAutopilotSession } from '@/hooks/useAutopilotSession'
import { InlineContentBlock } from '@/components/coach/InlineContentBlock'
import { useCoach } from '@/hooks/useCoach'
import { cn } from '@/lib/utils'
import type { Atom } from '@/types'

// ============================================
// TYPES
// ============================================

type Message = {
  id: string
  role: 'coach' | 'user' | 'system'
  content: string
  timestamp: Date
  contentBlock?: Atom
}

type AutopilotViewProps = {
  onExit: () => void
  courseId?: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AutopilotView({ onExit, courseId }: AutopilotViewProps) {
  const {
    state,
    session,
    currentContent,
    currentIndex: _currentIndex,
    progress,
    sessionSummary,
    showIntervention,
    interventionMessage,
    isLoading,
    error,
    startSession,
    completeContent,
    submitQuizAnswer,
    sendMessage: sendAutopilotMessage,
    pauseSession,
    resumeSession,
    exitSession,
    dismissIntervention,
  } = useAutopilotSession()

  const { sendMessage: sendCoachMessage, isLoading: coachLoading } = useCoach()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Define addMessage before useEffects that use it
  const addMessage = useCallback((
    role: Message['role'],
    content: string,
    contentBlock?: Atom
  ) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      contentBlock,
    }])
  }, [])

  // Start session on mount
  useEffect(() => {
    if (state === 'idle') {
      startSession(courseId)
    }
  }, [state, startSession, courseId])

  // Add coach intro when content changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentContent?.coachIntro) {
      addMessage('coach', currentContent.coachIntro)

      // Add content block as a message
      if (currentContent.sessionItem) {
        // Simulate adding content - in production, fetch actual atom
        const mockAtom: Atom = {
          id: currentContent.sessionItem.itemId,
          lessonId: 'lesson-1',
          type: currentContent.type === 'quiz' ? 'quiz' :
                currentContent.type === 'review' ? 'reading' : 'video',
          title: currentContent.sessionItem.reason,
          content: {
            videoUrl: '',
            transcript: 'Sample transcript content...',
            duration: currentContent.sessionItem.estimatedMinutes * 60,
            chapters: [],
            keyTakeaways: ['Key point 1', 'Key point 2'],
          },
          estimatedMinutes: currentContent.sessionItem.estimatedMinutes,
          isRequired: true,
          masteryThreshold: 70,
        }

        addMessage('system', '', mockAtom)
      }
    }
  }, [currentContent, addMessage])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle session complete
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state === 'complete') {
      addMessage('coach', `Great session! You completed ${sessionSummary.itemsCompleted} items and got ${sessionSummary.correctAnswers}/${sessionSummary.totalQuestions} questions correct. See you next time!`)
    }
  }, [state, sessionSummary, addMessage])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSend = async () => {
    if (!input.trim() || coachLoading) return

    const message = input.trim()
    setInput('')

    // Check for exit commands
    const exitPhrases = ['i need to go', 'stop', 'exit', 'bye', 'quit']
    if (exitPhrases.some(phrase => message.toLowerCase().includes(phrase))) {
      addMessage('user', message)
      addMessage('coach', "No problem! I'll save your progress. Great work today!")
      setTimeout(() => {
        exitSession()
        onExit()
      }, 2000)
      return
    }

    addMessage('user', message)
    sendAutopilotMessage(message)

    // Get coach response
    try {
      const response = await sendCoachMessage(message, 'chat')
      if (response) {
        addMessage('coach', response.content)
      }
    } catch (_err) {
      addMessage('coach', "I'm here to help! What would you like to know about the current topic?")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleContentComplete = useCallback((atomId: string, score?: number) => {
    completeContent(atomId, score)

    // Add completion message
    if (score !== undefined) {
      addMessage('coach', score >= 70
        ? `Nice work! You scored ${score}%. Let's keep that momentum going.`
        : `You scored ${score}%. Don't worry, we can always review this again later!`)
    } else {
      addMessage('coach', "Got it! Moving on to the next part...")
    }
  }, [completeContent, addMessage])

  const handlePauseToggle = useCallback(() => {
    if (state === 'paused') {
      resumeSession()
    } else {
      pauseSession()
    }
  }, [state, pauseSession, resumeSession])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-navy mb-2">Building your session...</h2>
          <p className="text-sm text-rich-black/60">Personalizing content just for you</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-navy mb-2">Something went wrong</h2>
          <p className="text-sm text-rich-black/60 mb-4">{error}</p>
          <Button variant="primary" onClick={() => startSession(courseId)}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-b from-light-grey/50 to-white">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-grey/20 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-teal to-purple rounded-xl flex items-center justify-center text-xl">
              🦉
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
          </div>
          <div>
            <h1 className="font-semibold text-navy">Learning Session</h1>
            <div className="flex items-center gap-2 text-xs text-rich-black/60">
              <Clock className="w-3 h-3" />
              <span>{session?.estimatedMinutes || 30} min</span>
              <span className="mx-1">•</span>
              <Target className="w-3 h-3" />
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          <button
            onClick={handlePauseToggle}
            className="p-2 rounded-lg text-rich-black/60 hover:bg-light-grey transition-colors"
            title={state === 'paused' ? 'Resume' : 'Pause'}
          >
            {state === 'paused' ? <Play size={20} /> : <Pause size={20} />}
          </button>

          {/* Exit */}
          <button
            onClick={() => {
              exitSession()
              onExit()
            }}
            className="p-2 rounded-lg text-rich-black/60 hover:bg-light-grey transition-colors"
            title="Exit session"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-grey/20">
        <motion.div
          className="h-full bg-gradient-to-r from-teal to-purple"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Intervention Banner */}
      <AnimatePresence>
        {showIntervention && interventionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4"
          >
            <Card className="p-4 bg-yellow/10 border-yellow/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-yellow-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">{interventionMessage}</p>
                </div>
                <button
                  onClick={dismissIntervention}
                  className="p-1 hover:bg-yellow/20 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-yellow-700" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused Overlay */}
      <AnimatePresence>
        {state === 'paused' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy/50 flex items-center justify-center z-10"
          >
            <Card className="p-6 text-center">
              <Pause className="w-12 h-12 text-teal mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-navy mb-2">Session Paused</h2>
              <p className="text-sm text-rich-black/60 mb-4">
                Take your time. Your progress is saved.
              </p>
              <Button variant="primary" onClick={resumeSession}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.contentBlock ? (
              // Render content block
              <InlineContentBlock
                atom={message.contentBlock}
                onComplete={handleContentComplete}
                onQuizAnswer={submitQuizAnswer}
                isActive={state !== 'paused' && state !== 'complete'}
              />
            ) : (
              // Render chat message
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                {message.role === 'coach' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    message.role === 'user'
                      ? 'bg-teal text-white rounded-br-md'
                      : 'bg-light-grey text-rich-black rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {coachLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-light-grey rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-grey rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-grey rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-grey rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Session Complete Summary */}
      {state === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4"
        >
          <Card className="p-6 bg-gradient-to-br from-teal/10 to-purple/10 border-teal/20">
            <div className="text-center mb-4">
              <CheckCircle className="w-12 h-12 text-teal mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-navy">Session Complete!</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-navy">{sessionSummary.itemsCompleted}</p>
                <p className="text-xs text-rich-black/60">Items</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-navy">
                  {sessionSummary.totalQuestions > 0
                    ? Math.round((sessionSummary.correctAnswers / sessionSummary.totalQuestions) * 100)
                    : 100}%
                </p>
                <p className="text-xs text-rich-black/60">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-navy">{Math.ceil(sessionSummary.timeSpent / 60)}</p>
                <p className="text-xs text-rich-black/60">Minutes</p>
              </div>
            </div>

            <Button variant="primary" fullWidth onClick={onExit}>
              Done
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Input */}
      {state !== 'complete' && (
        <footer className="flex-shrink-0 p-4 border-t border-grey/20 bg-white/80 backdrop-blur-sm">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or type 'I need to go' to exit..."
              disabled={coachLoading || state === 'paused'}
              className="flex-1 px-4 py-3 rounded-xl border border-grey bg-light-grey/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-grey text-sm disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || coachLoading || state === 'paused'}
              variant="primary"
              className="px-4"
            >
              {coachLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}

export default AutopilotView
