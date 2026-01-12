'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, TOUCH_TARGET } from '@/lib/design-tokens';

type QuizOptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'correct-not-selected';

type QuizOptionProps = {
  label: string;
  optionLetter?: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isAnswered?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
  className?: string;
};

const stateStyles: Record<QuizOptionState, string> = {
  default: 'border-grey bg-white hover:border-teal hover:bg-light-teal/20',
  selected: 'border-teal bg-light-teal/30 ring-2 ring-teal/20',
  correct: 'border-success bg-success-light',
  incorrect: 'border-error bg-error-light',
  'correct-not-selected': 'border-success bg-success-light/50',
};

export { QuizOption, QuizProgress };

function QuizOption({
  label,
  optionLetter,
  isSelected,
  isCorrect,
  isAnswered = false,
  isDisabled = false,
  onSelect,
  className,
}: QuizOptionProps) {
  // Determine the visual state
  const getState = (): QuizOptionState => {
    if (!isAnswered) {
      return isSelected ? 'selected' : 'default';
    }

    if (isSelected) {
      return isCorrect ? 'correct' : 'incorrect';
    }

    if (isCorrect) {
      return 'correct-not-selected';
    }

    return 'default';
  };

  const state = getState();
  const showCheckmark = isAnswered && isCorrect;
  const showX = isAnswered && isSelected && !isCorrect;

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`Option ${optionLetter}: ${label}`}
      disabled={isDisabled || isAnswered}
      onClick={onSelect}
      onKeyDown={(e) => {
        // Handle Enter and Spacebar for keyboard navigation
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && !isAnswered) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-left transition-colors duration-200',
        'flex items-center gap-3',
        'disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        TOUCH_TARGET.primaryClass, // 48px minimum touch target
        stateStyles[state],
        className
      )}
      whileHover={!isDisabled && !isAnswered ? { scale: 1.01, x: 4 } : undefined}
      whileTap={!isDisabled && !isAnswered ? { scale: 0.99 } : undefined}
      animate={
        state === 'correct'
          ? { scale: [1, 1.02, 1] }
          : state === 'incorrect'
          ? { x: [0, -8, 8, -8, 8, 0] }
          : {}
      }
      transition={
        state === 'incorrect'
          ? { duration: 0.4, ease: 'easeInOut' }
          : SPRING.snappy
      }
    >
      {/* Option letter circle */}
      {optionLetter && (
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0',
            state === 'correct' || (isAnswered && isCorrect)
              ? 'bg-success text-white'
              : state === 'incorrect'
              ? 'bg-error text-white'
              : isSelected
              ? 'bg-teal text-white'
              : 'bg-light-grey text-navy'
          )}
        >
          {showCheckmark ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING.bouncy}
            >
              <Check size={16} aria-label="Correct answer" />
            </motion.div>
          ) : showX ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING.bouncy}
            >
              <X size={16} aria-label="Incorrect answer" />
            </motion.div>
          ) : (
            optionLetter
          )}
        </div>
      )}

      {/* Label */}
      <span
        className={cn(
          'flex-1 font-medium',
          state === 'correct'
            ? 'text-success'
            : state === 'incorrect'
            ? 'text-error'
            : 'text-navy'
        )}
      >
        {label}
      </span>

      {/* Trailing indicator */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {isCorrect && <Check size={20} className="text-success" />}
          {!isCorrect && isSelected && <X size={20} className="text-error" />}
        </motion.div>
      )}
    </motion.button>
  );
}

// Quiz progress indicator
type QuizProgressProps = {
  currentQuestion: number;
  totalQuestions: number;
  className?: string;
};

function QuizProgress({
  currentQuestion,
  totalQuestions,
  className,
}: QuizProgressProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: totalQuestions }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-300',
            i < currentQuestion
              ? 'bg-teal'
              : i === currentQuestion
              ? 'bg-teal/50'
              : 'bg-light-grey'
          )}
          initial={false}
          animate={i === currentQuestion - 1 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}
