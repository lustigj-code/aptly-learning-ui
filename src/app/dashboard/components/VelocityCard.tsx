/**
 * Velocity Card
 *
 * 1x1 bento card showing learning pace trend
 * and predicted completion time.
 */

'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS_RAW } from '@/lib/design-tokens';
import { BentoCard } from './DashboardGrid';

interface VelocityCardProps {
  trend: 'increasing' | 'stable' | 'decreasing';
  daysRemaining: number;
  confidence: number;
  className?: string;
}

export function VelocityCard({
  trend,
  daysRemaining,
  confidence,
  className,
}: VelocityCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const trendConfig = {
    increasing: {
      icon: TrendingUp,
      label: 'Accelerating',
      color: 'text-success',
      bgColor: 'bg-success/10',
      arrowColor: COLORS_RAW.success,
    },
    stable: {
      icon: Minus,
      label: 'Steady',
      color: 'text-teal',
      bgColor: 'bg-teal/10',
      arrowColor: COLORS_RAW.teal,
    },
    decreasing: {
      icon: TrendingDown,
      label: 'Slowing',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      arrowColor: COLORS_RAW.warning,
    },
  };

  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  // Format days remaining
  const formatDays = (days: number): string => {
    if (days <= 0) return 'Almost done!';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) {
      const weeks = Math.round(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  // Confidence indicator dots
  const confidenceLevel = Math.ceil(confidence / 25); // 1-4 dots

  return (
    <BentoCard span="1x1" delay={0.1} className={className}>
      <div className="flex flex-col h-full">
        {/* Header with trend icon */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-rich-black/60">Velocity</p>
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className={cn('p-2 rounded-lg', config.bgColor)}
          >
            <TrendIcon size={18} className={config.color} />
          </motion.div>
        </div>

        {/* Trend label */}
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn('text-sm font-semibold mb-1', config.color)}
        >
          {config.label}
        </motion.p>

        {/* Completion prediction */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-rich-black/40" />
            <span className="text-xs text-rich-black/50">Est. completion</span>
          </div>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-xl font-bold text-navy"
          >
            {formatDays(daysRemaining)}
          </motion.p>
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <span className="text-xs text-rich-black/40">Confidence</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <motion.div
                key={level}
                initial={prefersReducedMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + level * 0.05 }}
                className={cn(
                  'w-2 h-2 rounded-full',
                  level <= confidenceLevel ? 'bg-teal' : 'bg-grey/30'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

export default VelocityCard;
