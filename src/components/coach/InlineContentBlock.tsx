'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  ChevronRight,
  BookOpen,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import ReactMarkdown from 'react-markdown'
import type { Atom, VideoContent, ReadingContent, QuizContent } from '@/types'

// ============================================
// TYPES
// ============================================

type InlineContentBlockProps = {
  atom: Atom
  onComplete: (atomId: string, score?: number) => void
  onQuizAnswer?: (questionId: string, isCorrect: boolean, score: number) => void
  isActive?: boolean
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

export function InlineContentBlock({
  atom,
  onComplete,
  onQuizAnswer,
  isActive = true,
}: InlineContentBlockProps) {
  switch (atom.type) {
    case 'video':
      return (
        <VideoBlock
          atom={atom}
          content={atom.content as VideoContent}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
    case 'reading':
      return (
        <ReadingBlock
          atom={atom}
          content={atom.content as ReadingContent}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
    case 'quiz':
      return (
        <QuizBlock
          atom={atom}
          content={atom.content as QuizContent}
          onComplete={onComplete}
          onQuizAnswer={onQuizAnswer}
          isActive={isActive}
        />
      )
    default:
      return (
        <GenericBlock
          atom={atom}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
  }
}

// ============================================
// VIDEO BLOCK
// ============================================

function VideoBlock({
  atom,
  content,
  onComplete,
  isActive,
}: {
  atom: Atom
  content: VideoContent
  onComplete: (atomId: string) => void
  isActive: boolean
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [_progress, _setProgress] = useState(0)
  const [showTranscript, setShowTranscript] = useState(false)

  const handleComplete = useCallback(() => {
    onComplete(atom.id)
  }, [atom.id, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3"
    >
      <Card className="overflow-hidden bg-gradient-to-br from-navy/5 to-teal/5 border-teal/20">
        {/* Video Header */}
        <div className="flex items-center gap-3 p-3 border-b border-grey/20">
          <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-teal" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-navy text-sm">{atom.title}</h4>
            <p className="text-xs text-rich-black/60">
              {Math.ceil(content.duration / 60)} min video
            </p>
          </div>
        </div>

        {/* Video Placeholder (would be actual video player) */}
        <div className="aspect-video bg-navy/10 flex items-center justify-center relative">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 bg-teal rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-grey/30">
            <div
              className="h-full bg-teal transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Key Takeaways */}
        {content.keyTakeaways?.length > 0 && (
          <div className="p-3 bg-light-grey/50">
            <p className="text-xs font-medium text-rich-black/70 mb-2">Key Takeaways:</p>
            <ul className="text-xs text-rich-black/60 space-y-1">
              {content.keyTakeaways.slice(0, 3).map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transcript Toggle */}
        {content.transcript && (
          <div className="border-t border-grey/20">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full p-2 text-xs text-rich-black/60 hover:bg-light-grey transition-colors flex items-center justify-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {showTranscript ? 'Hide' : 'Show'} Transcript
            </button>
            {showTranscript && (
              <div className="p-3 text-xs text-rich-black/70 max-h-40 overflow-y-auto bg-white">
                {content.transcript}
              </div>
            )}
          </div>
        )}

        {/* Complete Button */}
        {isActive && (
          <div className="p-3 border-t border-grey/20">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleComplete}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Watched
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// ============================================
// READING BLOCK
// ============================================

function ReadingBlock({
  atom,
  content,
  onComplete,
  isActive,
}: {
  atom: Atom
  content: ReadingContent
  onComplete: (atomId: string) => void
  isActive: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3"
    >
      <Card className="overflow-hidden border-teal/20">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-3 hover:bg-light-grey/50 transition-colors"
        >
          <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-teal" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-medium text-navy text-sm">{atom.title}</h4>
            <p className="text-xs text-rich-black/60">
              {atom.estimatedMinutes} min read
            </p>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-grey transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Content */}
        {expanded && (
          <div className="p-4 border-t border-grey/20">
            <div className="prose prose-sm max-w-none text-rich-black/80">
              <ReactMarkdown>{content.body}</ReactMarkdown>
            </div>

            {/* Highlights */}
            {content.highlights?.length > 0 && (
              <div className="mt-4 p-3 bg-yellow/10 rounded-lg border border-yellow/20">
                <p className="text-xs font-medium text-yellow-800 mb-2">Highlights:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {content.highlights.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Complete Button */}
            {isActive && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => onComplete(atom.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I&apos;ve Read This
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// ============================================
// QUIZ BLOCK
// ============================================

function QuizBlock({
  atom,
  content,
  onComplete,
  onQuizAnswer,
  isActive,
}: {
  atom: Atom
  content: QuizContent
  onComplete: (atomId: string, score: number) => void
  onQuizAnswer?: (questionId: string, isCorrect: boolean, score: number) => void
  isActive: boolean
}) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: {},
    showFeedback: false,
    feedbackCorrect: false,
    isComplete: false,
    score: 0,
  })

  const currentQ = content.questions[quizState.currentQuestion]

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
    const newScore = Math.round((correctCount / content.questions.length) * 100)

    setQuizState(prev => ({
      ...prev,
      answers: newAnswers,
      showFeedback: true,
      feedbackCorrect: isCorrect,
      score: newScore,
    }))

    onQuizAnswer?.(currentQ.id, isCorrect, newScore)
  }, [currentQ, content.questions, quizState, onQuizAnswer])

  const handleNext = useCallback(() => {
    const nextIndex = quizState.currentQuestion + 1

    if (nextIndex >= content.questions.length) {
      // Quiz complete
      setQuizState(prev => ({ ...prev, isComplete: true, showFeedback: false }))
      onComplete(atom.id, quizState.score)
    } else {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: nextIndex,
        showFeedback: false,
      }))
    }
  }, [quizState, content.questions.length, atom.id, onComplete])

  if (quizState.isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-3"
      >
        <Card className="p-4 text-center border-green-500/30 bg-green-50">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-semibold text-navy mb-1">Quiz Complete!</h4>
          <p className="text-2xl font-bold text-green-600 mb-2">{quizState.score}%</p>
          <p className="text-sm text-rich-black/60">
            {quizState.score >= content.passingScore
              ? "Great job! You've mastered this material."
              : "Keep practicing, you'll get there!"}
          </p>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3"
    >
      <Card className="overflow-hidden border-teal/20">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 bg-light-teal border-b border-teal/20">
          <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-teal" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-navy text-sm">{atom.title}</h4>
            <p className="text-xs text-rich-black/60">
              Question {quizState.currentQuestion + 1} of {content.questions.length}
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="p-4">
          <p className="text-navy font-medium mb-4">{currentQ?.question}</p>

          {/* Options */}
          <div className="space-y-2">
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
                    w-full p-3 rounded-lg border text-left text-sm transition-all
                    ${isSelected && !quizState.showFeedback
                      ? 'border-teal bg-teal/10'
                      : 'border-grey/30 hover:border-grey/50'}
                    ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                    ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                    disabled:cursor-default
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium
                      ${showCorrect ? 'bg-green-500 border-green-500 text-white' : ''}
                      ${showIncorrect ? 'bg-red-500 border-red-500 text-white' : ''}
                      ${!quizState.showFeedback ? 'border-grey/40 text-rich-black/60' : ''}
                    `}>
                      {showCorrect ? <CheckCircle className="w-4 h-4" /> :
                       showIncorrect ? <XCircle className="w-4 h-4" /> :
                       String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {quizState.showFeedback && currentQ && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <div className={`
                p-3 rounded-lg
                ${quizState.feedbackCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
              `}>
                <p className={`text-sm font-medium ${quizState.feedbackCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {quizState.feedbackCorrect ? 'Correct!' : 'Not quite right'}
                </p>
                <p className="text-sm text-rich-black/70 mt-1">
                  {currentQ.explanation}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                fullWidth
                className="mt-3"
                onClick={handleNext}
              >
                {quizState.currentQuestion + 1 >= content.questions.length
                  ? 'Complete Quiz'
                  : 'Next Question'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ============================================
// GENERIC BLOCK (Practice, Project, etc.)
// ============================================

function GenericBlock({
  atom,
  onComplete,
  isActive,
}: {
  atom: Atom
  onComplete: (atomId: string) => void
  isActive: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3"
    >
      <Card className="p-4 border-orange-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="font-medium text-navy text-sm">{atom.title}</h4>
            <p className="text-xs text-rich-black/60 capitalize">{atom.type}</p>
          </div>
        </div>

        <p className="text-sm text-rich-black/70 mb-4">
          {atom.estimatedMinutes} minutes • Complete this {atom.type} activity
        </p>

        {isActive && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onComplete(atom.id)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Complete
          </Button>
        )}
      </Card>
    </motion.div>
  )
}

export default InlineContentBlock
