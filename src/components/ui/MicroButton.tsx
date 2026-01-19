'use client';

import { forwardRef, useState, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { SPRING } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';

export interface MicroButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * MicroButton - Premium button with micro-interactions
 *
 * Features:
 * - Hover: scale 1.02, subtle glow
 * - Tap: scale 0.98 (press down feel)
 * - Focus: ring outline
 * - Transition: SPRING.micro (500/35/0.5)
 * - Respects prefers-reduced-motion
 */
export const MicroButton = forwardRef<HTMLButtonElement, MicroButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
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
      <motion.button
        ref={ref}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        transition={SPRING.micro}
        className={cn(
          // Base styles
          'font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Variant styles
          variant === 'primary' && 'bg-teal text-white hover:bg-teal-dark focus:ring-teal',
          variant === 'secondary' && 'bg-light-grey text-navy hover:bg-grey/50 focus:ring-grey',
          variant === 'ghost' && 'bg-transparent text-navy hover:bg-light-grey focus:ring-grey',
          // Size styles
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-base',
          size === 'lg' && 'px-6 py-3 text-lg',
          // Dark mode support
          variant === 'primary' && 'dark:bg-teal-light dark:text-navy dark:hover:bg-teal',
          variant === 'secondary' && 'dark:bg-navy-light dark:text-white dark:hover:bg-navy',
          variant === 'ghost' && 'dark:text-white dark:hover:bg-navy-light',
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MicroButton.displayName = 'MicroButton';
