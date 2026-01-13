'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useReviewQueue, type DueReviewItem } from '@/hooks/useReviewQueue';

type ReviewQueueWidgetProps = {
  userId: string | null;
  maxItems?: number;
};

/**
 * Determines urgency level based on due date
 * - overdue: red (past due date)
 * - due_today: yellow (due today)
 * - upcoming: green (due in future)
 */
function getUrgencyLevel(dueDate: string | null): 'overdue' | 'due_today' | 'upcoming' {
  if (!dueDate) return 'upcoming';

  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) return 'overdue';
  if (dueDay.getTime() === today.getTime()) return 'due_today';
  return 'upcoming';
}

/**
 * Get urgency styling configuration
 */
function getUrgencyConfig(urgency: 'overdue' | 'due_today' | 'upcoming') {
  switch (urgency) {
    case 'overdue':
      return {
        bgColor: 'bg-error/10',
        borderColor: 'border-error/30',
        textColor: 'text-error',
        icon: AlertCircle,
        label: 'Overdue',
      };
    case 'due_today':
      return {
        bgColor: 'bg-yellow-light',
        borderColor: 'border-yellow-dark/30',
        textColor: 'text-yellow-dark',
        icon: Clock,
        label: 'Due Today',
      };
    case 'upcoming':
      return {
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        textColor: 'text-success',
        icon: CheckCircle,
        label: 'Upcoming',
      };
  }
}

/**
 * Format relative due date for display
 */
function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'Scheduled';

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

/**
 * Single review item row
 */
function ReviewItemRow({ item }: { item: DueReviewItem }) {
  const urgency = getUrgencyLevel(item.dueDate);
  const config = getUrgencyConfig(urgency);
  const UrgencyIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        config.bgColor,
        config.borderColor,
        'hover:shadow-sm'
      )}
    >
      {/* Urgency Indicator */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          urgency === 'overdue' ? 'bg-error/20' : urgency === 'due_today' ? 'bg-yellow/20' : 'bg-success/20'
        )}
      >
        <UrgencyIcon size={16} className={config.textColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy truncate">{item.conceptName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-rich-black/60 capitalize">{item.category}</span>
          <span className="text-xs text-rich-black/40">|</span>
          <span className={cn('text-xs', config.textColor)}>{formatDueDate(item.dueDate)}</span>
        </div>
      </div>

      {/* Mastery Level */}
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            'text-sm font-semibold',
            item.masteryLevel >= 80 ? 'text-success' : item.masteryLevel >= 50 ? 'text-yellow-dark' : 'text-error'
          )}
        >
          {Math.round(item.masteryLevel)}%
        </p>
        <p className="text-xs text-rich-black/50">mastery</p>
      </div>
    </motion.div>
  );
}

/**
 * ReviewQueueWidget - Dashboard widget showing due review items
 *
 * Features:
 * - Shows count of due reviews
 * - Lists top 5 due items with skill names
 * - "Start Review Session" button
 * - Visual urgency indicators (overdue = red, due today = yellow, upcoming = green)
 */
export function ReviewQueueWidget({ userId, maxItems = 5 }: ReviewQueueWidgetProps) {
  const router = useRouter();
  const { dueItems, dueCount, isLoading, isError } = useReviewQueue(userId, maxItems + 5);

  // Don't render if no user
  if (!userId) return null;

  // Loading state
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className="animate-pulse">
        <div className="space-y-4">
          <div className="h-6 w-40 bg-grey/20 rounded" />
          <div className="h-16 bg-grey/20 rounded-lg" />
          <div className="h-16 bg-grey/20 rounded-lg" />
        </div>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card variant="outlined" padding="lg" className="border-error/20 bg-error/5">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle size={20} />
          <p className="text-sm">Unable to load review queue</p>
        </div>
      </Card>
    );
  }

  // No items due - show success state
  if (dueCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          variant="elevated"
          padding="lg"
          className="bg-gradient-to-br from-success/5 to-teal/5 border-2 border-success/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-success/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={28} className="text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-navy">All Caught Up!</h3>
              <p className="text-sm text-rich-black/60 mt-0.5">
                No concepts due for review. Great job staying on top of your learning!
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Calculate urgency counts
  const overdueCount = dueItems.filter((item) => getUrgencyLevel(item.dueDate) === 'overdue').length;
  const dueTodayCount = dueItems.filter((item) => getUrgencyLevel(item.dueDate) === 'due_today').length;

  // Get top items to display
  const displayItems = dueItems.slice(0, maxItems);

  // Determine header status
  const hasOverdue = overdueCount > 0;
  const statusConfig = hasOverdue
    ? {
        bgGradient: 'from-error/5 to-yellow/5',
        borderColor: 'border-error/20',
        headerBg: 'bg-error/10',
        headerIcon: AlertCircle,
        headerColor: 'text-error',
      }
    : {
        bgGradient: 'from-purple/5 to-teal/5',
        borderColor: 'border-purple/20',
        headerBg: 'bg-purple/10',
        headerIcon: Brain,
        headerColor: 'text-purple',
      };

  const HeaderIcon = statusConfig.headerIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        variant="elevated"
        padding="lg"
        className={cn('bg-gradient-to-br border-2', statusConfig.bgGradient, statusConfig.borderColor)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusConfig.headerBg)}>
                <HeaderIcon size={18} className={statusConfig.headerColor} />
              </div>
              <span>Spaced Repetition</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-error/20 text-error rounded-full">
                  {overdueCount} overdue
                </span>
              )}
              {dueTodayCount > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-yellow-light text-yellow-dark rounded-full">
                  {dueTodayCount} today
                </span>
              )}
            </div>
          </div>
          <CardDescription className="mt-1">
            {dueCount} concept{dueCount !== 1 ? 's' : ''} ready for review
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Review Items List */}
          <div className="space-y-2">
            {displayItems.map((item, index) => (
              <motion.div
                key={item.conceptId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ReviewItemRow item={item} />
              </motion.div>
            ))}
          </div>

          {/* Show more indicator */}
          {dueCount > maxItems && (
            <p className="text-xs text-rich-black/50 text-center pt-1">
              + {dueCount - maxItems} more concept{dueCount - maxItems !== 1 ? 's' : ''} to review
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => router.push('/review')}
            >
              Start Review Session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight size={14} />}
              onClick={() => router.push('/mastery')}
            >
              View All
            </Button>
          </div>

          {/* Tip */}
          <div className="mt-2 p-3 bg-light-grey/50 rounded-lg">
            <p className="text-xs text-rich-black/60">
              <span className="font-medium text-navy">Tip:</span> Reviewing now strengthens long-term memory.
              The best time to review is right before you forget!
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ReviewQueueWidget;
