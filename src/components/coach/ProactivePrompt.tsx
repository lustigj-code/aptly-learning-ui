'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ArrowRight, AlertCircle, BookOpen, Coffee, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ProactivePrompt as ProactivePromptType, Intervention } from '@/hooks/useProactiveCoach';
import type { StruggleState, InterventionType as StruggleInterventionType } from '@/lib/coach/struggleDetector';
import {
  getInterventionMessage,
  getInterventionAction,
} from '@/lib/coach/struggleDetector';

type ProactivePromptProps = {
  prompt: ProactivePromptType | null;
  onDismiss: () => void;
  onAction?: (action: string) => void;
  onInterventionAccept?: (intervention: Intervention) => void;
  className?: string;
};

type StrugglePromptProps = {
  struggleState: StruggleState | null;
  onAccept: (intervention: StruggleInterventionType) => void;
  onDismiss: () => void;
  className?: string;
  showDelay?: number; // Delay in ms before showing (default 2000)
};

// Get appropriate icon for intervention type
function getInterventionIcon(intervention?: Intervention) {
  if (!intervention) return <MessageCircle size={16} className="text-white" />;

  switch (intervention.type) {
    case 'alternative_explanation':
    case 'prerequisite_review':
      return <BookOpen size={16} className="text-white" />;
    case 'break_suggestion':
      return <Coffee size={16} className="text-white" />;
    case 'coach_session':
      return <MessageCircle size={16} className="text-white" />;
    default:
      return <AlertCircle size={16} className="text-white" />;
  }
}

// Get icon for struggle-based intervention
function getStruggleInterventionIcon(intervention: StruggleInterventionType) {
  switch (intervention) {
    case 'hint':
      return <Lightbulb size={16} className="text-white" />;
    case 'alternative_explanation':
    case 'prerequisite_review':
      return <BookOpen size={16} className="text-white" />;
    case 'simpler_practice':
      return <RefreshCw size={16} className="text-white" />;
    case 'break_suggestion':
      return <Coffee size={16} className="text-white" />;
    case 'coach_session':
      return <MessageCircle size={16} className="text-white" />;
    case 'engagement_prompt':
      return <AlertCircle size={16} className="text-white" />;
    default:
      return <MessageCircle size={16} className="text-white" />;
  }
}

// Get background color based on intervention severity
function getHeaderStyle(prompt: ProactivePromptType) {
  if (prompt.intervention) {
    // More urgent interventions get warmer colors
    const severity = prompt.trigger === 'struggle_detected' ? 'moderate' : 'mild';
    if (severity === 'moderate') {
      return 'bg-amber-100 border-b border-amber-200';
    }
  }
  return 'bg-light-teal/30 border-b border-teal/20';
}

// Get header style for struggle prompt
function getStruggleHeaderStyle(severity: StruggleState['overallSeverity']) {
  switch (severity) {
    case 'severe':
      return 'bg-orange-100 border-b border-orange-200';
    case 'moderate':
      return 'bg-amber-100 border-b border-amber-200';
    case 'mild':
      return 'bg-light-teal/30 border-b border-teal/20';
    default:
      return 'bg-light-teal/30 border-b border-teal/20';
  }
}

// Get icon background color for struggle severity
function getIconBgColor(severity: StruggleState['overallSeverity']) {
  switch (severity) {
    case 'severe':
      return 'bg-orange-500';
    case 'moderate':
      return 'bg-amber-500';
    default:
      return 'bg-teal';
  }
}

/**
 * Original ProactivePrompt component (unchanged API)
 */
export function ProactivePrompt({
  prompt,
  onDismiss,
  onAction,
  onInterventionAccept,
  className,
}: ProactivePromptProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!prompt) return null;

  const handleAction = () => {
    // If this is an intervention from struggle detection, use the intervention handler
    if (prompt.intervention && onInterventionAccept) {
      onInterventionAccept(prompt.intervention);
      return;
    }

    // Otherwise use the regular action handler
    if (prompt.suggestedAction) {
      onAction?.(prompt.suggestedAction);
    }
    onDismiss();
  };

  const isIntervention = !!prompt.intervention;
  const headerStyle = getHeaderStyle(prompt);

  return (
    <AnimatePresence>
      {prompt.isVisible && (
        <motion.div
          className={cn(
            'fixed bottom-24 right-4 z-30 max-w-sm',
            className
          )}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 24,
            mass: 0.8
          }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl border border-grey/20 overflow-hidden backdrop-blur-sm"
            whileHover={!prefersReducedMotion ? { scale: 1.02, y: -2 } : undefined}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className={cn("flex items-center justify-between px-5 py-4", headerStyle)}>
              <div className="flex items-center gap-3">
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                    isIntervention ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-teal to-purple"
                  )}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                  }}
                >
                  {getInterventionIcon(prompt.intervention)}
                </motion.div>
                <div>
                  <span className="font-bold text-navy text-sm block">
                    {isIntervention ? 'Sage noticed something' : 'Your Coach'}
                  </span>
                  <span className="text-xs text-rich-black/50">
                    {isIntervention ? 'Let me help' : 'Here to support you'}
                  </span>
                </div>
              </div>
              <motion.button
                onClick={onDismiss}
                className="p-2 rounded-lg hover:bg-grey/10 transition-colors"
                aria-label="Dismiss"
                whileHover={!prefersReducedMotion ? { scale: 1.1 } : undefined}
                whileTap={!prefersReducedMotion ? { scale: 0.9 } : undefined}
              >
                <X size={18} className="text-rich-black/60" />
              </motion.button>
            </div>

            {/* Message */}
            <motion.div
              className="px-5 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-rich-black/90 text-sm leading-relaxed font-medium">
                {prompt.message}
              </p>
            </motion.div>

            {/* Action Buttons */}
            {prompt.suggestedAction && (
              <motion.div
                className="px-5 pb-5 space-y-2.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined} whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}>
                  <Button
                    variant={isIntervention ? "primary" : "secondary"}
                    size="sm"
                    fullWidth
                    rightIcon={<ArrowRight size={14} />}
                    onClick={handleAction}
                    className="text-sm font-semibold shadow-sm"
                  >
                    {prompt.suggestedAction}
                  </Button>
                </motion.div>

                {/* Secondary dismiss for interventions */}
                {isIntervention && (
                  <motion.button
                    onClick={onDismiss}
                    className="w-full text-center text-xs text-grey/80 hover:text-rich-black transition-colors py-2 font-medium"
                    whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
                    whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                  >
                    I&apos;ll keep trying
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * StrugglePrompt - Shows when struggleDetector detects user is struggling
 *
 * This component displays automatically with a delay when:
 * - isStruggling is true
 * - severity is not 'mild' (moderate or severe)
 *
 * Features Sage avatar with friendly messaging and accept/dismiss buttons.
 */
export function StrugglePrompt({
  struggleState,
  onAccept,
  onDismiss,
  className,
  showDelay = 2000,
}: StrugglePromptProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  // Compute whether we should show based on struggle state
  const shouldShowPrompt =
    struggleState?.isStruggling &&
    struggleState.overallSeverity !== 'mild' &&
    struggleState.overallSeverity !== 'none' &&
    !dismissedForSession;

  // Show with delay when struggling and severity is not mild
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (shouldShowPrompt) {
      timer = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
    } else if (!shouldShowPrompt && isVisible) {
      // Only hide if we were visible and should no longer show
      // This is intentional - syncing visibility with external struggle state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [shouldShowPrompt, showDelay, isVisible]);

  // Reset dismissal when user is no longer struggling (external state change)
  const prevIsStruggling = useRef(struggleState?.isStruggling);
  useEffect(() => {
    // If user was struggling and now is not, reset for next time
    // This is intentional - syncing with external struggle state changes
    if (prevIsStruggling.current && !struggleState?.isStruggling) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissedForSession(false);
       
      setIsVisible(false);
    }
    prevIsStruggling.current = struggleState?.isStruggling;
  }, [struggleState?.isStruggling]);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissedForSession(true);
    onDismiss();
  };

  const handleAccept = () => {
    if (struggleState?.suggestedIntervention) {
      onAccept(struggleState.suggestedIntervention);
    }
    setIsVisible(false);
    setDismissedForSession(true);
  };

  if (!struggleState || !isVisible) return null;

  const { overallSeverity, suggestedIntervention } = struggleState;
  const message = getInterventionMessage(suggestedIntervention);
  const actionText = getInterventionAction(suggestedIntervention);
  const headerStyle = getStruggleHeaderStyle(overallSeverity);
  const iconBgColor = getIconBgColor(overallSeverity);

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed bottom-24 right-4 z-30 max-w-sm',
          className
        )}
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 24,
          mass: 0.8,
          delay: 0.1
        }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl border border-grey/20 overflow-hidden backdrop-blur-sm"
          whileHover={!prefersReducedMotion ? { scale: 1.02, y: -2 } : undefined}
          transition={{ duration: 0.2 }}
        >
          {/* Header with Sage Avatar */}
          <div className={cn("flex items-center justify-between px-5 py-4", headerStyle)}>
            <div className="flex items-center gap-3">
              {/* Sage Avatar */}
              <motion.div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0 shadow-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.15
                }}
              >
                <span className="text-xl">🦉</span>
              </motion.div>
              <div>
                <span className="font-bold text-navy text-sm block">
                  Sage noticed something
                </span>
                {overallSeverity === 'severe' ? (
                  <span className="text-xs text-orange-600 font-semibold">
                    Let me help!
                  </span>
                ) : (
                  <span className="text-xs text-rich-black/50">
                    Here to support you
                  </span>
                )}
              </div>
            </div>
            <motion.button
              onClick={handleDismiss}
              className="p-2 rounded-lg hover:bg-grey/10 transition-colors"
              aria-label="Dismiss"
              whileHover={!prefersReducedMotion ? { scale: 1.1 } : undefined}
              whileTap={!prefersReducedMotion ? { scale: 0.9 } : undefined}
            >
              <X size={18} className="text-rich-black/60" />
            </motion.button>
          </div>

          {/* Message */}
          <motion.div
            className="px-5 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-rich-black/90 text-sm leading-relaxed font-medium">
              {message}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="px-5 pb-5 space-y-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <motion.div whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined} whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                rightIcon={<ArrowRight size={14} />}
                onClick={handleAccept}
                className="text-sm font-semibold shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-lg flex items-center justify-center shadow-sm", iconBgColor)}>
                    {getStruggleInterventionIcon(suggestedIntervention)}
                  </span>
                  {actionText}
                </span>
              </Button>
            </motion.div>

            {/* Secondary dismiss option */}
            <motion.button
              onClick={handleDismiss}
              className="w-full text-center text-xs text-grey/80 hover:text-rich-black transition-colors py-2 font-medium"
              whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
              whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
            >
              I&apos;ll keep trying
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
