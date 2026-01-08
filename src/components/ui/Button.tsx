'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  primary: 'bg-teal text-white hover:bg-teal-dark shadow-md hover:shadow-lg',
  secondary: 'bg-light-teal text-navy hover:bg-muted-teal',
  ghost: 'bg-transparent text-navy hover:bg-light-grey',
  danger: 'bg-error text-white hover:bg-red-700',
  success: 'bg-success text-white hover:bg-green-600',
  celebration: 'bg-yellow text-navy hover:bg-yellow-dark shadow-lg',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-md min-w-[36px]',
  md: 'h-11 px-4 text-base gap-2 rounded-lg min-w-[44px]',  /* 44px touch target */
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg min-w-[48px]',
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

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:shadow-sm', /* Reduced shadow on press */
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.02, y: -2 } : undefined}
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 16 : size === 'lg' || size === 'xl' ? 22 : 18} />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
