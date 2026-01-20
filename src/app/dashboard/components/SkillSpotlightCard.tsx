/**
 * Skill Spotlight Card
 *
 * 2x1 bento card showing strongest skill and focus area
 * with mastery percentages and action buttons.
 */

'use client';

import { motion } from 'framer-motion';
import { Star, Target, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS_RAW, STATUS_COLORS } from '@/lib/design-tokens';
import { BentoCard } from './DashboardGrid';
import type { SkillInfo } from '../types';

interface SkillSpotlightCardProps {
  strongest: SkillInfo;
  focusArea: SkillInfo;
  onPractice?: (skillName: string) => void;
  className?: string;
}

export function SkillSpotlightCard({
  strongest,
  focusArea,
  onPractice,
  className,
}: SkillSpotlightCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <BentoCard span="2x1" delay={0.15} className={className}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <p className="text-sm font-medium text-rich-black/60 mb-3">
          Skill Spotlight
        </p>

        {/* Two skill cards side by side */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {/* Strongest Skill */}
          <SkillMiniCard
            icon={<Star size={16} />}
            label="Strongest"
            skill={strongest}
            color="success"
            delay={prefersReducedMotion ? 0 : 0.2}
            onAction={onPractice ? () => onPractice(strongest.name) : undefined}
          />

          {/* Focus Area */}
          <SkillMiniCard
            icon={<Target size={16} />}
            label="Focus Area"
            skill={focusArea}
            color="warning"
            delay={prefersReducedMotion ? 0 : 0.25}
            onAction={onPractice ? () => onPractice(focusArea.name) : undefined}
            actionLabel="Practice"
          />
        </div>
      </div>
    </BentoCard>
  );
}

interface SkillMiniCardProps {
  icon: React.ReactNode;
  label: string;
  skill: SkillInfo;
  color: 'success' | 'warning';
  delay?: number;
  onAction?: () => void;
  actionLabel?: string;
}

function SkillMiniCard({
  icon,
  label,
  skill,
  color,
  delay = 0,
  onAction,
  actionLabel,
}: SkillMiniCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const colorMap = {
    success: {
      bg: 'bg-success/10',
      ring: COLORS_RAW.success,
      text: 'text-success-dark',
      progress: STATUS_COLORS.mastered.progress,
    },
    warning: {
      bg: 'bg-warning/10',
      ring: COLORS_RAW.warning,
      text: 'text-warning',
      progress: STATUS_COLORS.active.progress,
    },
  };

  const colors = colorMap[color];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
      className={cn(
        'rounded-xl p-3 flex flex-col',
        colors.bg,
        'border border-white/20'
      )}
    >
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-md bg-white/50', colors.text)}>
          {icon}
        </div>
        <span className="text-xs font-medium text-rich-black/60 uppercase tracking-wide">
          {label}
        </span>
      </div>

      {/* Skill name */}
      <h4 className="font-semibold text-navy text-sm line-clamp-1 mb-1">
        {skill.name}
      </h4>

      {/* Mastery bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: colors.progress }}
            initial={{ width: 0 }}
            animate={{ width: `${skill.mastery}%` }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { delay: delay + 0.1, duration: 0.6 }
            }
          />
        </div>
        <span className={cn('text-xs font-semibold', colors.text)}>
          {skill.mastery}%
        </span>
      </div>

      {/* Reason/hint */}
      <p className="text-xs text-rich-black/50 line-clamp-2 flex-1">
        {skill.reason}
      </p>

      {/* Action button */}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className={cn(
            'mt-2 flex items-center justify-center gap-1',
            'text-xs font-medium py-1.5 rounded-md',
            'bg-white/50 hover:bg-white/80 transition-colors',
            colors.text
          )}
        >
          {actionLabel}
          <ArrowRight size={12} />
        </button>
      )}
    </motion.div>
  );
}

export default SkillSpotlightCard;
