'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg';
type ProgressBarColor = 'teal' | 'yellow' | 'success' | 'navy' | 'gradient';

type ProgressBarProps = {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  color?: ProgressBarColor;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'right' | 'top';
  animated?: boolean;
  shimmer?: boolean;
  className?: string;
};

const sizes: Record<ProgressBarSize, string> = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const colors: Record<ProgressBarColor, string> = {
  teal: 'bg-teal',
  yellow: 'bg-yellow',
  success: 'bg-success',
  navy: 'bg-navy',
  gradient: 'bg-gradient-to-r from-teal to-teal-light',
};

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'teal',
  showLabel = false,
  labelPosition = 'right',
  animated = true,
  shimmer = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  // Use actual percentage for label - Framer Motion handles visual animation
  const label = `${Math.round(percentage)}%`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabel && labelPosition === 'top' && (
        <div className="w-full mb-1">
          <span className="text-sm font-medium text-navy">{label}</span>
        </div>
      )}

      <div
        className={cn(
          'flex-1 bg-light-grey rounded-full overflow-hidden relative',
          sizes[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Progress: ${label}`}
      >
        <motion.div
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            colors[color],
            percentage === 100 && 'shadow-[0_0_8px_rgba(33,168,176,0.5)]' /* Glow on completion */
          )}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            mass: 1,
          }}
        >
          {/* Shimmer effect - shown when prop is true OR at 100% completion */}
          {(shimmer || percentage === 100) && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                repeat: Infinity,
                duration: percentage === 100 ? 1 : 1.5,
                ease: 'linear',
              }}
            />
          )}
        </motion.div>
      </div>

      {showLabel && labelPosition === 'right' && (
        <span className="text-sm font-semibold text-navy min-w-[40px]">{label}</span>
      )}

      {showLabel && labelPosition === 'inside' && size === 'lg' && (
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference"
          initial={{ opacity: 0 }}
          animate={{ opacity: percentage > 10 ? 1 : 0 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

// Circular Progress variant
type CircularProgressProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: ProgressBarColor;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
};

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'teal',
  showLabel = true,
  animated = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap: Record<ProgressBarColor, string> = {
    teal: '#21A8B0',
    yellow: '#FFDE00',
    success: '#88B644',
    navy: '#0A004A',
    gradient: '#21A8B0',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E6E6E6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            mass: 1,
          }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-lg font-bold text-navy"
            initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        </div>
      )}
    </div>
  );
}
