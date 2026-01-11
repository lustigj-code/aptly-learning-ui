'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ArrowRight, AlertCircle, BookOpen, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ProactivePrompt as ProactivePromptType, Intervention } from '@/hooks/useProactiveCoach';

type ProactivePromptProps = {
  prompt: ProactivePromptType | null;
  onDismiss: () => void;
  onAction?: (action: string) => void;
  onInterventionAccept?: (intervention: Intervention) => void; // New: for handling interventions
  className?: string;
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
                    I'll keep trying
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
