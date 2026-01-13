'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ArrowRight, AlertCircle, BookOpen, Coffee, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-grey/20 overflow-hidden">
            {/* Header */}
            <div className={cn("flex items-center justify-between px-4 py-3", headerStyle)}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isIntervention ? "bg-amber-500" : "bg-teal"
                )}>
                  {getInterventionIcon(prompt.intervention)}
                </div>
                <span className="font-semibold text-navy text-sm">
                  {isIntervention ? 'Sage noticed something' : 'Coach'}
                </span>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-teal/10 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} className="text-rich-black/60" />
              </button>
            </div>

            {/* Message */}
            <div className="px-4 py-3">
              <p className="text-rich-black/80 text-sm leading-relaxed">
                {prompt.message}
              </p>
            </div>

            {/* Action Buttons */}
            {prompt.suggestedAction && (
              <div className="px-4 pb-4 space-y-2">
                <Button
                  variant={isIntervention ? "primary" : "secondary"}
                  size="sm"
                  fullWidth
                  rightIcon={<ArrowRight size={14} />}
                  onClick={handleAction}
                  className="text-sm"
                >
                  {prompt.suggestedAction}
                </Button>

                {/* Secondary dismiss for interventions */}
                {isIntervention && (
                  <button
                    onClick={onDismiss}
                    className="w-full text-center text-xs text-grey hover:text-rich-black transition-colors py-1"
                  >
                    I&apos;ll keep trying
                  </button>
                )}
              </div>
            )}
          </div>
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-grey/20 overflow-hidden">
          {/* Header with Sage Avatar */}
          <div className={cn("flex items-center justify-between px-4 py-3", headerStyle)}>
            <div className="flex items-center gap-2">
              {/* Sage Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🦉</span>
              </div>
              <div>
                <span className="font-semibold text-navy text-sm block">
                  Sage noticed something
                </span>
                {overallSeverity === 'severe' && (
                  <span className="text-xs text-orange-600">
                    Let me help!
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-grey/10 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} className="text-rich-black/60" />
            </button>
          </div>

          {/* Message */}
          <div className="px-4 py-3">
            <p className="text-rich-black/80 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 space-y-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              rightIcon={<ArrowRight size={14} />}
              onClick={handleAccept}
              className="text-sm"
            >
              <span className="flex items-center gap-2">
                <span className={cn("w-5 h-5 rounded flex items-center justify-center", iconBgColor)}>
                  {getStruggleInterventionIcon(suggestedIntervention)}
                </span>
                {actionText}
              </span>
            </Button>

            {/* Secondary dismiss option */}
            <button
              onClick={handleDismiss}
              className="w-full text-center text-xs text-grey hover:text-rich-black transition-colors py-1"
            >
              I&apos;ll keep trying
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
