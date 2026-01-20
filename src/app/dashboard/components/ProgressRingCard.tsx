/**
 * Progress Ring Card
 *
 * Large 2x2 bento card showing overall course completion
 * with animated SVG ring and course information.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, BookOpen, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS_RAW } from '@/lib/design-tokens';
import { BentoCard } from './DashboardGrid';

interface ProgressRingCardProps {
  percentage: number;
  courseName: string;
  moduleTitle: string;
  lessonsCompleted: number;
  totalLessons: number;
  atomsCompleted?: number;
  onContinueLearning?: () => void;
  className?: string;
}

export function ProgressRingCard({
  percentage,
  courseName,
  moduleTitle,
  lessonsCompleted,
  totalLessons,
  atomsCompleted = 0,
  onContinueLearning,
  className,
}: ProgressRingCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Animated progress value
  const springProgress = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const progress = useTransform(springProgress, (value) => Math.round(value));

  useEffect(() => {
    springProgress.set(percentage);
  }, [percentage, springProgress]);

  // SVG ring calculations
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <BentoCard span="2x2" delay={0} className={cn('relative overflow-hidden', className)}>
      {/* Subtle background glow */}
      <div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS_RAW.teal}, transparent)` }}
      />

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <p className="text-sm font-medium text-teal uppercase tracking-wider">
            Your Progress
          </p>
          <h2 className="text-xl font-semibold text-navy mt-1 line-clamp-1">
            {courseName}
          </h2>
        </div>

        {/* Progress Ring */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={COLORS_RAW.lightGrey}
                strokeWidth={strokeWidth}
              />

              {/* Progress arc */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={COLORS_RAW.teal}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{
                  strokeDashoffset: circumference - (percentage / 100) * circumference,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 1.5, ease: 'easeOut', delay: 0.3 }
                }
                style={{
                  filter: percentage > 0 ? `drop-shadow(0 0 8px ${COLORS_RAW.teal})` : 'none',
                }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-bold text-navy"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <AnimatedNumber value={progress} />
              </motion.span>
              <span className="text-sm text-rich-black/60 mt-1">Complete</span>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="mt-4 pt-4 border-t border-grey/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                <BookOpen size={16} className="text-teal" />
              </div>
              <div>
                {lessonsCompleted > 0 ? (
                  <>
                    <p className="text-sm font-medium text-navy">
                      {lessonsCompleted} / {totalLessons}
                    </p>
                    <p className="text-xs text-rich-black/50">Lessons</p>
                  </>
                ) : atomsCompleted > 0 ? (
                  <>
                    <p className="text-sm font-medium text-navy">
                      {atomsCompleted} items
                    </p>
                    <p className="text-xs text-rich-black/50">Completed</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-navy">
                      {totalLessons} lessons
                    </p>
                    <p className="text-xs text-rich-black/50">Ready to start</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-success" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-navy line-clamp-1 max-w-[120px]">
                  {moduleTitle}
                </p>
                <p className="text-xs text-rich-black/50">Current</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          {onContinueLearning && (
            <button
              onClick={onContinueLearning}
              className={cn(
                'w-full mt-4 py-3 px-4 rounded-xl',
                'flex items-center justify-center gap-2',
                'bg-teal text-white font-medium',
                'hover:bg-teal/90 active:bg-teal/80',
                'transition-colors duration-150',
              )}
            >
              Continue Learning
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

/**
 * Animated number component
 */
function AnimatedNumber({ value }: { value: import('framer-motion').MotionValue<number> }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const unsubscribe = value.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [value]);

  return <>{displayValue}%</>;
}

export default ProgressRingCard;
