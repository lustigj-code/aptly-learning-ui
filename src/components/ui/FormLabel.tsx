'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FormLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  animated?: boolean;
}

/**
 * FormLabel Component
 *
 * A semantic form label with optional required indicator for accessibility.
 * Integrates with the Input component for consistent form styling.
 *
 * Features:
 * - Red asterisk (*) for required fields with proper aria-label
 * - Optional animation on mount
 * - Consistent typography and spacing
 *
 * @example
 * <FormLabel htmlFor="email" required>Email Address</FormLabel>
 * <Input id="email" type="email" required />
 */
export function FormLabel({
  children,
  htmlFor,
  required = false,
  className,
  animated = true,
}: FormLabelProps) {
  const labelContent = (
    <>
      {children}
      {required && (
        <span className="text-error ml-1" aria-label="required">
          *
        </span>
      )}
    </>
  );

  if (animated) {
    return (
      <motion.label
        htmlFor={htmlFor}
        className={cn(
          'block text-sm font-medium text-navy mb-2',
          className
        )}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {labelContent}
      </motion.label>
    );
  }

  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium text-navy mb-2',
        className
      )}
    >
      {labelContent}
    </label>
  );
}
