'use client';

import { motion } from 'framer-motion';
import { Lock, Award, Flame, Star, Trophy, Target, Zap, BookOpen, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Badge as BadgeType, BadgeRarity } from '@/types';

type BadgeSize = 'sm' | 'md' | 'lg';

type AchievementBadgeProps = {
  badge: BadgeType;
  size?: BadgeSize;
  isEarned?: boolean;
  showLabel?: boolean;
  showGlow?: boolean;
  onClick?: () => void;
  className?: string;
};

const sizeClasses: Record<BadgeSize, { container: string; icon: number; text: string }> = {
  sm: { container: 'w-12 h-12', icon: 20, text: 'text-xs' },
  md: { container: 'w-16 h-16', icon: 28, text: 'text-sm' },
  lg: { container: 'w-24 h-24', icon: 40, text: 'text-base' },
};

const rarityColors: Record<BadgeRarity, { bg: string; border: string; glow: string }> = {
  common: { bg: 'bg-grey', border: 'border-grey', glow: 'shadow-grey/30' },
  uncommon: { bg: 'bg-teal', border: 'border-teal', glow: 'shadow-teal/40' },
  rare: { bg: 'bg-purple', border: 'border-purple', glow: 'shadow-purple/50' },
  legendary: { bg: 'bg-yellow', border: 'border-yellow', glow: 'shadow-yellow/60' },
};

const iconMap: Record<string, typeof Award> = {
  award: Award,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  target: Target,
  zap: Zap,
  book: BookOpen,
  check: CheckCircle,
};

export function AchievementBadge({
  badge,
  size = 'md',
  isEarned = true,
  showLabel = true,
  showGlow = true,
  onClick,
  className,
}: AchievementBadgeProps) {
  const { container, icon: iconSize, text } = sizeClasses[size];
  const { bg, border, glow } = rarityColors[badge.rarity];
  const IconComponent = iconMap[badge.icon] || Award;

  const earned = isEarned && badge.earnedAt;

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-2', className)}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      <motion.div
        className={cn(
          'relative rounded-full flex items-center justify-center border-2 transition-all duration-300',
          container,
          earned ? [bg, border] : 'bg-light-grey border-grey',
          earned && showGlow && 'shadow-lg',
          earned && showGlow && glow,
          onClick && 'cursor-pointer'
        )}
        initial={false}
        animate={earned && showGlow ? { boxShadow: ['0 0 0px rgba(255,222,0,0)', '0 0 20px rgba(255,222,0,0.5)', '0 0 0px rgba(255,222,0,0)'] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        {earned ? (
          <IconComponent
            size={iconSize}
            className={cn(
              badge.rarity === 'legendary' ? 'text-navy' : 'text-white'
            )}
          />
        ) : (
          <Lock size={iconSize} className="text-grey" />
        )}

        {/* Shine effect for legendary */}
        {earned && badge.rarity === 'legendary' && (
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
          </motion.div>
        )}
      </motion.div>

      {showLabel && (
        <div className="text-center">
          <p
            className={cn(
              'font-medium text-navy truncate max-w-[100px]',
              text,
              !earned && 'text-grey'
            )}
          >
            {badge.title}
          </p>
          {size === 'lg' && (
            <p className="text-xs text-rich-black/60 mt-0.5 truncate max-w-[120px]">
              {badge.description}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Simple inline badge for labels/tags
type InlineBadgeProps = {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'teal' | 'yellow';
  size?: 'sm' | 'md';
  className?: string;
};

const inlineVariants = {
  default: 'bg-light-grey text-navy',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
  teal: 'bg-light-teal text-teal-dark',
  yellow: 'bg-yellow/20 text-navy',
};

const inlineSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function InlineBadge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: InlineBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        inlineVariants[variant],
        inlineSizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// XP Badge that shows on earn
type XPBadgeProps = {
  amount: number;
  className?: string;
};

export function XPBadge({ amount, className }: XPBadgeProps) {
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal text-white font-bold text-sm',
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      <Zap size={14} className="text-yellow" />
      +{amount} XP
    </motion.div>
  );
}

// Floating XP animation
type FloatingXPProps = {
  amount: number;
  onComplete?: () => void;
};

export function FloatingXP({ amount, onComplete }: FloatingXPProps) {
  return (
    <motion.div
      className="absolute text-lg font-bold text-teal pointer-events-none"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -40, scale: 1.2 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      +{amount} XP
    </motion.div>
  );
}
