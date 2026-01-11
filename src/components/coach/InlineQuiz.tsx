'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export type QuizQuestion = {
  id: string
  text: string
  type: 'mc' | 'fill-in'
  options?: string[]
  correctAnswer: string
}

export type Answer = {
  questionId: string
  selected: string
  isCorrect: boolean
}

type InlineQuizProps = {
  question: QuizQuestion
  onAnswer: (answer: Answer) => void
  disabled?: boolean
}

// ============================================
// INLINE QUIZ COMPONENT
// ============================================

export function InlineQuiz({ question, onAnswer, disabled = false }: InlineQuizProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [fillInValue, setFillInValue] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleMCSelect = useCallback((option: string) => {
    if (hasAnswered || disabled) return

    setSelectedOption(option)
    const correct = option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
    setIsCorrect(correct)
    setHasAnswered(true)

    onAnswer({
      questionId: question.id,
      selected: option,
      isCorrect: correct,
    })
  }, [hasAnswered, disabled, question, onAnswer])

  const handleFillInSubmit = useCallback(() => {
    if (hasAnswered || disabled || !fillInValue.trim()) return

    const correct = fillInValue.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
    setIsCorrect(correct)
    setHasAnswered(true)

    onAnswer({
      questionId: question.id,
      selected: fillInValue.trim(),
      isCorrect: correct,
    })
  }, [hasAnswered, disabled, fillInValue, question, onAnswer])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFillInSubmit()
    }
  }, [handleFillInSubmit])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 max-w-sm"
    >
      <div className={cn(
        'rounded-xl p-4 shadow-sm border',
        'bg-white border-grey/30',
        disabled && 'opacity-60'
      )}>
        {/* Question Text */}
        <p className="text-sm font-medium text-navy mb-3">
          {question.text}
        </p>

        {/* Multiple Choice */}
        {question.type === 'mc' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isSelected = selectedOption === option
              const isCorrectOption = option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
              const showCorrect = hasAnswered && isCorrectOption
              const showIncorrect = hasAnswered && isSelected && !isCorrectOption

              return (
                <button
                  key={index}
                  onClick={() => handleMCSelect(option)}
                  disabled={hasAnswered || disabled}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                    'border flex items-center gap-2',
                    // Default state
                    !hasAnswered && !isSelected && 'border-grey/30 bg-light-grey/30 hover:bg-light-grey hover:border-grey/50',
                    // Selected but not submitted
                    !hasAnswered && isSelected && 'border-teal bg-teal/10',
                    // Correct answer revealed
                    showCorrect && 'border-green-500 bg-green-50 text-green-800',
                    // Incorrect selection
                    showIncorrect && 'border-red-500 bg-red-50 text-red-800',
                    // Disabled
                    (hasAnswered || disabled) && 'cursor-default'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0',
                    !hasAnswered && 'border-grey/40 text-rich-black/60',
                    showCorrect && 'bg-green-500 border-green-500 text-white',
                    showIncorrect && 'bg-red-500 border-red-500 text-white'
                  )}>
                    {showCorrect ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : showIncorrect ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Fill-in-the-blank */}
        {question.type === 'fill-in' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={fillInValue}
                onChange={(e) => setFillInValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={hasAnswered || disabled}
                placeholder="Type your answer..."
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal',
                  'bg-light-grey/30 border-grey/30',
                  'placeholder:text-grey',
                  (hasAnswered || disabled) && 'cursor-default opacity-70'
                )}
              />
              {!hasAnswered && (
                <button
                  onClick={handleFillInSubmit}
                  disabled={!fillInValue.trim() || disabled}
                  className={cn(
                    'px-3 py-2 rounded-lg transition-all',
                    'bg-teal text-white',
                    'hover:bg-teal-dark',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-grey/20"
          >
            <div className={cn(
              'flex items-center gap-2 text-sm font-medium',
              isCorrect ? 'text-green-600' : 'text-red-600'
            )}>
              {isCorrect ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Not quite. The answer is: {question.correctAnswer}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default InlineQuiz
