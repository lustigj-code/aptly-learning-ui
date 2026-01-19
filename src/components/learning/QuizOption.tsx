'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion/springs';
import { TOUCH_TARGET } from '@/lib/design-tokens';

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
  default: 'border-grey/40 bg-white hover:border-teal/60 hover:bg-light-teal/10 hover:shadow-md transition-shadow',
  selected: 'border-teal bg-gradient-to-r from-light-teal/40 to-light-teal/30 ring-2 ring-teal/30 shadow-md shadow-teal/10',
  correct: 'border-success bg-gradient-to-r from-success-light to-success-light/80 shadow-lg shadow-success/30',
  incorrect: 'border-error bg-gradient-to-r from-error-light to-error-light/80 shadow-lg shadow-error/30',
  'correct-not-selected': 'border-success/60 bg-success-light/40 shadow-sm',
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
        'w-full p-4 rounded-xl border-2 text-left',
        'flex items-center gap-3',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        'transition-colors duration-200',
        TOUCH_TARGET.primaryClass, // 48px minimum touch target
        stateStyles[state],
        className
      )}
      whileHover={!isDisabled && !isAnswered ? {
        scale: 1.02,
        x: 4,
        transition: SPRING.micro
      } : undefined}
      whileTap={!isDisabled && !isAnswered ? {
        scale: 0.98,
        transition: SPRING.micro
      } : undefined}
      animate={
        state === 'correct'
          ? {
              scale: [1, 1.05, 1.02, 1],
              transition: {
                type: 'spring',
                stiffness: 400,
                damping: 20,
                delay: 0.05
              }
            }
          : state === 'incorrect'
          ? {
              x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
              transition: {
                duration: 0.6,
                ease: 'easeInOut'
              }
            }
          : {}
      }
      transition={SPRING.micro}
    >
      {/* Option letter circle */}
      {optionLetter && (
        <motion.div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-all duration-200',
            state === 'correct' || (isAnswered && isCorrect)
              ? 'bg-success text-white shadow-lg shadow-success/40'
              : state === 'incorrect'
              ? 'bg-error text-white shadow-lg shadow-error/40'
              : isSelected
              ? 'bg-teal text-white shadow-md shadow-teal/30'
              : 'bg-light-grey text-navy'
          )}
          animate={
            state === 'correct'
              ? {
                  scale: [1, 1.25, 1.1, 1],
                  rotate: [0, 10, -10, 0],
                  boxShadow: [
                    '0 0 0 0 rgba(136, 182, 68, 0)',
                    '0 0 0 8px rgba(136, 182, 68, 0.3)',
                    '0 0 0 12px rgba(136, 182, 68, 0)',
                  ],
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: 0.1
                  }
                }
              : state === 'incorrect'
              ? {
                  rotate: [0, -12, 12, -10, 10, -6, 6, 0],
                  transition: { duration: 0.6, ease: 'easeInOut' }
                }
              : {}
          }
        >
          {showCheckmark ? (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING.bouncy, delay: 0.2 }}
            >
              <Check size={16} aria-label="Correct answer" />
            </motion.div>
          ) : showX ? (
            <motion.div
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING.bouncy, delay: 0.2 }}
            >
              <X size={16} aria-label="Incorrect answer" />
            </motion.div>
          ) : (
            optionLetter
          )}
        </motion.div>
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
      {Array.from({ length: totalQuestions }).map((_, i) => {
        const isCompleted = i < currentQuestion;
        const isCurrent = i === currentQuestion - 1;
        const isActive = i === currentQuestion;
        const isUpcoming = i > currentQuestion;

        return (
          <motion.div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full overflow-hidden relative',
              isCompleted && 'bg-teal shadow-sm shadow-teal/30',
              isActive && 'bg-gradient-to-r from-teal/60 to-teal/40 shadow-sm shadow-teal/20',
              isUpcoming && 'bg-light-grey'
            )}
            initial={false}
            animate={
              isCurrent
                ? {
                    scaleY: [1, 1.4, 1.2],
                    scaleX: [1, 1.02, 1],
                    transition: {
                      type: 'spring',
                      stiffness: 400,
                      damping: 15
                    }
                  }
                : isActive
                ? {
                    scaleY: [1.1, 1.2, 1.1],
                    transition: {
                      repeat: Infinity,
                      duration: 2,
                      ease: 'easeInOut'
                    }
                  }
                : { scaleY: 1, scaleX: 1 }
            }
          >
            {isCompleted && (
              <motion.div
                className="h-full w-full bg-gradient-to-r from-teal to-teal-dark"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={SPRING.micro}
                style={{ transformOrigin: 'left' }}
              />
            )}
            {isCurrent && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-teal/50 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1,
                  ease: 'easeInOut'
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
