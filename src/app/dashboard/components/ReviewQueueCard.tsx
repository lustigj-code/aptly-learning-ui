/**
 * Review Queue Card
 *
 * 1x2 bento card showing spaced repetition review status
 * with urgency breakdown and 7-day forecast.
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BentoCard } from './DashboardGrid';
import type { UrgencySummary, ReviewForecastDay } from '../types';

interface ReviewQueueCardProps {
  dueCount: number;
  urgencySummary: UrgencySummary;
  estimatedMinutes: number;
  forecast?: ReviewForecastDay[];
  onStartReview: () => void;
  className?: string;
}

export function ReviewQueueCard({
  dueCount,
  urgencySummary,
  estimatedMinutes,
  forecast,
  onStartReview,
  className,
}: ReviewQueueCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasReviews = dueCount > 0;

  return (
    <BentoCard span="1x2" delay={0.05} className={className}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-teal" />
            <p className="text-sm font-medium text-rich-black/60">Review Queue</p>
          </div>
          {hasReviews && urgencySummary.high > 0 && (
            <span className="text-xs font-medium text-error bg-error/10 px-2 py-0.5 rounded-full">
              {urgencySummary.high} urgent
            </span>
          )}
        </div>

        {hasReviews ? (
          <>
            {/* Count & time */}
            <div className="mb-4">
              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-navy"
              >
                {dueCount}
              </motion.p>
              <p className="text-sm text-rich-black/50">items due for review</p>
              <div className="flex items-center gap-1 mt-1 text-rich-black/40">
                <Clock size={12} />
                <span className="text-xs">~{estimatedMinutes} min</span>
              </div>
            </div>

            {/* Urgency breakdown */}
            <div className="flex gap-2 mb-4">
              <UrgencyPill label="High" count={urgencySummary.high} color="error" />
              <UrgencyPill label="Medium" count={urgencySummary.medium} color="warning" />
              <UrgencyPill label="Low" count={urgencySummary.low} color="success" />
            </div>

            {/* Mini forecast (next 3 days) */}
            {forecast && forecast.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-rich-black/40 mb-2">Upcoming</p>
                <div className="flex gap-2">
                  {forecast.slice(0, 3).map((day, index) => (
                    <ForecastDay
                      key={day.date}
                      date={day.date}
                      count={day.dueCount}
                      delay={prefersReducedMotion ? 0 : 0.15 + index * 0.05}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={onStartReview}
              className={cn(
                'mt-auto w-full py-3 px-4 rounded-xl',
                'flex items-center justify-center gap-2',
                'bg-teal text-white font-medium',
                'hover:bg-teal-dark transition-colors',
                'shadow-[0_4px_12px_rgba(33,168,176,0.3)]'
              )}
            >
              Start Reviewing
              <ChevronRight size={18} />
            </button>
          </>
        ) : (
          /* All caught up state */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3"
            >
              <CheckCircle size={24} className="text-success" />
            </motion.div>
            <p className="font-medium text-navy mb-1">All caught up!</p>
            <p className="text-sm text-rich-black/50">No reviews due right now</p>

            {/* Show forecast even when caught up */}
            {forecast && forecast.length > 0 && (
              <div className="mt-4 w-full">
                <p className="text-xs text-rich-black/40 mb-2">Coming up</p>
                <div className="flex justify-center gap-2">
                  {forecast.slice(0, 3).map((day, index) => (
                    <ForecastDay
                      key={day.date}
                      date={day.date}
                      count={day.dueCount}
                      delay={prefersReducedMotion ? 0 : 0.2 + index * 0.05}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BentoCard>
  );
}

interface UrgencyPillProps {
  label: string;
  count: number;
  color: 'error' | 'warning' | 'success';
}

function UrgencyPill({ label, count, color }: UrgencyPillProps) {
  if (count === 0) return null;

  const colorClasses = {
    error: 'bg-error/10 text-error',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success-dark',
  };

  return (
    <div className={cn('px-2 py-1 rounded-md text-xs font-medium', colorClasses[color])}>
      {count} {label.toLowerCase()}
    </div>
  );
}

interface ForecastDayProps {
  date: string;
  count: number;
  delay?: number;
}

function ForecastDay({ date, count, delay = 0 }: ForecastDayProps) {
  const prefersReducedMotion = useReducedMotion();

  // Format date as weekday abbreviation
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1 bg-grey/10 rounded-lg p-2 text-center"
    >
      <p className="text-xs text-rich-black/40 mb-1">{dayName}</p>
      <p className={cn('text-sm font-semibold', count > 0 ? 'text-navy' : 'text-grey')}>
        {count}
      </p>
    </motion.div>
  );
}

export default ReviewQueueCard;
