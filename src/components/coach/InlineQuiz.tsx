'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
  const prefersReducedMotion = useReducedMotion()
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
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1]
      }}
      className="my-3 max-w-sm"
    >
      <div className={cn(
        'rounded-2xl p-5 shadow-md border backdrop-blur-sm',
        'bg-gradient-to-br from-white to-grey/5 border-grey/20',
        disabled && 'opacity-60'
      )}>
        {/* Question Text */}
        <div className="flex items-start gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">?</span>
          </div>
          <p className="text-sm font-semibold text-navy leading-relaxed">
            {question.text}
          </p>
        </div>

        {/* Multiple Choice */}
        {question.type === 'mc' && question.options && (
          <div className="space-y-2.5">
            {question.options.map((option, index) => {
              const isSelected = selectedOption === option
              const isCorrectOption = option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
              const showCorrect = hasAnswered && isCorrectOption
              const showIncorrect = hasAnswered && isSelected && !isCorrectOption

              return (
                <motion.button
                  key={index}
                  onClick={() => handleMCSelect(option)}
                  disabled={hasAnswered || disabled}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={!hasAnswered && !disabled && !prefersReducedMotion ? { scale: 1.02, x: 4 } : undefined}
                  whileTap={!hasAnswered && !disabled && !prefersReducedMotion ? { scale: 0.98 } : undefined}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl text-sm transition-all',
                    'border flex items-center gap-3 shadow-sm',
                    // Default state
                    !hasAnswered && !isSelected && 'border-grey/20 bg-white hover:bg-gradient-to-br hover:from-teal/5 hover:to-purple/5 hover:border-teal/30 hover:shadow',
                    // Selected but not submitted
                    !hasAnswered && isSelected && 'border-teal bg-gradient-to-br from-teal/10 to-purple/5 shadow',
                    // Correct answer revealed
                    showCorrect && 'border-green-500/50 bg-gradient-to-br from-green-50 to-green-100/50 text-green-800 shadow-green-200/50',
                    // Incorrect selection
                    showIncorrect && 'border-red-500/50 bg-gradient-to-br from-red-50 to-red-100/50 text-red-800 shadow-red-200/50',
                    // Disabled
                    (hasAnswered || disabled) && 'cursor-default'
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all',
                    !hasAnswered && !isSelected && 'border-grey/30 bg-light-grey/50 text-rich-black/60',
                    !hasAnswered && isSelected && 'border-teal bg-teal text-white',
                    showCorrect && 'bg-green-500 border-green-500 text-white',
                    showIncorrect && 'bg-red-500 border-red-500 text-white'
                  )}>
                    {showCorrect ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : showIncorrect ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className="flex-1 font-medium">{option}</span>
                </motion.button>
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
                  'flex-1 px-4 py-3 rounded-xl border text-sm shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal/50',
                  'bg-white border-grey/20',
                  'placeholder:text-grey/60',
                  'transition-all',
                  (hasAnswered || disabled) && 'cursor-default opacity-70'
                )}
              />
              {!hasAnswered && (
                <motion.button
                  onClick={handleFillInSubmit}
                  disabled={!fillInValue.trim() || disabled}
                  whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                  whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                  className={cn(
                    'px-4 py-3 rounded-xl transition-all shadow-sm',
                    'bg-gradient-to-br from-teal to-purple text-white',
                    'hover:shadow-md',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-4 pt-4 border-t border-grey/10"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className={cn(
                'flex items-center gap-3 text-sm font-semibold px-4 py-3 rounded-xl',
                isCorrect
                  ? 'bg-gradient-to-br from-green-50 to-green-100/50 text-green-700 border border-green-200/50'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-700 border border-orange-200/50'
              )}
            >
              {isCorrect ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span>Excellent work!</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="block">Not quite right.</span>
                    <span className="text-xs font-medium text-orange-600/80 mt-1 block">
                      The answer is: <span className="font-bold">{question.correctAnswer}</span>
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default InlineQuiz
