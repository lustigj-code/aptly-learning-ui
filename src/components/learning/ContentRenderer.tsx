'use client'

import { useState, useCallback, useRef } from 'react'
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
import ReactMarkdown from 'react-markdown'
import type { Atom, VideoContent, ReadingContent, QuizContent, Question } from '@/types'

// ============================================
// TYPES
// ============================================

type ContentRendererProps = {
  atom: Atom
  onComplete: (atomId: string, score?: number) => void
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

export function ContentRenderer({ atom, onComplete, isActive = true }: ContentRendererProps) {
  switch (atom.type) {
    case 'video':
      return (
        <VideoRenderer
          atom={atom}
          content={atom.content as VideoContent}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
    case 'reading':
      return (
        <ReadingRenderer
          atom={atom}
          content={atom.content as ReadingContent}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
    case 'quiz':
      return (
        <QuizRenderer
          atom={atom}
          content={atom.content as QuizContent}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
    default:
      return (
        <GenericRenderer
          atom={atom}
          onComplete={onComplete}
          isActive={isActive}
        />
      )
  }
}

// ============================================
// VIDEO RENDERER - LARGE
// ============================================

function VideoRenderer({
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(pct)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-grey/20 overflow-hidden"
    >
      {/* Video Header */}
      <div className="flex items-center gap-4 p-4 border-b border-grey/10">
        <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
          <Play className="w-6 h-6 text-teal" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-navy text-lg">{atom.title}</h2>
          <p className="text-sm text-grey">
            {Math.ceil(content.duration / 60)} minute video
          </p>
        </div>
      </div>

      {/* Video Player - LARGE */}
      <div className="aspect-video bg-navy/5 relative">
        <video
          ref={videoRef}
          src={content.videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls
        />

        {/* Overlay play button when paused and at start */}
        {!isPlaying && progress === 0 && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <div className="w-20 h-20 bg-teal rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
              <Play className="w-8 h-8 ml-1" />
            </div>
          </button>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-grey/20">
          <div
            className="h-full bg-teal transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Key Takeaways */}
      {content.keyTakeaways?.length > 0 && (
        <div className="p-4 bg-light-grey/30">
          <h3 className="text-sm font-semibold text-navy mb-3">Key Takeaways</h3>
          <ul className="space-y-2">
            {content.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-rich-black/70">
                <CheckCircle className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Button */}
      {isActive && (
        <div className="p-4 border-t border-grey/10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => onComplete(atom.id)}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            I've Watched This Video
          </Button>
        </div>
      )}
    </motion.div>
  )
}

// ============================================
// READING RENDERER - LARGE
// ============================================

function ReadingRenderer({
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl"
    >
      {/* Compact Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <BookOpen className="w-5 h-5 text-teal" />
        <h2 className="font-semibold text-navy text-xl">{atom.title}</h2>
        <span className="text-sm text-grey ml-auto">{atom.estimatedMinutes} min</span>
      </div>

      {/* Reading Content */}
      <div className="px-6 pb-6">
        <div className="text-rich-black/85 leading-relaxed
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-navy [&_h1]:mt-6 [&_h1]:mb-2
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-navy [&_h2]:mt-5 [&_h2]:mb-2
          [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-navy [&_h3]:mt-4 [&_h3]:mb-1
          [&_p]:mb-4 [&_p]:leading-7
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
          [&_li]:leading-7
          [&_strong]:font-semibold
          [&_em]:italic
          [&_blockquote]:border-l-3 [&_blockquote]:border-teal/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-grey [&_blockquote]:my-4
        ">
          <ReactMarkdown>{content.body}</ReactMarkdown>
        </div>

        {/* Key Points inline */}
        {content.highlights?.length > 0 && (
          <div className="mt-6 p-4 bg-teal/5 rounded-lg">
            <h3 className="text-sm font-semibold text-teal mb-2">Key Points</h3>
            <ul className="space-y-1">
              {content.highlights.map((h, i) => (
                <li key={i} className="text-sm text-rich-black/70 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Complete Button inline */}
        {isActive && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-6"
            onClick={() => onComplete(atom.id)}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Continue
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// QUIZ RENDERER - LARGE & PROMINENT
// ============================================

function QuizRenderer({
  atom,
  content,
  onComplete,
  isActive,
}: {
  atom: Atom
  content: QuizContent
  onComplete: (atomId: string, score: number) => void
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

    setQuizState(prev => ({
      ...prev,
      answers: newAnswers,
      showFeedback: true,
      feedbackCorrect: isCorrect,
      score: newScore,
    }))
  }, [currentQ, content.questions, quizState, totalQuestions])

  const handleNext = useCallback(() => {
    const nextIndex = quizState.currentQuestion + 1

    if (nextIndex >= totalQuestions) {
      setQuizState(prev => ({ ...prev, isComplete: true, showFeedback: false }))
      onComplete(atom.id, quizState.score)
    } else {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: nextIndex,
        showFeedback: false,
      }))
    }
  }, [quizState, totalQuestions, atom.id, onComplete])

  // Quiz Complete View
  if (quizState.isComplete) {
    const passed = quizState.score >= content.passingScore
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-sm border border-grey/20 overflow-hidden text-center p-8"
      >
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
          passed ? 'bg-green-100' : 'bg-orange-100'
        }`}>
          {passed ? (
            <CheckCircle className="w-10 h-10 text-green-500" />
          ) : (
            <span className="text-4xl">🎯</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">Quiz Complete!</h2>
        <p className={`text-4xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-orange-600'}`}>
          {quizState.score}%
        </p>
        <p className="text-rich-black/60">
          {passed
            ? "Great job! You've mastered this material."
            : "Keep learning - you're making progress!"}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-grey/20 overflow-hidden"
    >
      {/* Quiz Header */}
      <div className="flex items-center gap-4 p-4 border-b border-grey/10 bg-blue-50">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-navy text-lg">{atom.title}</h2>
          <p className="text-sm text-blue-600">
            Question {quizState.currentQuestion + 1} of {totalQuestions}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1">
          {content.questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < quizState.currentQuestion
                  ? 'bg-green-500'
                  : i === quizState.currentQuestion
                  ? 'bg-blue-500'
                  : 'bg-grey/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question - LARGE */}
      <div className="p-6">
        <h3 className="text-xl font-medium text-navy mb-6">{currentQ?.question}</h3>

        {/* Options */}
        <div className="space-y-3">
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
                  w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4
                  ${isSelected && !quizState.showFeedback
                    ? 'border-teal bg-teal/5'
                    : 'border-grey/20 hover:border-grey/40 hover:bg-light-grey/30'}
                  ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                  ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                  disabled:cursor-default
                `}
              >
                <span className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-shrink-0
                  ${showCorrect ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${showIncorrect ? 'bg-red-500 border-red-500 text-white' : ''}
                  ${!quizState.showFeedback ? 'border-grey/40 text-rich-black/60' : ''}
                `}>
                  {showCorrect ? <CheckCircle className="w-5 h-5" /> :
                   showIncorrect ? <XCircle className="w-5 h-5" /> :
                   String.fromCharCode(65 + index)}
                </span>
                <span className="text-base">{option}</span>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {quizState.showFeedback && currentQ && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className={`
              p-4 rounded-xl
              ${quizState.feedbackCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}
            `}>
              <p className={`font-semibold ${quizState.feedbackCorrect ? 'text-green-700' : 'text-orange-700'}`}>
                {quizState.feedbackCorrect ? '✓ Correct!' : '✗ Not quite right'}
              </p>
              <p className="text-sm text-rich-black/70 mt-2">
                {currentQ.explanation}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-4"
              onClick={handleNext}
            >
              {quizState.currentQuestion + 1 >= totalQuestions
                ? 'See Results'
                : 'Next Question'}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// GENERIC RENDERER (Practice, etc.)
// ============================================

function GenericRenderer({
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-grey/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-grey/10">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-navy text-lg">{atom.title}</h2>
          <p className="text-sm text-grey capitalize">
            {atom.type} • {atom.estimatedMinutes} minutes
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-rich-black/70">
          Complete this {atom.type} activity to continue.
        </p>
      </div>

      {/* Complete Button */}
      {isActive && (
        <div className="p-4 border-t border-grey/10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => onComplete(atom.id)}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}
    </motion.div>
  )
}

export default ContentRenderer
