'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type SessionStats = {
  reviewed: number;
  correct: number;
  streak: number;
  totalTimeSeconds?: number;
};

type NextReviewInfo = {
  count: number;
  nextDate: Date | null;
};

type ReviewSessionInsightsProps = {
  stats: SessionStats;
  nextReview?: NextReviewInfo;
  className?: string;
};

type PerformanceLevel = 'excellent' | 'good' | 'needs-work' | 'struggling';

// ============================================
// AI OBSERVATIONS
// ============================================

const AI_OBSERVATIONS: Record<PerformanceLevel, string[]> = {
  excellent: [
    'Outstanding session! Your memory consolidation is excellent.',
    'Your recall speed suggests strong neural pathways forming.',
    'Impressive consistency - you\'re in the flow state!',
    'Pattern detected: You perform best with regular reviews.',
  ],
  good: [
    'Solid session! Your retention is improving steadily.',
    'Good progress - consistency is building your knowledge base.',
    'Your performance shows healthy learning patterns.',
    'You\'re building strong foundations - keep it up!',
  ],
  'needs-work': [
    'Some concepts need reinforcement - that\'s normal!',
    'Consider reviewing missed concepts again soon.',
    'Struggling items will become easier with repetition.',
    'Tip: Focus on understanding, not just memorization.',
  ],
  struggling: [
    'This content is challenging - that means you\'re learning!',
    'Consider breaking these concepts into smaller pieces.',
    'Recommendation: Review the related lesson material.',
    'Every expert was once a beginner - keep going!',
  ],
};

const CELEBRATION_MESSAGES: Record<PerformanceLevel, { emoji: string; title: string }> = {
  excellent: { emoji: '', title: 'Outstanding!' },
  good: { emoji: '', title: 'Well Done!' },
  'needs-work': { emoji: '', title: 'Good Effort!' },
  struggling: { emoji: '', title: 'Keep Going!' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPerformanceLevel(accuracy: number): PerformanceLevel {
  if (accuracy >= 90) return 'excellent';
  if (accuracy >= 70) return 'good';
  if (accuracy >= 50) return 'needs-work';
  return 'struggling';
}

function getRandomObservation(level: PerformanceLevel): string {
  const observations = AI_OBSERVATIONS[level];
  return observations[Math.floor(Math.random() * observations.length)];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function formatNextReviewDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours <= 0) return 'Later today';
    return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ============================================
// REVIEW SESSION INSIGHTS COMPONENT
// ============================================

export function ReviewSessionInsights({
  stats,
  nextReview,
  className,
}: ReviewSessionInsightsProps) {
  const { accuracy, performanceLevel, observation, celebration, avgTimePerItem } = useMemo(() => {
    const accuracy = stats.reviewed > 0
      ? Math.round((stats.correct / stats.reviewed) * 100)
      : 0;
    const performanceLevel = getPerformanceLevel(accuracy);
    const observation = getRandomObservation(performanceLevel);
    const celebration = CELEBRATION_MESSAGES[performanceLevel];
    const avgTimePerItem = stats.totalTimeSeconds && stats.reviewed > 0
      ? Math.round(stats.totalTimeSeconds / stats.reviewed)
      : null;

    return { accuracy, performanceLevel, observation, celebration, avgTimePerItem };
  }, [stats]);

  const statsColor = {
    excellent: 'text-success',
    good: 'text-teal',
    'needs-work': 'text-yellow-dark',
    struggling: 'text-error',
  }[performanceLevel];

  return (
    <Card variant="gradient" padding="xl" className={cn('text-center', className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        {/* Celebration Header */}
        <div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 mx-auto bg-teal/10 rounded-full flex items-center justify-center mb-4"
          >
            <Brain size={40} className="text-teal" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-navy"
          >
            {celebration.title}
          </motion.h3>
          <p className="text-rich-black/70 mt-1">
            Review session complete
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target size={14} className="text-navy" />
            </div>
            <p className="text-3xl font-bold text-navy">{stats.reviewed}</p>
            <p className="text-xs text-rich-black/60">Reviewed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={14} className={statsColor} />
            </div>
            <p className={cn('text-3xl font-bold', statsColor)}>{accuracy}%</p>
            <p className="text-xs text-rich-black/60">Accuracy</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap size={14} className="text-yellow" />
            </div>
            <p className="text-3xl font-bold text-yellow">{stats.streak}</p>
            <p className="text-xs text-rich-black/60">Best Streak</p>
          </div>
        </motion.div>

        {/* Average Time (if available) */}
        {avgTimePerItem !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 text-sm text-rich-black/60"
          >
            <Clock size={14} />
            <span>Avg. {formatTime(avgTimePerItem)} per item</span>
          </motion.div>
        )}

        {/* AI Observation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn(
            'p-4 rounded-lg border',
            performanceLevel === 'excellent' && 'bg-success-light border-success/30',
            performanceLevel === 'good' && 'bg-teal/10 border-teal/30',
            performanceLevel === 'needs-work' && 'bg-yellow-light/20 border-yellow/30',
            performanceLevel === 'struggling' && 'bg-error-light border-error/30'
          )}
        >
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="text-purple mt-0.5 flex-shrink-0" />
            <p className={cn(
              'text-sm text-left',
              performanceLevel === 'excellent' && 'text-success',
              performanceLevel === 'good' && 'text-teal',
              performanceLevel === 'needs-work' && 'text-yellow-dark',
              performanceLevel === 'struggling' && 'text-error'
            )}>
              {observation}
            </p>
          </div>
        </motion.div>

        {/* Next Review Forecast */}
        {nextReview && nextReview.count > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-4 border-t border-grey/20"
          >
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar size={14} className="text-teal" />
              <span className="text-rich-black/70">
                <span className="font-semibold text-navy">{nextReview.count} items</span>
                {' due '}
                {nextReview.nextDate && (
                  <span className="font-medium text-teal">
                    {formatNextReviewDate(nextReview.nextDate)}
                  </span>
                )}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Card>
  );
}

// ============================================
// MINI INSIGHTS BADGE
// ============================================

type MiniInsightsBadgeProps = {
  accuracy: number;
  reviewed: number;
  className?: string;
};

/**
 * Compact summary badge for inline display
 */
export function MiniInsightsBadge({ accuracy, reviewed, className }: MiniInsightsBadgeProps) {
  const level = getPerformanceLevel(accuracy);
  const colors = {
    excellent: 'bg-success/10 text-success border-success/30',
    good: 'bg-teal/10 text-teal border-teal/30',
    'needs-work': 'bg-yellow/10 text-yellow-dark border-yellow/30',
    struggling: 'bg-error/10 text-error border-error/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm',
        colors[level],
        className
      )}
    >
      <Award size={14} />
      <span className="font-medium">{accuracy}%</span>
      <span className="text-rich-black/50">({reviewed} items)</span>
    </div>
  );
}
