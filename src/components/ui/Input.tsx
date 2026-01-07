'use client';

import { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: InputSize;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>;

const sizes: Record<InputSize, string> = {
  sm: 'h-9 text-sm px-3',
  md: 'h-11 text-base px-4',
  lg: 'h-14 text-lg px-5',
};

const iconSizes: Record<InputSize, number> = {
  sm: 16,
  md: 18,
  lg: 22,
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      type = 'text',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const iconSize = iconSizes[inputSize];

    return (
      <div className="w-full">
        {label && (
          <motion.label
            className="block text-sm font-medium text-navy mb-1.5"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-grey pointer-events-none',
                error && 'text-error'
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border bg-white transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal',
              'placeholder:text-grey',
              sizes[inputSize],
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              error
                ? 'border-error focus:ring-error/30 focus:border-error'
                : 'border-grey hover:border-muted-teal',
              disabled && 'bg-light-grey cursor-not-allowed opacity-60',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey hover:text-navy transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
            </button>
          )}

          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              className="mt-1.5 text-sm text-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.p>
          )}

          {hint && !error && (
            <motion.p
              className="mt-1.5 text-sm text-rich-black/60"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, type InputProps, type InputSize };
