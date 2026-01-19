'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion/springs';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'celebration';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
} & Omit<HTMLMotionProps<'button'>, 'children'>;

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-dark shadow-md hover:shadow-hover active:shadow-active',
  secondary: 'bg-light-teal text-navy hover:bg-muted-teal shadow-sm hover:shadow-md active:shadow-sm',
  ghost: 'bg-transparent text-navy hover:bg-light-teal/50 active:bg-light-teal/70',
  danger: 'bg-error text-white hover:bg-red-700 shadow-md hover:shadow-lg active:shadow-sm',
  success: 'bg-success text-white hover:bg-green-600 shadow-md hover:shadow-lg active:shadow-sm',
  celebration: 'bg-yellow text-navy hover:bg-yellow-dark shadow-lg hover:shadow-xl active:shadow-md',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5 rounded-lg min-w-[44px]',  /* 44px touch target (WCAG) */
  md: 'h-11 px-5 text-base gap-2 rounded-lg min-w-[44px]',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl min-w-[48px]',
  xl: 'h-14 px-8 text-lg gap-3 rounded-xl min-w-[56px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading = false,
      isDisabled = false,
      fullWidth = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const disabled = isDisabled || isLoading;
    const prefersReducedMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center font-medium',
          'transition-all duration-200 ease-out',

          // Focus ring - beautiful, accessible, brand-matched
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
          'focus-visible:ring-offset-white',

          // Disabled state - reduced opacity with no pointer events
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',

          // Loading state - subtle pulse animation
          isLoading && 'animate-pulse',

          // Variant and size classes
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled}
        aria-busy={isLoading}
        aria-disabled={disabled}

        // Micro-interactions - Stripe-level polish with shadow elevation
        // Scale + lift on hover, scale down + shadow deepen on press
        whileHover={
          !disabled && !prefersReducedMotion
            ? {
                scale: 1.02,
                y: -2,
                boxShadow: '0 8px 24px rgba(33, 168, 176, 0.15)',
              }
            : undefined
        }
        whileTap={
          !disabled && !prefersReducedMotion
            ? {
                scale: 0.95,
                y: 0,
                boxShadow: '0 2px 8px rgba(10, 0, 74, 0.15)',
              }
            : undefined
        }
        transition={SPRING.micro}
        {...props}
      >
        {isLoading ? (
          <Loader2
            className="animate-spin"
            size={size === 'sm' ? 16 : size === 'lg' || size === 'xl' ? 20 : 18}
          />
        ) : (
          leftIcon
        )}
        <span className="relative">{children}</span>
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
