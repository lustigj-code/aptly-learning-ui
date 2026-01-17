/**
 * Dropout Intervention Hook
 *
 * Integrates the orphaned dropout prediction and re-engagement services.
 * Checks for at-risk users on login/dashboard load and triggers interventions.
 *
 * Research-backed approach:
 * - 72-hour login gap is critical threshold
 * - 60-65 hours is optimal intervention window
 * - Loss aversion (streak saver) is most effective motivator
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import {
  assessDropoutRisk,
  isInInterventionWindow,
  type DropoutRisk,
  type BehavioralData,
} from '@/lib/services/dropoutPrediction';
import {
  generateReengagementMessage,
  determineReturnDestination,
  type ReengagementMessage,
  type UserContext,
  type ReturnDestination,
} from '@/lib/services/reengagement';

// Local storage key for throttling notifications
const LAST_INTERVENTION_KEY = 'aptly_last_intervention';
const INTERVENTION_COOLDOWN_HOURS = 24;

export interface DropoutInterventionState {
  risk: DropoutRisk | null;
  message: ReengagementMessage | null;
  returnDestination: ReturnDestination;
  isAtRisk: boolean;
  isInOptimalWindow: boolean;
  shouldShowIntervention: boolean;
  dismissIntervention: () => void;
  snoozeIntervention: () => void;
}

/**
 * Hook to detect at-risk learners and generate re-engagement interventions
 */
export function useDropoutIntervention(): DropoutInterventionState {
  const user = useUserProfileStore((state) => state.user);
  const [dismissed, setDismissed] = useState(false);
  const [hasRecordedIntervention, setHasRecordedIntervention] = useState(false);

  // Check if we should throttle based on last intervention time
  const shouldThrottle = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;

    const lastIntervention = localStorage.getItem(LAST_INTERVENTION_KEY);
    if (!lastIntervention) return false;

    const lastTime = new Date(lastIntervention).getTime();
    const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);

    return hoursSince < INTERVENTION_COOLDOWN_HOURS;
  }, []);

  // Record intervention timestamp
  const recordIntervention = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_INTERVENTION_KEY, new Date().toISOString());
    }
  }, []);

  // Calculate risk assessment using useMemo
  const risk = useMemo((): DropoutRisk | null => {
    if (!user || shouldThrottle()) {
      return null;
    }

    const lastActiveAt = user.progress?.lastActiveAt;
    if (!lastActiveAt) return null;

    // Convert to Date if string
    const lastActive = typeof lastActiveAt === 'string'
      ? new Date(lastActiveAt)
      : lastActiveAt;

    // Build behavioral data from user profile
    const behavioralData: BehavioralData = {
      daysSinceEnrollment: user.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
      retentionRate: user.progress?.overallPercentage
        ? user.progress.overallPercentage / 100
        : undefined,
    };

    return assessDropoutRisk(user.id, lastActive, behavioralData);
  }, [user, shouldThrottle]);

  // Calculate message using useMemo
  const message = useMemo((): ReengagementMessage | null => {
    if (!risk || risk.riskLevel === 'low' || !user) {
      return null;
    }

    const streak = user.streak || { currentStreak: 0, longestStreak: 0, freezesAvailable: 0 };
    const progress = user.progress || { lessonsCompleted: [], overallPercentage: 0 };

    // Calculate total lessons (rough estimate if not available)
    const totalLessons = Math.max(
      progress.lessonsCompleted?.length || 0,
      Math.round((progress.overallPercentage || 1) * 100 / 100 * 50) // Assume ~50 total lessons
    );

    const userContext: UserContext = {
      name: user.name || 'Learner',
      streakDays: streak.currentStreak || 0,
      progressPercent: progress.overallPercentage || 0,
      lastSkillName: undefined, // Could populate from last lesson
      hoursUntilStreakLoss: Math.max(0, 72 - risk.hoursSinceLastLogin),
      completedLessons: progress.lessonsCompleted?.length || 0,
      totalLessons,
      hasFreezeTokens: (streak.freezesAvailable || 0) > 0,
      freezeTokenCount: streak.freezesAvailable || 0,
    };

    return generateReengagementMessage(userContext, risk.hoursSinceLastLogin);
  }, [risk, user]);

  // Record intervention once when message is shown
  useEffect(() => {
    if (message && !hasRecordedIntervention) {
      recordIntervention();
      setHasRecordedIntervention(true);
    }
  }, [message, hasRecordedIntervention, recordIntervention]);

  // Calculate derived state
  const lastActiveAt = user?.progress?.lastActiveAt;
  const lastActive = lastActiveAt
    ? (typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt)
    : null;

  const isInOptimalWindow = lastActive ? isInInterventionWindow(lastActive) : false;
  const isAtRisk = risk?.riskLevel === 'high' || risk?.riskLevel === 'critical';

  // Determine return destination
  const returnDestination = risk
    ? determineReturnDestination(
        risk.hoursSinceLastLogin,
        true, // Assume has overdue reviews
        user?.streak?.currentStreak ? user.streak.currentStreak > 3 : false
      )
    : 'dashboard';

  // Intervention handlers
  const dismissIntervention = useCallback(() => {
    setDismissed(true);
    recordIntervention();
  }, [recordIntervention]);

  const snoozeIntervention = useCallback(() => {
    setDismissed(true);
    // Snooze for shorter period (12 hours)
    if (typeof window !== 'undefined') {
      const snoozeTime = new Date(Date.now() - (INTERVENTION_COOLDOWN_HOURS - 12) * 60 * 60 * 1000);
      localStorage.setItem(LAST_INTERVENTION_KEY, snoozeTime.toISOString());
    }
  }, []);

  return {
    risk,
    message,
    returnDestination,
    isAtRisk,
    isInOptimalWindow,
    shouldShowIntervention: isAtRisk && !dismissed && message !== null,
    dismissIntervention,
    snoozeIntervention,
  };
}

export default useDropoutIntervention;
