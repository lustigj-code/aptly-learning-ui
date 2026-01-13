'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type MasteryDataPoint = {
  timestamp: Date;
  masteryLevel: number;
};

type MasteryTrajectoryProps = {
  /** Array of mastery values over time (most recent last) */
  history: MasteryDataPoint[] | number[];
  /** Maximum number of bars to show */
  maxBars?: number;
  /** Height of the chart in pixels */
  height?: number;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Custom class name */
  className?: string;
};

type TrendDirection = 'up' | 'down' | 'stable';

// ============================================
// MASTERY TRAJECTORY COMPONENT
// ============================================

/**
 * Mini sparkline bar chart showing mastery progression
 * Animates bars on render and new data
 */
export function MasteryTrajectory({
  history,
  maxBars = 10,
  height = 40,
  showTrend = true,
  className,
}: MasteryTrajectoryProps) {
  const { values, trend, trendPercent } = useMemo(() => {
    // Normalize input to array of numbers
    const normalized: number[] = history.map((item) =>
      typeof item === 'number' ? item : item.masteryLevel
    );

    // Take last N values
    const values = normalized.slice(-maxBars);

    // Calculate trend from first half vs second half
    if (values.length < 2) {
      return { values, trend: 'stable' as TrendDirection, trendPercent: 0 };
    }

    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const trendPercent = Math.round(diff);

    let trend: TrendDirection = 'stable';
    if (diff > 5) trend = 'up';
    else if (diff < -5) trend = 'down';

    return { values, trend, trendPercent };
  }, [history, maxBars]);

  // Don't render if no data
  if (values.length === 0) {
    return null;
  }

  const barWidth = 100 / Math.max(values.length, 1);
  const gap = 2; // Gap in percentage

  const trendConfig = {
    up: {
      icon: TrendingUp,
      color: 'text-success',
      label: `+${trendPercent}%`,
    },
    down: {
      icon: TrendingDown,
      color: 'text-error',
      label: `${trendPercent}%`,
    },
    stable: {
      icon: Minus,
      color: 'text-grey',
      label: 'Stable',
    },
  };

  const TrendIcon = trendConfig[trend].icon;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Bar Chart */}
      <div
        className="flex-1 flex items-end gap-0.5 bg-light-grey/50 rounded-lg p-1"
        style={{ height: `${height}px` }}
      >
        {values.map((value, index) => {
          const barHeight = Math.max((value / 100) * (height - 8), 2);
          const isLatest = index === values.length - 1;

          // Color based on mastery level
          let barColor = 'bg-grey';
          if (value >= 80) barColor = 'bg-success';
          else if (value >= 50) barColor = 'bg-yellow';
          else if (value >= 20) barColor = 'bg-teal';

          return (
            <motion.div
              key={index}
              className={cn(
                'flex-1 rounded-sm transition-colors',
                barColor,
                isLatest && 'ring-1 ring-navy/20'
              )}
              initial={{ height: 0 }}
              animate={{ height: barHeight }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>

      {/* Trend Indicator */}
      {showTrend && values.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn('flex items-center gap-1', trendConfig[trend].color)}
        >
          <TrendIcon size={16} />
          <span className="text-xs font-medium whitespace-nowrap">
            {trendConfig[trend].label}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// COMPACT TRAJECTORY INLINE
// ============================================

type CompactTrajectoryProps = {
  history: number[];
  className?: string;
};

/**
 * Ultra-compact inline trajectory for tight spaces
 */
export function CompactTrajectory({ history, className }: CompactTrajectoryProps) {
  const values = history.slice(-5);

  if (values.length === 0) return null;

  return (
    <div className={cn('flex items-end gap-px h-4', className)}>
      {values.map((value, index) => {
        const height = Math.max((value / 100) * 16, 2);
        let color = 'bg-grey';
        if (value >= 80) color = 'bg-success';
        else if (value >= 50) color = 'bg-yellow';
        else color = 'bg-teal';

        return (
          <motion.div
            key={index}
            className={cn('w-1 rounded-sm', color)}
            initial={{ height: 0 }}
            animate={{ height }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          />
        );
      })}
    </div>
  );
}
