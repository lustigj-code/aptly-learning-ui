'use client';

import { useMemo } from 'react';
import { useUser } from '@/store/userProfileStore';
import {
  getRecommendedFormat,
  getSessionRecommendation,
  createInitialProfile,
  type AdaptationProfile,
  type ContentFormat,
  type ContentRecommendation,
} from '@/lib/personalization/learningStyleAdapter';

/**
 * Hook that provides access to user's learning preferences
 * and content format recommendations.
 *
 * Use this when:
 * - Deciding which content format to show first
 * - Offering format alternatives to users
 * - Personalizing session recommendations
 */
export function useLearningPreference() {
  const { user } = useUser();

  // Build adaptation profile from user data
  const profile: AdaptationProfile | null = useMemo(() => {
    if (!user) return null;

    return createInitialProfile(user.id, {
      preferVideoOrReading: user.preferences?.preferReadingOrVideo || 'mixed',
      dailyGoalMinutes: user.preferences?.dailyGoalMinutes || 15,
      voiceEnabled: user.preferences?.voiceEnabled || false,
    });
  }, [user]);

  /**
   * Get recommended content format from available options
   */
  const getPreferredFormat = (
    availableFormats: ContentFormat[],
    conceptDifficulty: number = 3
  ): ContentRecommendation | null => {
    if (!profile) return null;
    return getRecommendedFormat(profile, availableFormats, conceptDifficulty);
  };

  /**
   * Get session recommendation (duration, activity type)
   */
  const sessionRecommendation = useMemo(() => {
    if (!profile) return null;
    return getSessionRecommendation(profile);
  }, [profile]);

  /**
   * User's explicit format preference
   */
  const preferredFormat = user?.preferences?.preferReadingOrVideo || 'mixed';

  /**
   * Check if user prefers video over reading
   */
  const prefersVideo = preferredFormat === 'video';

  /**
   * Check if user prefers reading over video
   */
  const prefersReading = preferredFormat === 'reading';

  return {
    // Direct preference values
    preferredFormat,
    prefersVideo,
    prefersReading,

    // Profile-based recommendations
    profile,
    getPreferredFormat,
    sessionRecommendation,

    // Helper to check if a format matches preference
    matchesPreference: (format: 'video' | 'reading') => {
      if (preferredFormat === 'mixed') return true;
      return format === preferredFormat;
    },
  };
}
