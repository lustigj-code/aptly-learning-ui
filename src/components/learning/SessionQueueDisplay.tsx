'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle,
  Dumbbell,
  Star,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionItem } from '@/lib/adaptive/sessionBuilder';
import { MiniReviewBadge } from './ReviewChallengeBadge';

/**
 * SessionQueueDisplay - Visual queue showing upcoming learning items
 *
 * Distinguishes between new content (teal) and reviews (amber).
 * Highlights current item and shows progress.
 * Collapsible on mobile for better space management.
 *
 * Part of Phase 13.2: Dynamic Queue Assembly
 */

interface SessionQueueDisplayProps {
  /** All session items */
  items: SessionItem[];
  /** Current item index */
  currentIndex: number;
  /** Total session time estimate (minutes) */
  estimatedMinutes?: number;
  /** Callback when item is clicked */
  onItemClick?: (index: number) => void;
  /** Start collapsed on mobile */
  defaultCollapsed?: boolean;
  /** Additional classes */
  className?: string;
}

type QueueItemType = SessionItem['type'] | 'review';

const typeIcons: Record<QueueItemType, typeof BookOpen> = {
  learn: BookOpen,
  review: Star,
  practice: Dumbbell,
  quiz: HelpCircle,
  warmup: Sparkles,
  cooldown: Sparkles,
};

const typeLabels: Record<QueueItemType, string> = {
  learn: 'New Lesson',
  review: 'Review',
  practice: 'Practice',
  quiz: 'Quiz',
  warmup: 'Warm-up',
  cooldown: 'Cool-down',
};

const typeColors: Record<QueueItemType, { bg: string; border: string; text: string; icon: string }> = {
  learn: {
    bg: 'bg-teal/10',
    border: 'border-teal/30',
    text: 'text-teal-dark',
    icon: 'text-teal',
  },
  review: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-500',
  },
  practice: {
    bg: 'bg-purple/10',
    border: 'border-purple/30',
    text: 'text-purple',
    icon: 'text-purple',
  },
  quiz: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
  },
  warmup: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: 'text-orange-500',
  },
  cooldown: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
  },
};

export function SessionQueueDisplay({
  items,
  currentIndex,
  estimatedMinutes,
  onItemClick,
  defaultCollapsed = false,
  className,
}: SessionQueueDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Calculate progress stats
  const stats = useMemo(() => {
    const completed = currentIndex;
    const remaining = items.length - currentIndex;
    const percentage = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    const reviewCount = items.filter(i => i.isReviewChallenge || i.type === 'review').length;
    const newCount = items.filter(i => i.type === 'learn').length;

    return { completed, remaining, percentage, reviewCount, newCount };
  }, [items, currentIndex]);

  // Get effective type (for styling)
  const getEffectiveType = (item: SessionItem): QueueItemType => {
    if (item.isReviewChallenge || item.type === 'review') return 'review';
    return item.type;
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-grey/20 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          'hover:bg-light-grey/30 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset'
        )}
        aria-expanded={!isCollapsed}
        aria-controls="session-queue-content"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Progress circle */}
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-light-grey"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - stats.percentage / 100)}`}
                  className="text-teal transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-navy">
                {stats.percentage}%
              </span>
            </div>

            <div className="text-left">
              <p className="text-sm font-medium text-navy">
                Session Queue
              </p>
              <p className="text-xs text-rich-black/60">
                {stats.completed} of {items.length} complete
                {estimatedMinutes && ` - ~${estimatedMinutes} min`}
              </p>
            </div>
          </div>
        </div>

        {/* Content type badges */}
        <div className="flex items-center gap-2">
          {stats.newCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-teal/10 text-teal border border-teal/20">
              <BookOpen size={10} />
              {stats.newCount} new
            </span>
          )}
          {stats.reviewCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
              <Star size={10} className="fill-amber-400" />
              {stats.reviewCount} review{stats.reviewCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Collapse toggle */}
          <div className="p-1">
            {isCollapsed ? (
              <ChevronDown size={18} className="text-grey" />
            ) : (
              <ChevronUp size={18} className="text-grey" />
            )}
          </div>
        </div>
      </button>

      {/* Queue list */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            id="session-queue-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-grey/10"
          >
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {items.map((item, index) => {
                const effectiveType = getEffectiveType(item);
                const colors = typeColors[effectiveType];
                const Icon = typeIcons[effectiveType];
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                  <motion.div
                    key={item.itemId || index}
                    initial={false}
                    animate={{
                      opacity: isCompleted ? 0.6 : 1,
                      x: isCurrent ? 4 : 0,
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                      isCurrent && 'bg-teal/5 border-2 border-teal shadow-sm',
                      !isCurrent && isUpcoming && `${colors.bg} border border-transparent`,
                      isCompleted && 'bg-light-grey/30',
                      onItemClick && !isCompleted && 'cursor-pointer hover:shadow-sm'
                    )}
                    onClick={() => onItemClick && !isCompleted && onItemClick(index)}
                    role={onItemClick ? 'button' : undefined}
                    tabIndex={onItemClick && !isCompleted ? 0 : undefined}
                  >
                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle size={18} className="text-teal" />
                      ) : isCurrent ? (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-4 h-4 rounded-full bg-teal"
                        />
                      ) : (
                        <Icon size={16} className={colors.icon} />
                      )}
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium truncate',
                            isCurrent ? 'text-navy' : isCompleted ? 'text-grey line-through' : colors.text
                          )}
                        >
                          {typeLabels[effectiveType]}
                        </span>
                        {item.isReviewChallenge && !isCompleted && (
                          <MiniReviewBadge />
                        )}
                      </div>
                      <p
                        className={cn(
                          'text-xs truncate',
                          isCompleted ? 'text-grey' : 'text-rich-black/60'
                        )}
                      >
                        {item.reason}
                      </p>
                    </div>

                    {/* Time estimate */}
                    <span
                      className={cn(
                        'flex-shrink-0 text-xs',
                        isCompleted ? 'text-grey' : 'text-rich-black/50'
                      )}
                    >
                      {item.estimatedMinutes}m
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Queue legend on mobile */}
            <div className="px-4 py-2 border-t border-grey/10 flex items-center gap-4 text-xs text-rich-black/60 sm:hidden">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-teal" />
                <span>New</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Review</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact horizontal progress bar for minimal space
 */
export function SessionProgressBar({
  items,
  currentIndex,
  className,
}: {
  items: SessionItem[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {items.map((item, index) => {
        const isReview = item.isReviewChallenge || item.type === 'review';
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <motion.div
            key={item.itemId || index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              isCompleted && 'bg-teal',
              isCurrent && (isReview ? 'bg-amber-400' : 'bg-teal/50'),
              !isCompleted && !isCurrent && (isReview ? 'bg-amber-200' : 'bg-light-grey')
            )}
            animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        );
      })}
    </div>
  );
}

/**
 * Mini queue showing just next 2-3 items
 */
export function MiniSessionQueue({
  items,
  currentIndex,
  className,
}: {
  items: SessionItem[];
  currentIndex: number;
  className?: string;
}) {
  const upcomingItems = items.slice(currentIndex, currentIndex + 3);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-rich-black/60 flex-shrink-0">Up next:</span>
      <div className="flex items-center gap-1">
        {upcomingItems.map((item, idx) => {
          const effectiveType =
            item.isReviewChallenge || item.type === 'review' ? 'review' : item.type;
          const Icon = typeIcons[effectiveType];
          const colors = typeColors[effectiveType];

          return (
            <motion.div
              key={item.itemId || idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: idx === 0 ? 1 : 0.6, scale: 1 }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                colors.bg,
                colors.text,
                idx === 0 && 'ring-1 ring-teal'
              )}
            >
              <Icon size={12} className={colors.icon} />
              <span className="truncate max-w-16">{typeLabels[effectiveType]}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default SessionQueueDisplay;
