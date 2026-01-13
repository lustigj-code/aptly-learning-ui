'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type TimingFeedbackProps = {
  scheduledTime: Date | string | null;
  actualTime?: Date;
  className?: string;
};

type TimingStatus = 'perfect' | 'early' | 'late';

// ============================================
// TIMING FEEDBACK COMPONENT
// ============================================

/**
 * Shows feedback about review timing relative to optimal schedule
 * - Within 2h of scheduled: Perfect timing (green)
 * - Before scheduled: Early review (blue)
 * - After scheduled: Overdue (yellow/orange)
 */
export function TimingFeedback({
  scheduledTime,
  actualTime = new Date(),
  className,
}: TimingFeedbackProps) {
  const { status, message, hoursOverdue, hoursEarly } = useMemo(() => {
    if (!scheduledTime) {
      return {
        status: 'perfect' as TimingStatus,
        message: 'First review - great start!',
        hoursOverdue: 0,
        hoursEarly: 0,
      };
    }

    const scheduled = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
    const diffMs = actualTime.getTime() - scheduled.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Within 2 hours of scheduled time - perfect
    if (Math.abs(diffHours) <= 2) {
      return {
        status: 'perfect' as TimingStatus,
        message: 'Perfect timing! Optimal for retention',
        hoursOverdue: 0,
        hoursEarly: 0,
      };
    }

    // Before scheduled time - early
    if (diffHours < 0) {
      const hoursEarly = Math.abs(diffHours);
      return {
        status: 'early' as TimingStatus,
        message: 'A bit early, but good to practice!',
        hoursOverdue: 0,
        hoursEarly,
      };
    }

    // After scheduled time - late/overdue
    const hoursOverdue = diffHours;
    const daysOverdue = Math.floor(hoursOverdue / 24);

    let overdueMessage: string;
    if (daysOverdue >= 1) {
      overdueMessage = `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue - let's strengthen this memory`;
    } else {
      overdueMessage = `${Math.round(hoursOverdue)} hours overdue - let's strengthen this memory`;
    }

    return {
      status: 'late' as TimingStatus,
      message: overdueMessage,
      hoursOverdue,
      hoursEarly: 0,
    };
  }, [scheduledTime, actualTime]);

  const statusConfig = {
    perfect: {
      icon: CheckCircle,
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      textColor: 'text-success',
      iconColor: 'text-success',
    },
    early: {
      icon: Info,
      bgColor: 'bg-teal/10',
      borderColor: 'border-teal/30',
      textColor: 'text-teal',
      iconColor: 'text-teal',
    },
    late: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow/10',
      borderColor: 'border-yellow/30',
      textColor: 'text-yellow-dark',
      iconColor: 'text-yellow',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon size={16} className={config.iconColor} />
      <span className={cn('text-sm font-medium', config.textColor)}>
        {message}
      </span>
    </motion.div>
  );
}

// ============================================
// COMPACT TIMING BADGE
// ============================================

type TimingBadgeProps = {
  scheduledTime: Date | string | null;
  actualTime?: Date;
  className?: string;
};

/**
 * Compact badge version for inline display
 */
export function TimingBadge({
  scheduledTime,
  actualTime = new Date(),
  className,
}: TimingBadgeProps) {
  const status = useMemo(() => {
    if (!scheduledTime) return 'new';

    const scheduled = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
    const diffMs = actualTime.getTime() - scheduled.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (Math.abs(diffHours) <= 2) return 'on-time';
    if (diffHours < 0) return 'early';
    return 'overdue';
  }, [scheduledTime, actualTime]);

  const badgeConfig = {
    'new': { label: 'New', color: 'bg-purple/10 text-purple' },
    'on-time': { label: 'On time', color: 'bg-success/10 text-success' },
    'early': { label: 'Early', color: 'bg-teal/10 text-teal' },
    'overdue': { label: 'Overdue', color: 'bg-yellow/10 text-yellow-dark' },
  };

  const config = badgeConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      <Clock size={10} className="mr-1" />
      {config.label}
    </span>
  );
}
