'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'glass' | 'gradient';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type CardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  animated?: boolean;
  children: React.ReactNode;
} & (HTMLMotionProps<'div'> | HTMLAttributes<HTMLDivElement>);

const variants: Record<CardVariant, string> = {
  default: 'bg-white rounded-xl',
  elevated: 'bg-white rounded-xl shadow-md',
  outlined: 'bg-white rounded-xl border border-grey',
  interactive: 'bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200',
  glass: 'glass rounded-xl border border-white/20',
  gradient: 'bg-gradient-light rounded-xl',
};

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', animated = false, children, className, ...props }, ref) => {
    if (animated || variant === 'interactive') {
      return (
        <motion.div
          ref={ref}
          className={cn(variants[variant], paddings[padding], className)}
          whileHover={
            variant === 'interactive'
              ? { scale: 1.01, y: -4, boxShadow: '0 12px 40px rgba(10, 0, 74, 0.16)' }
              : undefined
          }
          whileTap={variant === 'interactive' ? { scale: 0.99 } : undefined}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
