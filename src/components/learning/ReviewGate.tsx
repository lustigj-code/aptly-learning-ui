/**
 * ReviewGate - Prompts users to complete reviews before continuing
 *
 * Shows when reviews are due and optionally blocks progression.
 */

'use client';

import { Brain, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ReviewGateProps {
  dueCount: number;
  minimumRequired?: number; // Default: 3
  onDoReviews: () => void;
  onSkip?: () => void;
  canSkip?: boolean;
}

export function ReviewGate({
  dueCount,
  minimumRequired = 3,
  onDoReviews,
  onSkip,
  canSkip = true,
}: ReviewGateProps) {
  const mustReview = dueCount >= minimumRequired;

  if (dueCount === 0) return null;

  return (
    <div
      className={`rounded-xl p-6 ${
        mustReview
          ? 'bg-amber-50 border-2 border-amber-300'
          : 'bg-light-teal border border-teal/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-full ${
            mustReview ? 'bg-amber-100' : 'bg-teal/20'
          }`}
        >
          <Brain
            className={mustReview ? 'text-amber-600' : 'text-teal'}
            size={24}
          />
        </div>

        <div className="flex-1">
          <h3
            className={`font-semibold text-lg mb-1 ${
              mustReview ? 'text-amber-800' : 'text-teal-dark'
            }`}
          >
            {mustReview ? 'Reviews Required' : 'Reviews Available'}
          </h3>

          <p
            className={`mb-4 ${
              mustReview ? 'text-amber-700' : 'text-teal'
            }`}
          >
            You have <strong>{dueCount} concept{dueCount !== 1 ? 's' : ''}</strong> ready
            for review.
            {mustReview
              ? ` Complete at least ${minimumRequired} before continuing to new content.`
              : ' Reviewing now helps strengthen your memory!'}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Clock size={14} />
            <span>~{Math.ceil(dueCount * 1.5)} minutes</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={onDoReviews}>
              <Brain className="mr-2" size={18} />
              Start Reviews ({dueCount})
            </Button>

            {canSkip && !mustReview && onSkip && (
              <Button variant="ghost" onClick={onSkip}>
                Skip for Now
                <ArrowRight className="ml-2" size={18} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline review prompt for smaller contexts
 */
export function ReviewPromptBadge({
  dueCount,
  onClick,
}: {
  dueCount: number;
  onClick: () => void;
}) {
  if (dueCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full text-sm font-medium transition-colors"
    >
      <Brain size={14} />
      {dueCount} review{dueCount !== 1 ? 's' : ''} due
    </button>
  );
}
