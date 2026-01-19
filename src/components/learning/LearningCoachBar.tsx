'use client'

import { motion } from 'framer-motion'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SPRING, getMotionSafeTransition, getMotionSafeInitial } from '@/lib/motion/springs'

interface LearningCoachBarProps {
  message: string
  onAskSage: () => void
  showContinue: boolean
  onContinue: () => void
}

/**
 * LearningCoachBar - Floating glassmorphic coach bar
 *
 * Extracted from CoachLearningView's SmartCoachBar for reusability
 * and to reduce the god component's size.
 *
 * Features:
 * - Sage avatar with coaching tips
 * - "Ask Sage" button to open coach chat
 * - Optional "Continue" button when content is complete
 */
export function LearningCoachBar({
  message,
  onAskSage,
  showContinue,
  onContinue,
}: LearningCoachBarProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={getMotionSafeInitial({ opacity: 0, y: 20, scale: 0.95 }, prefersReducedMotion)}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={getMotionSafeTransition(SPRING.snappy, prefersReducedMotion)}
      role="region"
      aria-label="Learning coach assistant"
      className={cn(
        'fixed bottom-0 left-1/2 -translate-x-1/2 z-40',
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4',
        'px-5 py-4 pb-6 rounded-2xl',
        'bg-white/70 backdrop-blur-xl',
        'border border-white/50',
        'shadow-lg shadow-navy/10',
        'max-w-[90vw] sm:max-w-2xl',
        'safe-area-bottom'
      )}
    >
      {/* Sage Avatar */}
      <div
        className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0 shadow-md"
        aria-hidden="true"
      >
        <span className="text-lg">🦉</span>
      </div>

      {/* Message */}
      <p className="flex-1 text-sm text-navy min-w-0 font-medium" id="coach-message">
        {message}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto" role="group" aria-label="Coach actions">
        <motion.button
          onClick={onAskSage}
          whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          aria-label="Ask Sage for help"
          aria-describedby="coach-message"
          className={cn(
            'flex items-center justify-center gap-1.5 px-4 py-2.5',
            'text-sm font-medium text-teal',
            'bg-teal/10 hover:bg-teal/20',
            'rounded-xl transition-colors',
            'min-h-[44px] flex-1 sm:flex-initial'
          )}
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          <span>Ask Sage</span>
        </motion.button>
        {showContinue && (
          <motion.button
            onClick={onContinue}
            whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
            aria-label="Continue to next content"
            className={cn(
              'flex items-center justify-center gap-1.5 px-4 py-2.5',
              'bg-teal text-white text-sm font-medium',
              'rounded-xl hover:bg-teal-dark transition-colors',
              'min-h-[44px] flex-1 sm:flex-initial',
              'shadow-md shadow-teal/30'
            )}
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default LearningCoachBar
