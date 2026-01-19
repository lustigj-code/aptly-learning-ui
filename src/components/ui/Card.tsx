'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion/springs';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'glass' | 'gradient' | 'ghost';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type CardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  animated?: boolean;
  hoverable?: boolean;
  children: React.ReactNode;
} & (HTMLMotionProps<'div'> | HTMLAttributes<HTMLDivElement>);

const variants: Record<CardVariant, string> = {
  // Default - Clean foundation with subtle shadow
  default: 'bg-white rounded-2xl shadow-[0_1px_3px_rgba(10,0,74,0.04),0_1px_2px_rgba(10,0,74,0.06)]',

  // Elevated - Medium depth with layered shadows for prominence
  elevated: 'bg-white rounded-2xl shadow-[0_4px_6px_-1px_rgba(10,0,74,0.06),0_2px_4px_-2px_rgba(10,0,74,0.04),0_0_0_1px_rgba(10,0,74,0.02)]',

  // Outlined - Subtle border with refined hover state
  outlined: 'bg-white rounded-2xl border border-grey/40 hover:border-muted-teal/60 hover:shadow-[0_1px_3px_rgba(33,168,176,0.08)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',

  // Interactive - Card with hover lift and enhanced shadow
  interactive: 'bg-white rounded-2xl shadow-[0_2px_4px_rgba(10,0,74,0.04),0_1px_2px_rgba(10,0,74,0.03)] border border-transparent hover:border-teal/10 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal/50 focus-visible:ring-offset-2',

  // Glass - Frosted glass effect with backdrop blur
  glass: 'backdrop-blur-xl bg-white/70 rounded-2xl border border-white/40 shadow-[0_8px_32px_rgba(10,0,74,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',

  // Gradient - Subtle gradient background
  gradient: 'bg-gradient-light rounded-2xl shadow-[0_2px_8px_rgba(10,0,74,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',

  // Ghost - Minimal variant for subtle separation
  ghost: 'bg-light-grey/30 rounded-2xl hover:bg-light-grey/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 focus-visible:ring-offset-1',
};

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', animated = false, hoverable = false, children, className, ...props }, ref) => {
    const isInteractive = variant === 'interactive' || hoverable;

    if (animated || isInteractive) {
      // Enhanced hover states for interactive cards
      const hoverState = isInteractive
        ? {
            y: -2,
            scale: 1.005,
            boxShadow: '0 12px 32px rgba(33, 168, 176, 0.12), 0 4px 8px rgba(10, 0, 74, 0.06)',
          }
        : undefined;

      const tapState = isInteractive ? { scale: 0.995, y: 0 } : undefined;

      return (
        <motion.div
          ref={ref}
          className={cn(variants[variant], paddings[padding], className)}
          whileHover={hoverState}
          whileTap={tapState}
          transition={SPRING.gentle}
          tabIndex={isInteractive ? 0 : undefined}
          role={isInteractive ? 'button' : undefined}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(variants[variant], paddings[padding], className)}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        {...(props as HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
type CardHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

const CardHeader = ({ children, className }: CardHeaderProps) => (
  <div className={cn('mb-4', className)}>{children}</div>
);

// Card Title component
type CardTitleProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

const CardTitle = ({ children, className, as: Component = 'h3' }: CardTitleProps) => (
  <Component className={cn('font-semibold text-navy', className)}>{children}</Component>
);

// Card Description component
type CardDescriptionProps = {
  children: React.ReactNode;
  className?: string;
};

const CardDescription = ({ children, className }: CardDescriptionProps) => (
  <p className={cn('text-sm text-rich-black/70 mt-1', className)}>{children}</p>
);

// Card Content component
type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

const CardContent = ({ children, className }: CardContentProps) => (
  <div className={cn('', className)}>{children}</div>
);

// Card Footer component
type CardFooterProps = {
  children: React.ReactNode;
  className?: string;
};

const CardFooter = ({ children, className }: CardFooterProps) => (
  <div className={cn('mt-4 pt-4 border-t border-light-grey', className)}>{children}</div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps, CardVariant, CardPadding };
