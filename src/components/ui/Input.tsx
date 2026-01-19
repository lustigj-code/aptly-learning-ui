'use client';

import { forwardRef, type InputHTMLAttributes, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** @deprecated Use `size` instead */
  inputSize?: InputSize;
  size?: InputSize;
  showValidationIcon?: boolean;
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

const iconContainerSizes: Record<InputSize, string> = {
  sm: 'w-9',
  md: 'w-11',
  lg: 'w-14',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      size,
      inputSize,
      type = 'text',
      className,
      disabled,
      showValidationIcon = true,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const uniqueId = useId();
    const inputId = props.id || `input-${uniqueId}`;

    // Support both `size` and deprecated `inputSize` prop
    const resolvedSize = size ?? inputSize ?? 'md';

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const iconSize = iconSizes[resolvedSize];

    // Determine if we should show validation icons
    const showErrorIcon = error && showValidationIcon;
    const showSuccessIcon = success && showValidationIcon && !error;

    // Calculate padding based on icons
    const hasLeftIcon = !!leftIcon;
    const hasRightContent = isPassword || rightIcon || showErrorIcon || showSuccessIcon;

    return (
      <div className="w-full">
        {label && (
          <motion.label
            htmlFor={inputId}
            className="block text-sm font-medium text-navy mb-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-label="required">
                *
              </span>
            )}
          </motion.label>
        )}

        <div className="relative group">
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none',
                'transition-colors duration-150',
                iconContainerSizes[resolvedSize],
                error
                  ? 'text-error'
                  : isFocused
                  ? 'text-teal'
                  : 'text-grey group-hover:text-muted-teal'
              )}
            >
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : hint
                ? `${inputId}-hint`
                : undefined
            }
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white',
              'transition-all duration-150 ease-out',
              'focus:outline-none',
              'placeholder:text-grey placeholder:transition-opacity placeholder:duration-150',
              'focus:placeholder:opacity-60',

              // Typography
              sizes[resolvedSize],

              // Padding for icons
              hasLeftIcon && 'pl-11',
              hasRightContent && resolvedSize === 'sm' && 'pr-20',
              hasRightContent && resolvedSize === 'md' && 'pr-24',
              hasRightContent && resolvedSize === 'lg' && 'pr-28',

              // Touch targets (minimum 44px height on mobile)
              'min-h-[44px] sm:min-h-0',

              // State-based styles
              error
                ? [
                    'border-error',
                    'focus:border-error',
                    'focus:ring-2 focus:ring-error/20',
                    'shadow-sm shadow-error/5',
                  ]
                : success
                ? [
                    'border-success',
                    'focus:border-success',
                    'focus:ring-2 focus:ring-success/20',
                    'shadow-sm shadow-success/5',
                  ]
                : [
                    'border-grey/40',
                    'hover:border-muted-teal',
                    'focus:border-teal',
                    'focus:ring-2 focus:ring-teal/20',
                    'shadow-sm shadow-navy/5',
                    'hover:shadow-md hover:shadow-navy/5',
                  ],

              // Disabled state
              disabled && [
                'bg-light-grey',
                'cursor-not-allowed',
                'opacity-60',
                'hover:border-grey/40',
                'hover:shadow-sm',
              ],

              className
            )}
            {...props}
          />

          {/* Right Icons Container */}
          <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-3">
            {/* Validation Icons */}
            <AnimatePresence mode="wait">
              {showErrorIcon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="text-error"
                  aria-hidden="true"
                >
                  <AlertCircle size={iconSize} />
                </motion.div>
              )}

              {showSuccessIcon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="text-success"
                  aria-hidden="true"
                >
                  <CheckCircle2 size={iconSize} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password Toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'touch-target flex items-center justify-center',
                  'text-grey hover:text-navy',
                  'transition-colors duration-150',
                  'focus:outline-none focus-visible:text-teal',
                  'rounded-md p-2 -m-2',
                  'active:scale-95 transition-transform'
                )}
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
              </button>
            )}

            {/* Custom Right Icon */}
            {rightIcon && !isPassword && (
              <div className="text-grey pointer-events-none" aria-hidden="true">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Error/Hint Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <p
                id={`${inputId}-error`}
                role="alert"
                className="mt-2 text-sm text-error flex items-start gap-1.5"
              >
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </p>
            </motion.div>
          )}

          {hint && !error && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <p
                id={`${inputId}-hint`}
                className="mt-2 text-sm text-rich-black/60"
              >
                {hint}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, type InputProps, type InputSize };
