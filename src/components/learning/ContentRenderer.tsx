'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  BookOpen,
  RefreshCw,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Atom, VideoContent, ReadingContent, QuizContent } from '@/types'
import { VideoPlayer } from './VideoPlayer'

// ============================================
// TYPES
// ============================================

// Phase 4: Quiz answer details for immediate context
export type QuizAnswerDetails = {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  wasCorrect: boolean;
  attemptNumber: number;
};

type ContentRendererProps = {
  atom: Atom
  onComplete: (atomId: string, score?: number) => void
  onQuizFail?: (atomId: string, score: number) => void
  onContinue?: () => void
  isActive?: boolean
  // Phase 4: Callback to capture quiz answer details for AI coach context
  onQuizAnswer?: (details: QuizAnswerDetails) => void
}

type QuizState = {
  currentQuestion: number
  answers: Record<string, number>
  showFeedback: boolean
  feedbackCorrect: boolean
  isComplete: boolean
  score: number
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ContentRenderer({ atom, onComplete, onQuizFail, onContinue, isActive = true, onQuizAnswer }: ContentRendererProps) {
  switch (atom.type) {
    case 'video':
      return (
        <VideoRenderer
          atom={atom}
          content={atom.content as VideoContent}
          onComplete={onComplete}
          onContinue={onContinue}
          isActive={isActive}
        />
      )
    case 'reading':
      return (
        <ReadingRenderer
          atom={atom}
          content={atom.content as ReadingContent}
          onComplete={onComplete}
          onContinue={onContinue}
          isActive={isActive}
        />
      )
    case 'quiz':
      return (
        <QuizRenderer
          atom={atom}
          content={atom.content as QuizContent}
          onComplete={onComplete}
          onQuizFail={onQuizFail}
          onContinue={onContinue}
          isActive={isActive}
          onQuizAnswer={onQuizAnswer}
        />
      )
    default:
      return (
        <GenericRenderer
          atom={atom}
          onComplete={onComplete}
          onContinue={onContinue}
          isActive={isActive}
        />
      )
  }
}

// ============================================
// VIDEO RENDERER - CLEAN
// ============================================

function VideoRenderer({
  atom,
  content,
  onComplete,
  onContinue,
  isActive,
}: {
  atom: Atom
  content: VideoContent
  onComplete: (atomId: string) => void
  onContinue?: () => void
  isActive: boolean
}) {
  const [hasCompleted, setHasCompleted] = useState(false)

  const handleVideoComplete = () => {
    if (!hasCompleted) {
      onComplete(atom.id)
      setHasCompleted(true)
    }
  }

  const handleContinue = () => {
    if (!hasCompleted) {
      onComplete(atom.id)
      setHasCompleted(true)
    }
    onContinue?.()
  }

  // Check if videoUrl exists
  if (!content.videoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col"
      >
        <div className="flex-1 flex flex-col items-center justify-center bg-light-grey/30 rounded-lg">
          <XCircle className="w-16 h-16 text-grey/50 mb-4" />
          <p className="text-navy font-medium">No video URL provided</p>
          <p className="text-grey text-sm mt-1">This content is missing a video source.</p>
        </div>
        <div className="flex items-center justify-between pt-4 flex-shrink-0">
          <div>
            <h2 className="font-medium text-navy">{atom.title}</h2>
            <span className="text-sm text-grey">{Math.ceil(content.duration / 60)} min</span>
          </div>
          {isActive && (
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-teal text-white font-medium rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-2"
            >
              Skip
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Enhanced Video Player */}
      <div className="flex-1 flex flex-col min-h-0">
        <VideoPlayer
          videoUrl={content.videoUrl}
          title={atom.title}
          duration={content.duration}
          onComplete={handleVideoComplete}
        />
      </div>

      {/* Bottom bar with title and continue */}
      <div className="flex items-center justify-between pt-4 flex-shrink-0">
        <div>
          <h2 className="font-medium text-navy">{atom.title}</h2>
          <span className="text-sm text-grey">{Math.ceil(content.duration / 60)} min</span>
        </div>
        {isActive && (
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-teal text-white font-medium rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// READING RENDERER - CLEAN
// ============================================

function ReadingRenderer({
  atom,
  content,
  onComplete,
  onContinue,
  isActive,
}: {
  atom: Atom
  content: ReadingContent
  onComplete: (atomId: string) => void
  onContinue?: () => void
  isActive: boolean
}) {
  const [hasCompleted, setHasCompleted] = useState(false)

  const handleContinue = () => {
    if (!hasCompleted) {
      onComplete(atom.id)
      setHasCompleted(true)
    }
    onContinue?.()
  }

  // Remove first H1 from content if it matches atom title (avoid duplication)
  const cleanedBody = content.body.replace(/^#\s+.+\n+/, '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20"
    >
      {/* Content Area */}
      <div>
        {/* Article Card */}
        <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-grey/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal/5 to-transparent px-8 py-6 border-b border-grey/10">
            <div className="flex items-center gap-2 text-teal text-sm font-medium mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Reading</span>
              <span className="text-grey/50 mx-2">•</span>
              <span className="text-grey">{atom.estimatedMinutes} min</span>
            </div>
            <h1 className="text-2xl font-bold text-navy">{atom.title}</h1>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <div className="prose prose-navy max-w-none
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-grey/10
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-3
              [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-teal [&_h4]:mt-4 [&_h4]:mb-2
              [&_p]:text-rich-black/80 [&_p]:leading-7 [&_p]:mb-4
              [&_ul]:my-4 [&_ul]:pl-5 [&_ul]:space-y-2
              [&_ol]:my-4 [&_ol]:pl-5 [&_ol]:space-y-2
              [&_li]:text-rich-black/80 [&_li]:leading-7
              [&_strong]:font-semibold [&_strong]:text-navy
              [&_em]:italic [&_em]:text-rich-black/70
              [&_blockquote]:border-l-4 [&_blockquote]:border-teal [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:bg-teal/5 [&_blockquote]:rounded-r
            ">
              <ReactMarkdown>{cleanedBody}</ReactMarkdown>
            </div>

            {/* Key Takeaways */}
            {content.highlights?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-grey/10">
                <h3 className="text-sm font-semibold text-grey uppercase tracking-wide mb-4">Key Takeaways</h3>
                <div className="grid gap-3">
                  {content.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-teal/5 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-navy">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Continue button */}
      {isActive && (
        <div className="mt-6 max-w-3xl mx-auto">
          <button
            onClick={handleContinue}
            className="w-full py-3 bg-teal text-white font-medium rounded-lg hover:bg-teal-dark transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ============================================
// QUIZ RENDERER - WITH ADAPTIVE LOGIC
// ============================================

function QuizRenderer({
  atom,
  content,
  onComplete,
  onQuizFail,
  onContinue,
  isActive,
  onQuizAnswer,
}: {
  atom: Atom
  content: QuizContent
  onComplete: (atomId: string, score: number) => void
  onQuizFail?: (atomId: string, score: number) => void
  onContinue?: () => void
  isActive: boolean
  // Phase 4: Callback to capture quiz answer details
  onQuizAnswer?: (details: QuizAnswerDetails) => void
}) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: {},
    showFeedback: false,
    feedbackCorrect: false,
    isComplete: false,
    score: 0,
  })
  // Phase 4: Track attempt number for each question
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})

  const currentQ = content.questions[quizState.currentQuestion]
  const totalQuestions = content.questions.length

  const handleAnswer = useCallback((optionIndex: number) => {
    if (!currentQ || quizState.showFeedback) return

    const isCorrect = optionIndex === currentQ.correctAnswer
    const newAnswers = { ...quizState.answers, [currentQ.id]: optionIndex }
    const correctCount = Object.entries(newAnswers).filter(
      ([qId, ans]) => {
        const q = content.questions.find(q => q.id === qId)
        return q && ans === q.correctAnswer
      }
    ).length
    const newScore = Math.round((correctCount / totalQuestions) * 100)

    // Phase 4: Update attempt count for this question
    const currentAttempt = (attemptCounts[currentQ.id] || 0) + 1
    setAttemptCounts(prev => ({
      ...prev,
      [currentQ.id]: currentAttempt,
    }))

    // Phase 4: Call onQuizAnswer with details for AI coach context
    if (onQuizAnswer && currentQ.options) {
      onQuizAnswer({
        questionId: currentQ.id,
        questionText: currentQ.question,
        selectedAnswer: currentQ.options[optionIndex] || `Option ${optionIndex + 1}`,
        wasCorrect: isCorrect,
        attemptNumber: currentAttempt,
      })
    }

    setQuizState(prev => ({
      ...prev,
      answers: newAnswers,
      showFeedback: true,
      feedbackCorrect: isCorrect,
      score: newScore,
    }))
  }, [currentQ, content.questions, quizState, totalQuestions, attemptCounts, onQuizAnswer])

  const handleNext = useCallback(() => {
    const nextIndex = quizState.currentQuestion + 1

    if (nextIndex >= totalQuestions) {
      setQuizState(prev => ({ ...prev, isComplete: true, showFeedback: false }))
    } else {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: nextIndex,
        showFeedback: false,
      }))
    }
  }, [quizState, totalQuestions])

  const handleRetry = () => {
    setQuizState({
      currentQuestion: 0,
      answers: {},
      showFeedback: false,
      feedbackCorrect: false,
      isComplete: false,
      score: 0,
    })
  }

  const handleContinueAfterQuiz = () => {
    const passingScore = content.passingScore ?? 70 // Default to 70% if not set
    const passed = quizState.score >= passingScore
    console.log('[Quiz] Continue after quiz - score:', quizState.score, 'passingScore:', passingScore, 'passed:', passed)
    if (passed) {
      console.log('[Quiz] Passed! Calling onComplete and onContinue')
      onComplete(atom.id, quizState.score)
      onContinue?.()
    } else if (onQuizFail) {
      console.log('[Quiz] Failed! Calling onQuizFail')
      onQuizFail(atom.id, quizState.score)
    } else {
      // Fallback: complete anyway if no fail handler
      console.log('[Quiz] Failed but no fail handler, completing anyway')
      onComplete(atom.id, quizState.score)
      onContinue?.()
    }
  }

  // Quiz Complete View
  if (quizState.isComplete) {
    const passingScoreValue = content.passingScore ?? 70
    const passed = quizState.score >= passingScoreValue
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col items-center justify-center p-6 relative z-10"
      >
        <div className={`text-7xl font-bold ${passed ? 'text-green-500' : 'text-orange-500'}`}>
          {quizState.score}%
        </div>
        <p className="text-xl text-navy font-medium mt-2">
          {passed ? 'Great work!' : 'Keep practicing'}
        </p>
        <p className="text-grey mt-1 mb-6 text-center">
          {passed
            ? "Ready for the next lesson."
            : `Need ${passingScoreValue}% to continue.`}
        </p>

        {passed ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleContinueAfterQuiz()
            }}
            className="px-6 py-3 bg-teal text-white font-medium rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-2 relative z-20 cursor-pointer"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleRetry}
            className="px-6 py-3 border border-grey/30 text-navy font-medium rounded-lg hover:bg-light-grey/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-grey">
          Question {quizState.currentQuestion + 1} of {totalQuestions}
        </span>
        <div className="flex gap-1.5">
          {content.questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < quizState.currentQuestion
                  ? 'bg-teal'
                  : i === quizState.currentQuestion
                  ? 'bg-navy'
                  : 'bg-grey/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <h3 className="text-xl font-medium text-navy mb-4">{currentQ?.question}</h3>

      {/* Options */}
      <div className="space-y-2 flex-1">
        {currentQ?.options?.map((option, index) => {
          const isSelected = quizState.answers[currentQ.id] === index
          const isCorrect = index === currentQ.correctAnswer
          const showCorrect = quizState.showFeedback && isCorrect
          const showIncorrect = quizState.showFeedback && isSelected && !isCorrect

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={quizState.showFeedback || !isActive}
              className={`
                w-full p-3 rounded-lg text-left transition-all flex items-center gap-3
                ${isSelected && !quizState.showFeedback
                  ? 'bg-teal/10 ring-2 ring-teal'
                  : 'bg-light-grey/30 hover:bg-light-grey/50'}
                ${showCorrect ? 'bg-green-50 ring-2 ring-green-500' : ''}
                ${showIncorrect ? 'bg-red-50 ring-2 ring-red-400' : ''}
                disabled:cursor-default
              `}
            >
              <span className={`
                w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0
                ${showCorrect ? 'bg-green-500 text-white' : ''}
                ${showIncorrect ? 'bg-red-400 text-white' : ''}
                ${!quizState.showFeedback ? 'bg-white text-grey border border-grey/30' : ''}
              `}>
                {showCorrect ? <CheckCircle className="w-4 h-4" /> :
                 showIncorrect ? <XCircle className="w-4 h-4" /> :
                 String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm text-navy">{option}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {quizState.showFeedback && currentQ && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-shrink-0 mt-4"
        >
          <div className={`p-3 rounded-lg text-sm mb-3 ${
            quizState.feedbackCorrect ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
          }`}>
            <span className="font-medium">
              {quizState.feedbackCorrect ? 'Correct! ' : 'Not quite. '}
            </span>
            {currentQ.explanation}
          </div>

          <button
            onClick={handleNext}
            className="w-full py-3 bg-teal text-white font-medium rounded-lg hover:bg-teal-dark transition-colors flex items-center justify-center gap-2"
          >
            {quizState.currentQuestion + 1 >= totalQuestions ? 'See Results' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

// ============================================
// GENERIC RENDERER
// ============================================

function GenericRenderer({
  atom,
  onComplete,
  onContinue,
  isActive,
}: {
  atom: Atom
  onComplete: (atomId: string) => void
  onContinue?: () => void
  isActive: boolean
}) {
  const [hasCompleted, setHasCompleted] = useState(false)

  const handleContinue = () => {
    if (!hasCompleted) {
      onComplete(atom.id)
      setHasCompleted(true)
    }
    onContinue?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center"
    >
      <h2 className="text-2xl font-semibold text-navy mb-4">{atom.title}</h2>
      <p className="text-grey text-lg mb-8">
        Complete this {atom.type} activity to continue.
      </p>
      {isActive && (
        <button
          onClick={handleContinue}
          className="px-8 py-4 bg-teal text-white font-semibold text-lg rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-2"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  )
}

export default ContentRenderer
