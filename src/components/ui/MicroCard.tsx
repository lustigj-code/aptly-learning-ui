'use client';

import { forwardRef, useState, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { SPRING } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';

export interface MicroCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'glass' | 'elevated';
  interactive?: boolean;
  children: React.ReactNode;
}

/**
 * MicroCard - Interactive card with premium hover states
 *
 * Features:
 * - Hover: lift with shadow increase, subtle scale 1.01
 * - Tap (if interactive): scale 0.99
 * - Transition: SPRING.gentle
 * - Respects prefers-reduced-motion
 */
export const MicroCard = forwardRef<HTMLDivElement, MicroCardProps>(
  ({ variant = 'default', interactive = true, className, children, ...props }, ref) => {
    // Initialize with lazy callback to avoid setState in effect
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    // Subscribe to changes only
    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
      <motion.div
        ref={ref}
        whileHover={
          interactive && !prefersReducedMotion
            ? {
                scale: 1.01,
                y: -2,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              }
            : undefined
        }
        whileTap={interactive && !prefersReducedMotion ? { scale: 0.99 } : undefined}
        transition={SPRING.gentle}
        className={cn(
          // Base styles
          'rounded-2xl transition-colors',
          // Variant styles
          variant === 'default' && 'bg-white border border-grey/20 shadow-md',
          variant === 'glass' && 'bg-white/75 backdrop-blur-xl border border-white/20 shadow-lg',
          variant === 'elevated' && 'bg-white shadow-xl',
          // Dark mode support
          variant === 'default' && 'dark:bg-navy-light dark:border-grey/40',
          variant === 'glass' && 'dark:bg-navy-light/75 dark:border-white/10',
          variant === 'elevated' && 'dark:bg-navy-light',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MicroCard.displayName = 'MicroCard';
