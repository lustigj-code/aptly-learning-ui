'use client';

import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReviewChallengeBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

/**
 * Review Challenge Badge
 *
 * Displayed when an item is injected via FSRS interleaving.
 * Indicates this is a review item to prevent forgetting.
 *
 * Part of Phase 13: Adaptive Interleaving
 */
export function ReviewChallengeBadge({
  className,
  size = 'sm',
  showTooltip = true,
}: ReviewChallengeBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'inline-flex items-center gap-1 bg-purple/10 text-purple rounded-full font-medium',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        className
      )}
      title={showTooltip ? 'Review to keep this skill fresh!' : undefined}
    >
      <RefreshCw className={cn(
        'flex-shrink-0',
        size === 'sm' && 'w-3 h-3',
        size === 'md' && 'w-4 h-4'
      )} />
      <span>Review Challenge</span>
    </motion.span>
  );
}

export default ReviewChallengeBadge;
