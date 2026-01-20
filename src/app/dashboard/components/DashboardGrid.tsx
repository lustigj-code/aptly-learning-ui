/**
 * Bento Grid Dashboard Container
 *
 * Responsive grid layout for dashboard cards.
 * Desktop: 3-column asymmetric bento grid
 * Mobile: Single column stack
 */

'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING } from '@/lib/motion/springs';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main bento grid container
 *
 * Layout (Desktop):
 * ┌─────────────────┬─────────┬─────────┐
 * │                 │         │         │
 * │  Progress Ring  │ Velocity│ Review  │
 * │     (2x2)       │  (1x1)  │ Queue   │
 * │                 │         │  (1x2)  │
 * ├─────────────────┼─────────┤         │
 * │                 │         │         │
 * │ Skill Spotlight │ [empty] │         │
 * │     (2x1)       │         │         │
 * └─────────────────┴─────────┴─────────┘
 * ┌─────────────────────────────────────┐
 * │         Activity Heatmap (3x1)      │
 * └─────────────────────────────────────┘
 */
export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={cn(
        // Base grid
        'grid gap-4 md:gap-6',
        // Mobile: single column
        'grid-cols-1',
        // Desktop: 3-column bento grid
        'lg:grid-cols-3',
        // Auto-placement with dense packing
        'auto-rows-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Bento card wrapper with glassmorphism
 */
interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: '1x1' | '1x2' | '2x1' | '2x2' | '3x1';
  delay?: number;
}

export function BentoCard({ children, className, span = '1x1', delay = 0 }: BentoCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Grid span classes with minimum heights for better visual balance
  const spanClasses = {
    '1x1': 'min-h-[160px] lg:min-h-[180px]',
    '1x2': 'lg:row-span-2 min-h-[200px]',
    '2x1': 'lg:col-span-2 min-h-[140px] lg:min-h-[160px]',
    '2x2': 'lg:col-span-2 lg:row-span-2 min-h-[320px] lg:min-h-[380px]',
    '3x1': 'lg:col-span-3 min-h-[140px] lg:min-h-[160px]',
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING.card, delay }}
      className={cn(
        // Base card styles
        'rounded-2xl p-5 md:p-6',
        // Glassmorphism 2.0 - "Living Material"
        'backdrop-blur-xl bg-white/75',
        'border border-white/15',
        // Multi-layer shadow for depth
        'shadow-[0px_4px_8px_rgba(0,0,0,0.04),0px_20px_40px_rgba(0,0,0,0.12)]',
        // Hover state
        'transition-all duration-300',
        'hover:bg-white/85',
        'hover:shadow-[0px_8px_16px_rgba(0,0,0,0.06),0px_24px_48px_rgba(0,0,0,0.14)]',
        // Grid span
        spanClasses[span],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Skeleton loader for bento cards
 */
interface BentoSkeletonProps {
  span?: '1x1' | '1x2' | '2x1' | '2x2' | '3x1';
}

export function BentoSkeleton({ span = '1x1' }: BentoSkeletonProps) {
  const spanClasses = {
    '1x1': 'h-40',
    '1x2': 'lg:row-span-2 h-40 lg:h-auto',
    '2x1': 'lg:col-span-2 h-32',
    '2x2': 'lg:col-span-2 lg:row-span-2 h-64 lg:h-auto',
    '3x1': 'lg:col-span-3 h-32',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-6',
        'bg-grey/10 animate-pulse',
        spanClasses[span]
      )}
    >
      <div className="space-y-3">
        <div className="h-4 bg-grey/20 rounded w-1/3" />
        <div className="h-8 bg-grey/20 rounded w-2/3" />
        <div className="h-4 bg-grey/20 rounded w-1/2" />
      </div>
    </div>
  );
}

/**
 * Full dashboard skeleton during loading
 */
export function DashboardGridSkeleton() {
  return (
    <DashboardGrid>
      <BentoSkeleton span="2x2" />
      <BentoSkeleton span="1x1" />
      <BentoSkeleton span="1x2" />
      <BentoSkeleton span="2x1" />
      <BentoSkeleton span="3x1" />
    </DashboardGrid>
  );
}

export default DashboardGrid;
