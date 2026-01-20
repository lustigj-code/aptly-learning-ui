'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Hourglass, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PacingIndicator - Shows feedback on user's learning pace
 *
 * Compares user's responseTime to average time for the content.
 * - Too fast (<50% of avg): "Taking your time helps retention"
 * - Too slow (>200% of avg): "No rush - understanding is key"
 * - Just right: Positive reinforcement
 *
 * Part of Phase 3-2: Intelligent Learn Page
 */

export type PacingStatus = 'too_fast' | 'optimal' | 'too_slow' | 'normal';

export interface PacingIndicatorProps {
  /** User's response time in milliseconds */
  responseTimeMs: number;
  /** Average response time for this type of content in milliseconds */
  avgTimeMs: number;
  /** Whether to show the indicator (hide for first attempt, etc.) */
  show?: boolean;
  /** Whether the answer was correct (affects messaging) */
  isCorrect?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Auto-hide after duration (ms), 0 to disable */
  autoHideMs?: number;
  /** Callback when indicator is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

function getPacingStatus(responseTimeMs: number, avgTimeMs: number): PacingStatus {
  const ratio = responseTimeMs / avgTimeMs;

  if (ratio < 0.5) return 'too_fast';
  if (ratio > 2.0) return 'too_slow';
  if (ratio >= 0.8 && ratio <= 1.2) return 'optimal';
  return 'normal';
}

function getPacingConfig(status: PacingStatus, isCorrect?: boolean) {
  switch (status) {
    case 'too_fast':
      return {
        icon: Zap,
        message: isCorrect
          ? 'Quick thinking! Taking your time can help retention.'
          : 'Slow down a bit - careful reading helps.',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        iconColor: 'text-amber-500',
      };
    case 'too_slow':
      return {
        icon: Hourglass,
        message: "No rush - understanding is what matters.",
        bgColor: 'bg-light-teal',
        borderColor: 'border-teal/30',
        textColor: 'text-teal-dark',
        iconColor: 'text-teal',
      };
    case 'optimal':
      return {
        icon: Clock,
        message: isCorrect
          ? 'Great pace! You found the sweet spot.'
          : 'Good thinking time. Keep at it!',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700',
        iconColor: 'text-green-500',
      };
    default:
      return null;
  }
}

export function PacingIndicator({
  responseTimeMs,
  avgTimeMs,
  show = true,
  isCorrect,
  size = 'md',
  autoHideMs: _autoHideMs = 5000,
  onDismiss: _onDismiss,
  className,
}: PacingIndicatorProps) {
  const status = getPacingStatus(responseTimeMs, avgTimeMs);
  const config = getPacingConfig(status, isCorrect);

  // Don't show for normal pace (no feedback needed)
  if (!show || !config || status === 'normal') {
    return null;
  }

  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'px-3 py-2 text-xs',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-2',
    },
    md: {
      container: 'px-4 py-3 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-3',
    },
  };

  const styles = sizeClasses[size];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-lg border',
          config.bgColor,
          config.borderColor,
          styles.container,
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className={cn('flex items-center', styles.gap)}>
          <motion.div
            animate={{ rotate: status === 'too_fast' ? [0, -10, 10, 0] : 0 }}
            transition={{ repeat: status === 'too_fast' ? 2 : 0, duration: 0.3 }}
          >
            <Icon className={cn(styles.icon, config.iconColor)} />
          </motion.div>
          <span className={config.textColor}>{config.message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact pacing badge for inline display
 */
export function PacingBadge({
  responseTimeMs,
  avgTimeMs,
  className,
}: {
  responseTimeMs: number;
  avgTimeMs: number;
  className?: string;
}) {
  const status = getPacingStatus(responseTimeMs, avgTimeMs);

  if (status === 'normal') return null;

  const configs = {
    too_fast: {
      icon: Zap,
      label: 'Fast',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    too_slow: {
      icon: Hourglass,
      label: 'Thoughtful',
      color: 'bg-light-teal text-teal-dark border-teal/30',
    },
    optimal: {
      icon: Clock,
      label: 'Perfect pace',
      color: 'bg-green-100 text-green-700 border-green-200',
    },
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </motion.div>
  );
}

/**
 * Take a break suggestion for very slow responses
 */
export function TakeBreakSuggestion({
  show,
  onDismiss,
  onTakeBreak,
  className,
}: {
  show: boolean;
  onDismiss: () => void;
  onTakeBreak?: () => void;
  className?: string;
}) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-light-teal border border-teal/30 rounded-lg p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Coffee className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-navy">
            Need a quick break?
          </h4>
          <p className="text-sm text-teal-dark mt-1">
            Learning works best in focused sessions. A 5-minute break can
            help you come back refreshed.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {onTakeBreak && (
              <button
                onClick={onTakeBreak}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal text-white hover:bg-teal-dark transition-colors"
              >
                Take 5 min break
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-teal-dark hover:bg-teal/10 transition-colors"
            >
              I&apos;m good
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Helper to calculate average response time from history
 */
export function calculateAverageResponseTime(
  responseTimes: number[],
  defaultMs: number = 30000
): number {
  if (responseTimes.length === 0) return defaultMs;

  // Remove outliers (top and bottom 10%)
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const trimStart = Math.floor(sorted.length * 0.1);
  const trimEnd = Math.ceil(sorted.length * 0.9);
  const trimmed = sorted.slice(trimStart, trimEnd);

  if (trimmed.length === 0) return defaultMs;

  const sum = trimmed.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / trimmed.length);
}

export default PacingIndicator;
