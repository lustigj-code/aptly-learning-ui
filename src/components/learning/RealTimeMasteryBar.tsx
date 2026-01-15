'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RealTimeMasteryBar - Animated mastery indicator with real-time updates
 *
 * Shows previous and current mastery with smooth animations.
 * Displays change delta (+X%) and celebrates improvements.
 * Updates in real-time after quiz answers.
 *
 * Part of Phase 3-2: Intelligent Learn Page
 */

export interface RealTimeMasteryBarProps {
  /** Current mastery percentage (0-100) */
  currentMastery: number;
  /** Previous mastery percentage (0-100) - used to show change */
  previousMastery?: number;
  /** Skill name being tracked */
  skillName?: string;
  /** Whether to show the change indicator */
  showChange?: boolean;
  /** Whether to celebrate improvements */
  celebrateImprovement?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function RealTimeMasteryBar({
  currentMastery,
  previousMastery,
  skillName,
  showChange = true,
  celebrateImprovement = true,
  size = 'md',
  className,
}: RealTimeMasteryBarProps) {
  const [displayedMastery, setDisplayedMastery] = useState(previousMastery ?? currentMastery);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const change = previousMastery !== undefined ? currentMastery - previousMastery : 0;
  const hasImproved = change > 0;
  const hasDecreased = change < 0;

  // Animate mastery change
  useEffect(() => {
    if (previousMastery !== undefined && currentMastery !== displayedMastery) {
      setIsAnimating(true);

      // Animate the number counting up/down
      const duration = 800; // ms
      const steps = 20;
      const stepDuration = duration / steps;
      const stepSize = (currentMastery - displayedMastery) / steps;

      let step = 0;
      const interval = setInterval(() => {
        step++;
        setDisplayedMastery(prev => {
          const next = prev + stepSize;
          // Snap to final value on last step
          if (step >= steps) {
            clearInterval(interval);
            setIsAnimating(false);
            return currentMastery;
          }
          return next;
        });
      }, stepDuration);

      // Show celebration for significant improvements
      if (hasImproved && change >= 5 && celebrateImprovement) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      return () => clearInterval(interval);
    }
  }, [currentMastery, previousMastery, celebrateImprovement, change, hasImproved]);

  const sizeConfig = {
    sm: {
      height: 'h-1.5',
      text: 'text-xs',
      badge: 'text-[10px] px-1.5 py-0.5',
      gap: 'gap-2',
    },
    md: {
      height: 'h-2',
      text: 'text-sm',
      badge: 'text-xs px-2 py-1',
      gap: 'gap-3',
    },
    lg: {
      height: 'h-3',
      text: 'text-base',
      badge: 'text-sm px-2.5 py-1',
      gap: 'gap-4',
    },
  };

  const styles = sizeConfig[size];

  // Color based on mastery level
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 85) return 'bg-green-500';
    if (mastery >= 70) return 'bg-teal';
    if (mastery >= 50) return 'bg-amber-500';
    return 'bg-red-400';
  };

  const getGlowColor = (mastery: number) => {
    if (mastery >= 85) return 'shadow-green-500/30';
    if (mastery >= 70) return 'shadow-teal/30';
    if (mastery >= 50) return 'shadow-amber-500/30';
    return 'shadow-red-400/30';
  };

  return (
    <div className={cn('relative', className)}>
      {/* Header row */}
      <div className={cn('flex items-center justify-between mb-1.5', styles.gap)}>
        {/* Skill name and mastery percentage */}
        <div className="flex items-center gap-2 min-w-0">
          {skillName && (
            <span className={cn('text-grey truncate', styles.text)}>
              {skillName}
            </span>
          )}
          <motion.span
            key={displayedMastery}
            className={cn('font-semibold text-navy tabular-nums', styles.text)}
            animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {Math.round(displayedMastery)}%
          </motion.span>
        </div>

        {/* Change indicator */}
        {showChange && change !== 0 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-center gap-1 rounded-full font-medium',
              styles.badge,
              hasImproved
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
            )}
          >
            {hasImproved ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {hasImproved ? '+' : ''}
              {Math.round(change)}%
            </span>
          </motion.div>
        )}

        {/* No change indicator */}
        {showChange && change === 0 && previousMastery !== undefined && (
          <div className={cn(
            'flex items-center gap-1 rounded-full font-medium',
            'bg-grey/10 text-grey',
            styles.badge
          )}>
            <Minus className="w-3 h-3" />
            <span>No change</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        className={cn(
          'relative bg-grey/10 rounded-full overflow-hidden',
          styles.height
        )}
        role="progressbar"
        aria-valuenow={Math.round(currentMastery)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${skillName ? `${skillName} mastery` : 'Mastery level'}: ${Math.round(currentMastery)}%${change !== 0 ? ` (${change > 0 ? '+' : ''}${Math.round(change)}% change)` : ''}`}
      >
        {/* Previous mastery marker (ghost) */}
        {previousMastery !== undefined && previousMastery !== currentMastery && (
          <motion.div
            initial={{ width: `${previousMastery}%` }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 1, delay: 0.5 }}
            className={cn(
              'absolute inset-y-0 left-0 rounded-full opacity-30',
              getMasteryColor(previousMastery)
            )}
            aria-hidden="true"
          />
        )}

        {/* Current mastery bar */}
        <motion.div
          initial={{ width: `${previousMastery ?? 0}%` }}
          animate={{ width: `${currentMastery}%` }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 20,
            mass: 1,
          }}
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            getMasteryColor(currentMastery),
            currentMastery >= 85 && `shadow-lg ${getGlowColor(currentMastery)}`
          )}
          aria-hidden="true"
        >
          {/* Shimmer on high mastery */}
          {currentMastery >= 70 && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: 'linear',
              }}
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* Mastery level markers */}
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          {/* 70% marker */}
          <div
            className="absolute h-full w-px bg-grey/30"
            style={{ left: '70%' }}
          />
          {/* 85% marker */}
          <div
            className="absolute h-full w-px bg-grey/30"
            style={{ left: '85%' }}
          />
        </div>
      </div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-8 right-0 flex items-center gap-1 text-green-600"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Nice progress!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact mastery indicator for header use
 */
export function MasteryIndicator({
  mastery,
  previousMastery,
  className,
}: {
  mastery: number;
  previousMastery?: number;
  className?: string;
}) {
  const change = previousMastery !== undefined ? mastery - previousMastery : 0;

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(mastery)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Mastery level: ${Math.round(mastery)}%${change !== 0 ? ` (${change > 0 ? '+' : ''}${Math.round(change)}% change)` : ''}`}
    >
      {/* Circular progress indicator */}
      <div className="relative w-8 h-8" aria-hidden="true">
        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="3"
          />
          <motion.circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={mastery >= 85 ? '#22C55E' : mastery >= 70 ? '#21A8B0' : '#F59E0B'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={75.4}
            initial={{ strokeDashoffset: 75.4 }}
            animate={{ strokeDashoffset: 75.4 - (mastery / 100) * 75.4 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-navy">
          {Math.round(mastery)}
        </span>
      </div>

      {/* Change badge */}
      {change !== 0 && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            change > 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          )}
          aria-hidden="true"
        >
          {change > 0 ? '+' : ''}{Math.round(change)}%
        </motion.span>
      )}
    </div>
  );
}

export default RealTimeMasteryBar;
