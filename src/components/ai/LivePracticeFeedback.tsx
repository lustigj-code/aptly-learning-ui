/**
 * Live Practice Feedback Component
 * Phase 4.3: UI Integration - Real-time AI guidance
 *
 * Shows AI feedback as user types their practice response
 * Uses FREE AI orchestrator with smart debouncing
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { provideLiveGuidance } from '@/lib/ai/practice-feedback';
import type { PracticeRubric } from '@/lib/ai/practice-feedback';

// Simple debounce utility to avoid lodash dependency
type DebouncedFunction<T extends (...args: Parameters<T>) => ReturnType<T>> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

type LivePracticeFeedbackProps = {
  userText: string;
  rubric: PracticeRubric[];
  context: {
    prompt: string;
    expectedOutcomes: string[];
    lessonTopic: string;
  };
  onScoreUpdate?: (score: number) => void;
};

export function LivePracticeFeedback({
  userText,
  rubric,
  context,
  onScoreUpdate,
}: LivePracticeFeedbackProps) {
  const [feedback, setFeedback] = useState<{
    guidance: string;
    estimatedScore: number;
    rubricProgress: Array<{ criterion: string; covered: boolean; score: number }>;
    nextStep: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Debounced analysis - waits 3 seconds after user stops typing
  const debouncedAnalyze = useMemo(
    () =>
      debounce(async (text: string) => {
        if (text.length < 50) {
          setFeedback(null);
          return;
        }

        setLoading(true);

        try {
          const result = await provideLiveGuidance(text, rubric, context);
          setFeedback(result);
          onScoreUpdate?.(result.estimatedScore);
        } catch (error) {
          console.error('Live feedback error:', error);
          setFeedback(null);
        } finally {
          setLoading(false);
        }
      }, 3000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rubric, context]
  );

  // Trigger analysis when text changes
  useEffect(() => {
    debouncedAnalyze(userText);

    return () => {
      debouncedAnalyze.cancel();
    };
  }, [userText, debouncedAnalyze]);

  const wordCount = userText.split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Word Count & Score Preview */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{wordCount} words</span>
        {feedback && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal" />
            <span className="font-semibold text-teal">Estimated Score: {feedback.estimatedScore}%</span>
          </div>
        )}
      </div>

      {/* Rubric Progress */}
      {feedback && feedback.rubricProgress.length > 0 && (
        <Card className="p-4 bg-white border-gray-200">
          <p className="text-sm font-semibold text-navy mb-3">Rubric Coverage:</p>
          <div className="space-y-2">
            {feedback.rubricProgress.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{item.criterion}</span>
                  <span
                    className={`font-semibold ${item.covered ? 'text-green' : 'text-gray-400'}`}
                  >
                    {item.covered ? '✓ Covered' : 'Not yet'}
                  </span>
                </div>
                <ProgressBar
                  value={item.score}
                  max={100}
                  size="sm"
                  color={item.covered ? 'success' : 'teal'}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Guidance */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2"
          >
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal border-t-transparent" />
            Sage is analyzing your response...
          </motion.div>
        )}

        {!loading && feedback && feedback.guidance && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-4 bg-gradient-to-br from-teal/5 to-light-teal/50 border-teal/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-teal mb-1">Sage&apos;s Guidance:</p>
                  <p className="text-sm text-gray-700">{feedback.guidance}</p>

                  {feedback.nextStep && (
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Next:</strong> {feedback.nextStep}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      {wordCount < 50 && (
        <p className="text-xs text-gray-500 text-center">
          Write at least 50 words to receive AI guidance
        </p>
      )}
    </div>
  );
}

/**
 * Simplified version for inline hints
 */
export function InlinePracticeFeedback({ guidance }: { guidance: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-teal/5 rounded-lg border border-teal/20">
      <MessageCircle className="w-4 h-4 text-teal mt-0.5" />
      <p className="text-sm text-gray-700">{guidance}</p>
    </div>
  );
}
