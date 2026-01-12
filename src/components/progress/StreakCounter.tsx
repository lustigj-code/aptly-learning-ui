'use client';

import { motion } from 'framer-motion';
import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, SHADOWS_RAW } from '@/lib/design-tokens';

type StreakCounterSize = 'sm' | 'md' | 'lg' | 'xl';

type StreakCounterProps = {
  count: number;
  size?: StreakCounterSize;
  showFlame?: boolean;
  atRisk?: boolean;
  longestStreak?: number;
  freezesAvailable?: number;
  className?: string;
};

const sizeConfig: Record<StreakCounterSize, { flame: number; text: string; container: string }> = {
  sm: { flame: 20, text: 'text-lg', container: 'gap-1' },
  md: { flame: 28, text: 'text-2xl', container: 'gap-1.5' },
  lg: { flame: 40, text: 'text-4xl', container: 'gap-2' },
  xl: { flame: 56, text: 'text-6xl', container: 'gap-3' },
};

export function StreakCounter({
  count,
  size = 'md',
  showFlame = true,
  atRisk = false,
  longestStreak,
  freezesAvailable,
  className,
}: StreakCounterProps) {
  const { flame, text, container } = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <motion.div
        className={cn('flex items-center', container)}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING.gentle}
      >
        {showFlame && (
          <motion.div
            className={cn(
              'relative',
              atRisk && 'animate-pulse'
            )}
            animate={
              !atRisk && count > 0
                ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
          >
            <Flame
              size={flame}
              className={cn(
                'transition-colors duration-300',
                count > 0
                  ? atRisk
                    ? 'text-warning fill-warning/20'
                    : 'text-yellow fill-yellow/30'
                  : 'text-grey fill-grey/20'
              )}
            />

            {/* Glow effect for active streak */}
            {count > 0 && !atRisk && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(255,222,0,0)',
                    '0 0 20px rgba(255,222,0,0.6)',
                    '0 0 0px rgba(255,222,0,0)',
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>
        )}

        <motion.span
          className={cn(
            'font-bold tabular-nums',
            text,
            count > 0
              ? atRisk
                ? 'text-warning'
                : 'text-navy'
              : 'text-grey'
          )}
          key={count}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING.bouncy}
          aria-label={`${count} day streak`}
        >
          {count}
        </motion.span>
      </motion.div>

      <span className="text-sm text-rich-black/60 font-medium">
        {count === 1 ? 'day streak' : 'day streak'}
      </span>

      {atRisk && (
        <motion.p
          className="text-xs text-warning font-medium mt-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Complete a lesson to keep your streak!
        </motion.p>
      )}

      {longestStreak !== undefined && longestStreak > count && (
        <p className="text-xs text-rich-black/50 mt-1">
          Longest: {longestStreak} days
        </p>
      )}

      {freezesAvailable !== undefined && freezesAvailable > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: freezesAvailable }).map((_, i) => (
            <Snowflake key={i} size={14} className="text-muted-teal" />
          ))}
          <span className="text-xs text-rich-black/50 ml-1">
            {freezesAvailable} streak {freezesAvailable === 1 ? 'freeze' : 'freezes'}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact inline streak for headers
type InlineStreakProps = {
  count: number;
  className?: string;
};

export function InlineStreak({ count, className }: InlineStreakProps) {
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow/20',
        className
      )}
      whileHover={{ scale: 1.05 }}
    >
      <Flame size={16} className="text-yellow fill-yellow/50" />
      <span className="font-bold text-sm text-navy">{count}</span>
    </motion.div>
  );
}

// Week view calendar
type StreakCalendarProps = {
  streakHistory: Array<{ date: string; completed: boolean }>;
  className?: string;
};

export function StreakCalendar({ streakHistory, className }: StreakCalendarProps) {
  // Get last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className={cn('flex gap-1.5', className)}>
      {last7Days.map((date, i) => {
        const dayOfWeek = new Date(date).getDay();
        const isCompleted = streakHistory.some(
          (d) => d.date === date && d.completed
        );
        const isToday = date === new Date().toISOString().split('T')[0];

        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <span className="text-xs text-rich-black/50 font-medium">
              {dayNames[dayOfWeek]}
            </span>
            <motion.div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                isCompleted
                  ? 'bg-yellow'
                  : isToday
                  ? 'bg-light-teal border-2 border-teal border-dashed'
                  : 'bg-light-grey'
              )}
              initial={false}
              animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {isCompleted && (
                <Flame size={16} className="text-navy" />
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
