'use client';

import { motion } from 'framer-motion';
import { Leaf, Gauge, Target, Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDifficultyLabel, normalizeDifficulty } from '@/lib/adaptive/difficulty';
import type { DifficultyLabel } from '@/lib/adaptive/difficulty';

// ============================================================================
// TYPES
// ============================================================================

interface DifficultyIndicatorProps {
  /** Difficulty value (0-1 normalized, or 1-5 scale, or 0-100 scale) */
  difficulty: number;
  /** Scale of the input difficulty value */
  scale?: '0-1' | '1-5' | '0-100';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show text label */
  showLabel?: boolean;
  /** Show icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Animate on mount */
  animate?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  Leaf: Leaf,
  Gauge: Gauge,
  Target: Target,
  Flame: Flame,
  Trophy: Trophy,
};

// ============================================================================
// SIZE VARIANTS
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 gap-1',
    icon: 12,
    text: 'text-xs',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5',
    icon: 14,
    text: 'text-sm',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    icon: 16,
    text: 'text-base',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DifficultyIndicator - Visual difficulty badge for learning content
 *
 * Displays a colored badge with icon and label indicating content difficulty.
 * Uses the difficulty selector module for consistent labeling.
 *
 * Usage:
 * ```tsx
 * <DifficultyIndicator difficulty={0.5} />
 * <DifficultyIndicator difficulty={3} scale="1-5" size="lg" />
 * <DifficultyIndicator difficulty={75} scale="0-100" showLabel={false} />
 * ```
 */
export function DifficultyIndicator({
  difficulty,
  scale = '0-1',
  size = 'md',
  showLabel = true,
  showIcon = true,
  className,
  animate = true,
}: DifficultyIndicatorProps) {
  // Normalize difficulty to 0-1 scale
  const normalizedDifficulty = normalizeDifficulty(difficulty, scale);

  // Get label configuration
  const labelConfig: DifficultyLabel = getDifficultyLabel(normalizedDifficulty);

  // Get size configuration
  const { container, icon: iconSize, text } = sizeConfig[size];

  // Get icon component
  const IconComponent = iconMap[labelConfig.icon] || Gauge;

  const content = (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        labelConfig.color,
        container,
        text,
        className
      )}
    >
      {showIcon && <IconComponent size={iconSize} />}
      {showLabel && <span>{labelConfig.label}</span>}
    </span>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// ============================================================================
// ADDITIONAL VARIANTS
// ============================================================================

interface DifficultyBarProps {
  /** Difficulty value (0-1) */
  difficulty: number;
  /** Show percentage label */
  showPercentage?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * DifficultyBar - Horizontal bar showing difficulty level
 *
 * Alternative visual representation of difficulty as a filled bar.
 */
export function DifficultyBar({
  difficulty,
  showPercentage = false,
  size = 'md',
  className,
}: DifficultyBarProps) {
  const normalizedDifficulty = Math.max(0, Math.min(1, difficulty));
  const labelConfig = getDifficultyLabel(normalizedDifficulty);

  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

  // Map color classes to fill colors
  const fillColorMap: Record<string, string> = {
    'text-success bg-success/10': 'bg-success',
    'text-teal bg-teal/10': 'bg-teal',
    'text-yellow bg-yellow/10': 'bg-yellow',
    'text-orange bg-orange/10': 'bg-orange',
    'text-error bg-error/10': 'bg-error',
  };

  const fillColor = fillColorMap[labelConfig.color] || 'bg-teal';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-light-grey rounded-full overflow-hidden', barHeight)}>
        <motion.div
          className={cn('h-full rounded-full', fillColor)}
          initial={{ width: 0 }}
          animate={{ width: `${normalizedDifficulty * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-rich-black/60 font-mono">
          {Math.round(normalizedDifficulty * 100)}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface DifficultyDotProps {
  /** Difficulty value (0-1) */
  difficulty: number;
  /** Size of the dot */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DifficultyDot - Minimal dot indicator for difficulty
 *
 * Compact representation showing just a colored dot.
 * Useful for lists or tight spaces.
 */
export function DifficultyDot({
  difficulty,
  size = 'md',
  className,
}: DifficultyDotProps) {
  const normalizedDifficulty = Math.max(0, Math.min(1, difficulty));
  const labelConfig = getDifficultyLabel(normalizedDifficulty);

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Extract background color from the color class
  const bgColorMap: Record<string, string> = {
    'text-success bg-success/10': 'bg-success',
    'text-teal bg-teal/10': 'bg-teal',
    'text-yellow bg-yellow/10': 'bg-yellow',
    'text-orange bg-orange/10': 'bg-orange',
    'text-error bg-error/10': 'bg-error',
  };

  const bgColor = bgColorMap[labelConfig.color] || 'bg-teal';

  return (
    <span
      className={cn('inline-block rounded-full', dotSizes[size], bgColor, className)}
      title={labelConfig.label}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { DifficultyIndicatorProps, DifficultyBarProps, DifficultyDotProps };
