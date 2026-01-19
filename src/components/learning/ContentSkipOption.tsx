'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FastForward, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ContentSkipOption - Allows skipping mastered content
 *
 * Only shown when user mastery >= 85%.
 * Features green styling with "Already know this?" message.
 * Provides "Skip to quiz" button to test knowledge.
 *
 * Part of Phase 3-2: Intelligent Learn Page
 */

export interface ContentSkipOptionProps {
  /** Current mastery level for this skill (0-100) */
  mastery: number;
  /** Minimum mastery required to show skip option */
  masteryThreshold?: number;
  /** Skill name being studied */
  skillName?: string;
  /** Callback when user chooses to skip */
  onSkip: () => void;
  /** Callback when user chooses to continue learning */
  onContinue?: () => void;
  /** Whether the skip option is available */
  isEnabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ContentSkipOption({
  mastery,
  masteryThreshold = 85,
  skillName,
  onSkip,
  onContinue,
  isEnabled = true,
  className,
}: ContentSkipOptionProps) {
  const [isExpanded, _setIsExpanded] = useState(false);

  // Only show if mastery meets threshold
  if (mastery < masteryThreshold || !isEnabled) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200',
        'p-4',
        className
      )}
    >
      {/* Main content row */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-green-800">Already know this?</h4>
          <p className="text-sm text-green-600">
            You have {Math.round(mastery)}% mastery
            {skillName && ` in ${skillName}`}.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Skip button */}
          <button
            onClick={onSkip}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
              'bg-green-600 text-white hover:bg-green-700 transition-colors',
              'shadow-sm hover:shadow-md'
            )}
          >
            <FastForward className="w-4 h-4" />
            <span>Skip to quiz</span>
          </button>

          {/* Continue learning option */}
          {onContinue && (
            <button
              onClick={onContinue}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium',
                'text-green-700 hover:bg-green-100 transition-colors'
              )}
            >
              Keep learning
            </button>
          )}
        </div>
      </div>

      {/* Expandable info section */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-3 pt-3 border-t border-green-200"
        >
          <p className="text-sm text-green-700">
            Since you already have strong knowledge of this topic, you can skip
            directly to the quiz to verify your understanding. If you pass,
            you&apos;ll move on to the next section.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Compact inline version for header use
 */
export function SkipOptionBadge({
  mastery,
  masteryThreshold = 85,
  onSkip,
  className,
}: {
  mastery: number;
  masteryThreshold?: number;
  onSkip: () => void;
  className?: string;
}) {
  if (mastery < masteryThreshold) {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onSkip}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        'bg-green-100 text-green-700 hover:bg-green-200 transition-colors',
        'border border-green-200',
        className
      )}
    >
      <FastForward className="w-3 h-3" />
      <span>Skip to quiz</span>
      <ChevronRight className="w-3 h-3" />
    </motion.button>
  );
}

/**
 * Warning for users who skip but fail the quiz
 */
export function SkipFailureNotice({
  onReview,
  className,
}: {
  onReview: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-amber-50 border border-amber-200 rounded-lg p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">
            Let&apos;s review this together
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            It looks like there might be some gaps in your knowledge.
            A quick review will help reinforce the concepts.
          </p>
          <button
            onClick={onReview}
            className={cn(
              'mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-amber-500 text-white hover:bg-amber-600 transition-colors'
            )}
          >
            Review material
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default ContentSkipOption;
