'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock,
  Calendar,
  CheckCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { TimingTrigger, TimingTriggerType, TimingPriority } from '@/lib/coach/optimalTiming';

// ============================================
// TYPES
// ============================================

type TimingPromptProps = {
  trigger: TimingTrigger | null;
  onAction?: (action: string | undefined) => void;
  onDismiss: () => void;
  className?: string;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get icon for trigger type
 */
function getTriggerIcon(type: TimingTriggerType) {
  switch (type) {
    case 'mastery_milestone':
      return <Trophy size={18} className="text-white" />;
    case 'session_transition':
      return <ArrowRight size={18} className="text-white" />;
    case 'difficult_content_prep':
      return <BookOpen size={18} className="text-white" />;
    case 'review_optimal_time':
      return <Clock size={18} className="text-white" />;
    case 'daily_check_in':
      return <Calendar size={18} className="text-white" />;
    case 'session_recap':
      return <CheckCircle size={18} className="text-white" />;
    default:
      return <Sparkles size={18} className="text-white" />;
  }
}

/**
 * Get styles based on priority and type
 */
function getStyles(priority: TimingPriority, type: TimingTriggerType): {
  iconBg: string;
  headerBg: string;
  borderColor: string;
} {
  // Milestone celebrations get special treatment
  if (type === 'mastery_milestone') {
    return {
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
      headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100/50',
      borderColor: 'border-amber-200',
    };
  }

  // Session completion
  if (type === 'session_recap' || (type === 'session_transition' && priority === 'high')) {
    return {
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      headerBg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
    };
  }

  // Difficult content prep (warning-ish)
  if (type === 'difficult_content_prep') {
    return {
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
    };
  }

  // High priority
  if (priority === 'high') {
    return {
      iconBg: 'bg-gradient-to-br from-teal to-teal-dark',
      headerBg: 'bg-gradient-to-r from-teal-50 to-cyan-50',
      borderColor: 'border-teal/30',
    };
  }

  // Medium/Low priority (default)
  return {
    iconBg: 'bg-gradient-to-br from-teal to-teal-dark',
    headerBg: 'bg-light-teal/30',
    borderColor: 'border-teal/20',
  };
}

// ============================================
// COMPONENT
// ============================================

export function TimingPrompt({
  trigger,
  onAction,
  onDismiss,
  className,
}: TimingPromptProps) {
  if (!trigger) return null;

  const { type, priority, message, context } = trigger;
  const styles = getStyles(priority, type);

  const handleAction = () => {
    onAction?.(message.action);
    onDismiss();
  };

  // Special rendering for milestone achievements
  const isMilestone = type === 'mastery_milestone';
  const milestone = context?.milestone as number | undefined;

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed bottom-24 right-4 z-20 max-w-sm',
          className
        )}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className={cn(
          'bg-white rounded-2xl shadow-xl border overflow-hidden',
          styles.borderColor
        )}>
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 border-b',
            styles.headerBg,
            styles.borderColor
          )}>
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
                styles.iconBg
              )}>
                {getTriggerIcon(type)}
              </div>

              {/* Title */}
              <div>
                <h4 className="font-semibold text-navy text-sm">
                  {message.title}
                </h4>
                {/* Show milestone badge for mastery achievements */}
                {isMilestone && milestone && (
                  <span className="text-xs font-medium text-amber-600">
                    {Math.round(milestone * 100)}% Mastery
                  </span>
                )}
              </div>
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-grey/10 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} className="text-rich-black/50" />
            </button>
          </div>

          {/* Sage Avatar + Message */}
          <div className="px-4 py-4 flex gap-3">
            {/* Sage Avatar */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-md">
                <span className="text-lg">&#129417;</span> {/* Owl emoji */}
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0">
              <p className="text-rich-black/80 text-sm leading-relaxed">
                {message.body}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {message.actionLabel && (
            <div className="px-4 pb-4 pt-1 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                rightIcon={<ArrowRight size={14} />}
                onClick={handleAction}
                className="text-sm"
              >
                {message.actionLabel}
              </Button>
            </div>
          )}

          {/* Confetti overlay for high-priority milestones */}
          {isMilestone && milestone && milestone >= 0.90 && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Sparkle effects */}
              <motion.div
                className="absolute top-2 left-4 text-amber-400"
                animate={{
                  y: [0, -5, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles size={12} />
              </motion.div>
              <motion.div
                className="absolute top-4 right-12 text-amber-300"
                animate={{
                  y: [0, -3, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
              >
                <Sparkles size={10} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TimingPrompt;
