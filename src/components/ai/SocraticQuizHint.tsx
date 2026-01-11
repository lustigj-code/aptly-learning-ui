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
  attemptNumber,
  onHintViewed,
}: SocraticQuizHintProps) {
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 bg-light-blue/10 border-blue/30">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy mb-1">Hint {index + 1}:</p>
                <p className="text-sm text-gray-700">{hint}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Request Hint Button */}
      {currentLevel < 3 && (
        <Button
          onClick={requestHint}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue border-t-transparent" />
              Generating hint...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              {currentLevel === 0 ? 'Need a hint?' : `Show hint ${currentLevel + 1}`}
            </>
          )}
        </Button>
      )}

      {/* Educational message */}
      {currentLevel > 0 && currentLevel < 3 && (
        <p className="text-xs text-gray-500 text-center">
          Hints help you think through the problem. The goal is understanding, not just getting the right answer!
        </p>
      )}

      {currentLevel >= 3 && (
        <p className="text-xs text-gray-500 text-center">
          You've seen all available hints. Use what you've learned to reason through the answer!
        </p>
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
