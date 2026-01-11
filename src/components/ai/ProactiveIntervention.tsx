/**
 * Proactive Intervention Component
 * Phase 4.1: UI Integration - Struggle Detection
 *
 * Shows AI-powered help when user is struggling
 * Triggers automatically based on behavioral analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { detectStruggle } from '@/lib/ai/struggle-detection';
import type { StruggleLevel } from '@/lib/ai/struggle-detection';

type ProactiveInterventionProps = {
  userId: string;
  currentAtomId: string;
  userBehavior: {
    recentQuizScores: number[];
    atomTimeSpent: number;
    estimatedTime: number;
    hintsViewed: number;
    questionsAttempted: number;
    quizRetakes: number;
    recentCoachMessages: string[];
    sessionDuration: number;
    previousSessionAbandoned: boolean;
  };
  userPreferences: {
    proactiveAIEnabled: boolean;
    interventionFrequency: 'minimal' | 'moderate' | 'frequent';
  };
};

export function ProactiveIntervention({
  userId,
  currentAtomId,
  userBehavior,
  userPreferences,
}: ProactiveInterventionProps) {
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionMessage, setInterventionMessage] = useState('');
  const [interventionType, setInterventionType] = useState<string | null>(null);
  const [lastInterventionTime, setLastInterventionTime] = useState<number | null>(null);

  useEffect(() => {
    // Check for struggle every 30 seconds
    const interval = setInterval(() => {
      checkForStruggle();
    }, 30000);

    return () => clearInterval(interval);
  }, [userBehavior]);

  const checkForStruggle = () => {
    if (!userPreferences.proactiveAIEnabled) return;

    // Analyze struggle
    const analysis = detectStruggle(userBehavior);

    // Check if should intervene
    const shouldIntervene =
      analysis.shouldIntervene &&
      (!lastInterventionTime || Date.now() - lastInterventionTime > 10 * 60 * 1000); // 10 min cooldown

    if (shouldIntervene && analysis.suggestedIntervention) {
      setInterventionMessage(analysis.suggestedIntervention);
      setInterventionType(analysis.interventionType);
      setShowIntervention(true);
      setLastInterventionTime(Date.now());

      // Log intervention for learning
      logIntervention(userId, currentAtomId, analysis.level, analysis.score);
    }
  };

  const handleAccept = () => {
    // User accepted help - take action based on intervention type
    if (interventionType === 'prerequisite_review') {
      // Navigate to prerequisite review
      window.location.href = '/review?focus=prerequisites';
    } else if (interventionType === 'scaffold') {
      // Show scaffolding content
      // Could open a micro-lesson modal
    }

    setShowIntervention(false);
    logInterventionResponse(userId, currentAtomId, 'accepted');
  };

  const handleDismiss = () => {
    setShowIntervention(false);
    logInterventionResponse(userId, currentAtomId, 'dismissed');
  };

  return (
    <AnimatePresence>
      {showIntervention && (
        <Modal
          isOpen={showIntervention}
          onClose={handleDismiss}
          title="Sage has a suggestion"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Brain className="w-8 h-8 text-teal flex-shrink-0" />
              <div>
                <p className="text-gray-700">{interventionMessage}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleAccept} className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                Yes, help me
              </Button>
              <Button onClick={handleDismiss} variant="ghost" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Not right now
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can disable proactive suggestions in settings
            </p>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

/**
 * Log intervention for analytics and RLHF
 */
function logIntervention(
  userId: string,
  atomId: string,
  struggleLevel: StruggleLevel,
  struggleScore: number
) {
  console.log('Proactive intervention triggered:', {
    userId,
    atomId,
    struggleLevel,
    struggleScore,
    timestamp: new Date(),
  });

  // In production: save to Firestore for analysis
}

function logInterventionResponse(userId: string, atomId: string, response: 'accepted' | 'dismissed') {
  console.log('Intervention response:', { userId, atomId, response });

  // In production: Track effectiveness of interventions
  // If mostly dismissed → reduce frequency
  // If mostly accepted → increase or maintain
}
