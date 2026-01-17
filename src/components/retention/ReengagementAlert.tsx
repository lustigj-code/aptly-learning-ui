/**
 * Re-engagement Alert Component
 *
 * Displays personalized intervention messages for at-risk learners.
 * Uses loss aversion (streak saver) and progress framing research.
 *
 * Integrates with the dropout prediction system.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Flame, X, ChevronRight, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDropoutIntervention } from '@/hooks/useDropoutIntervention';
import { useUserProfileStore } from '@/store/userProfileStore';

export function ReengagementAlert() {
  const router = useRouter();
  const {
    risk,
    message,
    isInOptimalWindow,
    shouldShowIntervention,
    dismissIntervention,
    snoozeIntervention,
  } = useDropoutIntervention();

  const applyStreakFreeze = useUserProfileStore((state) => state.useStreakFreeze);
  const user = useUserProfileStore((state) => state.user);

  if (!shouldShowIntervention || !message || !risk) {
    return null;
  }

  const isCritical = risk.riskLevel === 'critical';
  const isHighRisk = risk.riskLevel === 'high';
  const hoursLeft = Math.max(0, 72 - risk.hoursSinceLastLogin);
  const hasFreezes = (user?.streak?.freezesAvailable || 0) > 0;

  const handleCTA = () => {
    dismissIntervention();
    router.push(message.ctaUrl);
  };

  const handleUseFreeze = async () => {
    const success = await applyStreakFreeze();
    if (success) {
      dismissIntervention();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`relative overflow-hidden border-2 ${
            isCritical
              ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
              : isHighRisk
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400'
              : 'bg-gradient-to-r from-blue-50 to-teal-50 border-teal-300'
          }`}
          padding="lg"
        >
          {/* Urgency indicator */}
          {isCritical && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          )}
          {isHighRisk && !isCritical && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
          )}

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                isCritical
                  ? 'bg-red-500'
                  : isHighRisk
                  ? 'bg-yellow-500'
                  : 'bg-teal'
              }`}
            >
              {message.type === 'streak_saver' ? (
                <Flame className="w-6 h-6 text-white" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    className={`font-bold text-lg ${
                      isCritical ? 'text-red-800' : 'text-navy'
                    }`}
                  >
                    {message.subject}
                  </h3>
                  <p className="text-rich-black/70 mt-1">{message.body}</p>

                  {/* Time urgency */}
                  {isInOptimalWindow && (
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-700 font-medium">
                        {hoursLeft < 1
                          ? 'Less than 1 hour left!'
                          : `${Math.round(hoursLeft)} hours until streak resets`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={dismissIntervention}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button
                  variant={isCritical ? 'danger' : 'celebration'}
                  size="md"
                  rightIcon={<ChevronRight size={18} />}
                  onClick={handleCTA}
                >
                  {message.cta}
                </Button>

                {hasFreezes && message.type === 'streak_saver' && (
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<Snowflake size={18} />}
                    onClick={handleUseFreeze}
                  >
                    Use Streak Freeze ({user?.streak?.freezesAvailable})
                  </Button>
                )}

                <button
                  onClick={snoozeIntervention}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Remind me later
                </button>
              </div>
            </div>
          </div>

          {/* Risk signals for debugging (can remove in production) */}
          {process.env.NODE_ENV === 'development' && risk.signals.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <p className="text-xs text-gray-500 mb-2">
                Risk signals detected ({risk.confidence.toFixed(0)}% confidence):
              </p>
              <div className="flex flex-wrap gap-2">
                {risk.signals.map((signal, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-white/50 rounded-full text-gray-600"
                  >
                    {signal.description}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default ReengagementAlert;
