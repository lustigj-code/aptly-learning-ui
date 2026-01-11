/**
 * AI Feedback Widget
 * Phase 9: RLHF (Reinforcement Learning from Human Feedback)
 *
 * Collects user feedback on AI responses for continuous improvement
 * Simple thumbs up/down + optional text feedback
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageSquare, X, Check, Loader2 } from 'lucide-react';

type Props = {
  responseId: string;
  conversationId?: string;
  onFeedbackSubmitted?: (rating: 'thumbs_up' | 'thumbs_down', feedback?: string) => void;
  compact?: boolean;
};

export function AIFeedbackWidget({
  responseId,
  conversationId,
  onFeedbackSubmitted,
  compact = false
}: Props) {
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRating = async (newRating: 'thumbs_up' | 'thumbs_down') => {
    if (submitted) return;

    setRating(newRating);

    // If thumbs down, prompt for more feedback
    if (newRating === 'thumbs_down') {
      setShowFeedbackInput(true);
    } else {
      // Submit immediately for thumbs up
      await submitFeedback(newRating);
    }
  };

  const submitFeedback = async (feedbackRating?: 'thumbs_up' | 'thumbs_down', text?: string) => {
    const ratingToSubmit = feedbackRating || rating;
    if (!ratingToSubmit) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          conversationId,
          rating: ratingToSubmit,
          detailedFeedback: text || feedbackText || null,
        }),
      });

      if (!response.ok) {
        // Silently handle error but still show success to user
        console.error('Failed to submit feedback');
      }

      setSubmitted(true);
      onFeedbackSubmitted?.(ratingToSubmit, text || feedbackText);
    } catch (error) {
      console.error('Feedback submission error:', error);
      // Still show as submitted for better UX
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
      setShowFeedbackInput(false);
    }
  };

  // Compact version (inline with AI response)
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-gray-500"
            >
              <Check className="w-3 h-3 text-green-500" />
              <span>Thanks!</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={() => handleRating('thumbs_up')}
                disabled={isSubmitting}
                className={`p-1 rounded hover:bg-gray-100 transition ${
                  rating === 'thumbs_up' ? 'text-green-600 bg-green-50' : 'text-gray-400'
                }`}
                aria-label="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRating('thumbs_down')}
                disabled={isSubmitting}
                className={`p-1 rounded hover:bg-gray-100 transition ${
                  rating === 'thumbs_down' ? 'text-red-600 bg-red-50' : 'text-gray-400'
                }`}
                aria-label="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full version
  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span>Thanks for your feedback! It helps us improve.</span>
          </motion.div>
        ) : showFeedbackInput ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                What could be improved?
              </p>
              <button
                onClick={() => {
                  setShowFeedbackInput(false);
                  setRating(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'Not accurate',
                'Not helpful',
                'Too generic',
                'Missing context',
                'Confusing',
              ].map((option) => (
                <button
                  key={option}
                  onClick={() => setFeedbackText(option)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition ${
                    feedbackText === option
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Or describe in your own words... (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={() => submitFeedback()}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
              <button
                onClick={() => submitFeedback(rating!, '')}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Skip
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-gray-500">Was this response helpful?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRating('thumbs_up')}
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                  rating === 'thumbs_up'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">Yes</span>
              </button>
              <button
                onClick={() => handleRating('thumbs_down')}
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                  rating === 'thumbs_down'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm">No</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline feedback buttons for compact spaces
 */
export function AIFeedbackInline({ responseId, onFeedbackSubmitted }: Omit<Props, 'compact'>) {
  return (
    <AIFeedbackWidget
      responseId={responseId}
      onFeedbackSubmitted={onFeedbackSubmitted}
      compact
    />
  );
}
