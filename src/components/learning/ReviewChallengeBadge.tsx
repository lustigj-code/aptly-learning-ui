'use client';

import { useState } from 'react';
import { Star, Clock, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ReviewChallengeBadge - Visual badge for FSRS-injected review items
 *
 * Shows "Review Challenge" with gold/amber styling and animated entrance.
 * Includes tooltip explaining why this review is inserted.
 *
 * Part of Phase 13.2: Dynamic Queue Assembly
 */

interface ReviewChallengeBadgeProps {
  /** Days since last review (optional) */
  daysSinceReview?: number;
  /** Last mastery level achieved (0-100) */
  lastMasteryLevel?: number;
  /** Whether user is in exam mode */
  isExamMode?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
  /** Show animated entrance */
  animate?: boolean;
}

export function ReviewChallengeBadge({
  daysSinceReview,
  lastMasteryLevel,
  isExamMode = false,
  size = 'md',
  className,
  animate = true,
}: ReviewChallengeBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const getTooltipMessage = () => {
    if (isExamMode) {
      return 'This concept is important for your exam. Reviewing it now will strengthen your long-term retention.';
    }
    if (daysSinceReview !== undefined && daysSinceReview > 0) {
      return `You last reviewed this ${daysSinceReview} day${daysSinceReview === 1 ? '' : 's'} ago. A quick review now will help lock it in memory.`;
    }
    return 'This is a review challenge to strengthen your memory. Research shows spaced reviews improve long-term retention.';
  };

  const BadgeContent = (
    <div
      className={cn(
        'relative inline-flex items-center font-medium rounded-full cursor-help',
        'bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-400/20',
        'border border-amber-400/40 text-amber-700',
        'shadow-sm hover:shadow-md transition-shadow',
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      role="status"
      aria-label="Review Challenge"
      tabIndex={0}
    >
      {/* Animated star icon */}
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <Star
          size={iconSizes[size]}
          className="text-amber-500 fill-amber-400"
        />
      </motion.div>

      <span className="font-semibold">Review Challenge</span>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 z-50 w-64 p-3 rounded-lg',
              'bg-navy text-white text-xs leading-relaxed',
              'shadow-lg border border-grey/20',
              size === 'sm' ? 'top-full mt-1' : 'top-full mt-2'
            )}
            role="tooltip"
          >
            <p>{getTooltipMessage()}</p>

            {/* Context info */}
            {(daysSinceReview !== undefined || lastMasteryLevel !== undefined) && (
              <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                {daysSinceReview !== undefined && (
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Clock size={12} />
                    <span>Last seen: {daysSinceReview} day{daysSinceReview === 1 ? '' : 's'} ago</span>
                  </div>
                )}
                {lastMasteryLevel !== undefined && (
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Target size={12} />
                    <span>Last mastery: {lastMasteryLevel}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Exam mode indicator */}
            {isExamMode && (
              <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 text-amber-300">
                <Star size={12} className="fill-current" />
                <span className="font-medium">Important for your exam</span>
              </div>
            )}

            {/* Tooltip arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-navy rotate-45 border-l border-t border-grey/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
      >
        {BadgeContent}
      </motion.div>
    );
  }

  return BadgeContent;
}

/**
 * Screen reader announcement for review challenges
 * Use with aria-live="polite" region
 */
export function ReviewChallengeAnnouncement({
  skillName,
  daysSinceReview,
}: {
  skillName: string;
  daysSinceReview?: number;
}) {
  const message = daysSinceReview
    ? `Review Challenge: ${skillName}. You last reviewed this ${daysSinceReview} days ago.`
    : `Review Challenge: ${skillName}. Strengthen your memory with this spaced review.`;

  return (
    <div className="sr-only" role="status" aria-live="polite">
      {message}
    </div>
  );
}

/**
 * Mini review badge for queue display (compact version)
 */
export function MiniReviewBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        'bg-amber-100 text-amber-700 border border-amber-200',
        className
      )}
    >
      <Star size={10} className="fill-amber-400 text-amber-500" />
      <span>Review</span>
    </div>
  );
}

/**
 * Review context display - shows when user last saw this content
 */
export function ReviewContextInfo({
  daysSinceReview,
  lastMasteryLevel,
  isExamMode = false,
  className,
}: {
  daysSinceReview?: number;
  lastMasteryLevel?: number;
  isExamMode?: boolean;
  className?: string;
}) {
  if (!daysSinceReview && lastMasteryLevel === undefined && !isExamMode) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-wrap items-center gap-3 text-sm text-rich-black/70',
        'bg-amber-50 border border-amber-100 rounded-lg px-3 py-2',
        className
      )}
    >
      {daysSinceReview !== undefined && daysSinceReview > 0 && (
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-amber-600" />
          <span>You saw this {daysSinceReview} day{daysSinceReview === 1 ? '' : 's'} ago</span>
        </div>
      )}

      {lastMasteryLevel !== undefined && (
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-amber-600" />
          <span>Last mastery: {lastMasteryLevel}%</span>
        </div>
      )}

      {isExamMode && (
        <div className="flex items-center gap-1.5 text-amber-700 font-medium">
          <Star size={14} className="fill-amber-400 text-amber-500" />
          <span>Important for your exam</span>
        </div>
      )}
    </motion.div>
  );
}

export default ReviewChallengeBadge;
