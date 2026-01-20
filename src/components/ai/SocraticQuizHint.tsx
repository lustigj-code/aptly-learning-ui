/**
 * Socratic Quiz Hint Component
 * Phase 4.2: UI Integration - Quiz AI
 *
 * Provides progressive Socratic hints during quizzes
 * Uses FREE AI orchestrator
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { generatePreAnswerHint } from '@/lib/ai/quiz-ai-integration';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { QuizQuestion } from '@/lib/ai/quiz-ai-integration';

type SocraticQuizHintProps = {
  question: QuizQuestion;
  userMastery: number;
  attemptNumber: number;
  onHintViewed: (level: number) => void;
};

export function SocraticQuizHint({
  question,
  userMastery,
  onHintViewed,
}: SocraticQuizHintProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hints, setHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);

  const requestHint = async () => {
    setLoading(true);

    try {
      const level = currentLevel + 1;
      const hint = await generatePreAnswerHint(question, userMastery, level);

      setHints((prev) => [...prev, hint.hint]);
      setCurrentLevel(level);
      onHintViewed(level);

      // Track hint usage for learning analytics
      trackHintUsage(question.id, level);
    } catch (error) {
      console.error('Failed to generate hint:', error);

      // Fallback hint
      const fallbackHints = [
        'Think about what you already know about this topic. What concepts does this build on?',
        'Try to eliminate the answers you know are wrong. What makes them incorrect?',
        'Consider the context: what problem is this concept trying to solve?',
      ];

      setHints((prev) => [...prev, fallbackHints[currentLevel] || fallbackHints[0]]);
      setCurrentLevel((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hint Display */}
      {hints.map((hint, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
            delay: index * 0.1
          }}
        >
          <Card className="p-5 bg-gradient-to-br from-light-teal/80 to-white border border-teal/20 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
              <motion.div
                className="w-8 h-8 rounded-xl bg-teal flex items-center justify-center flex-shrink-0 shadow-sm"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.1 + 0.1
                }}
              >
                <Lightbulb className="w-4 h-4 text-white" />
              </motion.div>
              <div className="flex-1">
                <p className="text-xs font-bold text-teal mb-2 uppercase tracking-wide">Hint {index + 1}</p>
                <p className="text-sm text-navy leading-relaxed font-medium">{hint}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Request Hint Button */}
      {currentLevel < 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hints.length * 0.1 + 0.2 }}
        >
          <motion.div whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined} whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}>
            <Button
              onClick={requestHint}
              disabled={loading}
              variant="secondary"
              size="sm"
              className="w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-teal border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Generating hint...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  {currentLevel === 0 ? 'Need a hint?' : `Show hint ${currentLevel + 1}`}
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Educational message */}
      {currentLevel > 0 && currentLevel < 3 && (
        <motion.p
          className="text-xs text-gray-600 text-center font-medium px-3 py-2 bg-gray-50/50 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Hints help you think through the problem. The goal is understanding, not just getting the right answer!
        </motion.p>
      )}

      {currentLevel >= 3 && (
        <motion.p
          className="text-xs text-gray-600 text-center font-semibold px-3 py-2 bg-gradient-to-br from-light-teal to-white rounded-lg border border-teal/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          You&apos;ve seen all available hints. Use what you&apos;ve learned to reason through the answer!
        </motion.p>
      )}
    </div>
  );
}

/**
 * Track hint usage for analytics
 */
function trackHintUsage(questionId: string, level: number) {
  // In production, log to analytics
  console.log(`Hint requested: ${questionId}, level ${level}`);
}
