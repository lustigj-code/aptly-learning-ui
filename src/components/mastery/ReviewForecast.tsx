'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type ForecastDay = {
  date: Date;
  dayLabel: string;
  dueCount: number;
  estimatedMinutes: number;
};

type ReviewForecastProps = {
  /** Array of due dates for upcoming reviews */
  upcomingDueDates: (Date | string)[];
  /** Average time per review in seconds */
  avgSecondsPerReview?: number;
  /** Number of days to forecast */
  daysAhead?: number;
  /** Custom class name */
  className?: string;
};

type WorkloadLevel = 'light' | 'moderate' | 'heavy' | 'overloaded';

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWorkloadLevel(count: number): WorkloadLevel {
  if (count <= 5) return 'light';
  if (count <= 15) return 'moderate';
  if (count <= 30) return 'heavy';
  return 'overloaded';
}

function getWorkloadColor(level: WorkloadLevel): string {
  switch (level) {
    case 'light': return 'bg-success';
    case 'moderate': return 'bg-teal';
    case 'heavy': return 'bg-yellow';
    case 'overloaded': return 'bg-error';
  }
}

function getWorkloadTextColor(level: WorkloadLevel): string {
  switch (level) {
    case 'light': return 'text-success';
    case 'moderate': return 'text-teal';
    case 'heavy': return 'text-yellow-dark';
    case 'overloaded': return 'text-error';
  }
}

function getDayLabel(date: Date, today: Date): string {
  const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ============================================
// REVIEW FORECAST COMPONENT
// ============================================

export function ReviewForecast({
  upcomingDueDates,
  avgSecondsPerReview = 30,
  daysAhead = 7,
  className,
}: ReviewForecastProps) {
  const { forecast, totalCount, totalMinutes, overallLevel } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a map of day -> count
    const dayCounts = new Map<string, number>();

    // Initialize all days
    for (let i = 0; i < daysAhead; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      dayCounts.set(day.toDateString(), 0);
    }

    // Count items per day
    for (const dueDate of upcomingDueDates) {
      const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
      const dayKey = date.toDateString();

      // Only count if within forecast window
      if (dayCounts.has(dayKey)) {
        dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
      } else if (date < today) {
        // Overdue items count for today
        const todayKey = today.toDateString();
        dayCounts.set(todayKey, (dayCounts.get(todayKey) || 0) + 1);
      }
    }

    // Build forecast array
    const forecast: ForecastDay[] = [];
    let totalCount = 0;

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const count = dayCounts.get(date.toDateString()) || 0;
      const estimatedMinutes = Math.round((count * avgSecondsPerReview) / 60);

      forecast.push({
        date,
        dayLabel: getDayLabel(date, today),
        dueCount: count,
        estimatedMinutes,
      });

      totalCount += count;
    }

    const totalMinutes = Math.round((totalCount * avgSecondsPerReview) / 60);
    const avgPerDay = totalCount / daysAhead;
    const overallLevel = getWorkloadLevel(avgPerDay * 2); // Scale for weekly view

    return { forecast, totalCount, totalMinutes, overallLevel };
  }, [upcomingDueDates, avgSecondsPerReview, daysAhead]);

  // Find max count for scaling bars
  const maxCount = Math.max(...forecast.map(d => d.dueCount), 1);

  return (
    <Card variant="outlined" padding="md" className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-teal" />
            <span className="font-semibold text-navy">7-Day Forecast</span>
          </div>
          <div className={cn('text-xs font-medium', getWorkloadTextColor(overallLevel))}>
            {totalCount} reviews
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-1 h-24">
          {forecast.map((day, index) => {
            const barHeight = maxCount > 0 ? (day.dueCount / maxCount) * 100 : 0;
            const level = getWorkloadLevel(day.dueCount);
            const isToday = index === 0;

            return (
              <motion.div
                key={day.date.toISOString()}
                className="flex-1 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Count label on hover/top */}
                {day.dueCount > 0 && (
                  <span className={cn(
                    'text-xs font-medium mb-1',
                    getWorkloadTextColor(level)
                  )}>
                    {day.dueCount}
                  </span>
                )}

                {/* Bar */}
                <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                  <motion.div
                    className={cn(
                      'w-full rounded-t-sm',
                      getWorkloadColor(level),
                      isToday && 'ring-2 ring-navy/20'
                    )}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(barHeight, day.dueCount > 0 ? 8 : 0)}%` }}
                    transition={{ delay: 0.2 + index * 0.05, duration: 0.4 }}
                  />
                </div>

                {/* Day label */}
                <span className={cn(
                  'text-xs mt-1',
                  isToday ? 'font-semibold text-navy' : 'text-rich-black/60'
                )}>
                  {day.dayLabel}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-grey/20">
          <div className="flex items-center gap-2 text-xs text-rich-black/60">
            <Clock size={12} />
            <span>Est. {formatMinutes(totalMinutes)} total</span>
          </div>

          {overallLevel === 'overloaded' ? (
            <div className="flex items-center gap-1 text-xs text-error">
              <AlertTriangle size={12} />
              <span>Heavy workload</span>
            </div>
          ) : overallLevel === 'light' ? (
            <div className="flex items-center gap-1 text-xs text-success">
              <CheckCircle size={12} />
              <span>Light week</span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// COMPACT FORECAST BADGE
// ============================================

type CompactForecastProps = {
  todayCount: number;
  tomorrowCount: number;
  className?: string;
};

/**
 * Minimal forecast showing today and tomorrow only
 */
export function CompactForecast({ todayCount, tomorrowCount, className }: CompactForecastProps) {
  const todayLevel = getWorkloadLevel(todayCount);
  const tomorrowLevel = getWorkloadLevel(tomorrowCount);

  return (
    <div className={cn('flex items-center gap-3 text-xs', className)}>
      <div className="flex items-center gap-1">
        <div className={cn('w-2 h-2 rounded-full', getWorkloadColor(todayLevel))} />
        <span className="text-rich-black/70">Today:</span>
        <span className={cn('font-medium', getWorkloadTextColor(todayLevel))}>
          {todayCount}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className={cn('w-2 h-2 rounded-full', getWorkloadColor(tomorrowLevel))} />
        <span className="text-rich-black/70">Tomorrow:</span>
        <span className={cn('font-medium', getWorkloadTextColor(tomorrowLevel))}>
          {tomorrowCount}
        </span>
      </div>
    </div>
  );
}
