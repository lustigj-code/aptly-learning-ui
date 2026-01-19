/**
 * CompletionOverlay - Shows celebration after completing a learning item
 *
 * Features:
 * - Confetti celebration
 * - XP earned display
 * - Smart next action: review prompt if reviews due, otherwise continue
 * - Session complete state
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle, ArrowRight, Brain, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CompletionOverlayProps {
  isOpen: boolean;
  xpEarned: number;
  itemTitle?: string;
  nextItemTitle?: string;
  hasNextItem: boolean;
  reviewsDue: number;
  isSessionComplete: boolean;
  onContinue: () => void;
  onGoToReviews: () => void;
  onGoToDashboard: () => void;
}

export function CompletionOverlay({
  isOpen,
  xpEarned,
  itemTitle,
  nextItemTitle,
  hasNextItem,
  reviewsDue,
  isSessionComplete,
  onContinue,
  onGoToReviews,
  onGoToDashboard,
}: CompletionOverlayProps) {
  const [showActions, setShowActions] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setShowActions(false);

      // Fire confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'],
      });

      // Show actions after celebration
      const timer = setTimeout(() => setShowActions(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Should we prompt for reviews?
  const shouldPromptReviews = reviewsDue >= 3 && !isSessionComplete;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            {isSessionComplete ? (
              <Trophy className="text-green-600 w-10 h-10" />
            ) : (
              <CheckCircle className="text-green-600 w-10 h-10" />
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            {isSessionComplete ? 'Session Complete!' : 'Great work!'}
          </motion.h2>

          {/* Item title */}
          {itemTitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 mb-4"
            >
              {isSessionComplete ? 'You finished all items' : `Completed: ${itemTitle}`}
            </motion.p>
          )}

          {/* XP Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
            className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles size={18} />
            <span className="font-semibold">+{xpEarned} XP</span>
          </motion.div>

          {/* Action Buttons */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {isSessionComplete ? (
                  // Session complete - go to dashboard
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={onGoToDashboard}
                  >
                    <Trophy className="mr-2" size={18} />
                    Back to Dashboard
                  </Button>
                ) : shouldPromptReviews ? (
                  // Reviews are due - prompt to do them
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-left">
                      <div className="flex items-center gap-2 text-amber-700 mb-2">
                        <Brain size={18} />
                        <span className="font-medium">{reviewsDue} reviews due</span>
                      </div>
                      <p className="text-sm text-amber-600">
                        Quick reviews help lock in what you&apos;ve learned!
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={onGoToReviews}
                    >
                      <Brain className="mr-2" size={18} />
                      Do Reviews First
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      fullWidth
                      onClick={onContinue}
                    >
                      Skip to {nextItemTitle || 'Next Lesson'}
                    </Button>
                  </>
                ) : hasNextItem ? (
                  // Normal flow - continue to next item
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={onContinue}
                  >
                    {nextItemTitle ? `Next: ${nextItemTitle}` : 'Continue'}
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                ) : (
                  // No next item but session not marked complete
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={onGoToDashboard}
                  >
                    Finish
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
