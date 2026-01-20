/**
 * Unified Dashboard Data Hook
 *
 * Fetches and combines data from multiple API endpoints:
 * - /api/dashboard/insights (velocity, predictions, skills)
 * - /api/review/due (review queue with urgency)
 * - User store (progress, streak)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUser } from '@/store/unifiedStore';
import { DEFAULT_COURSE_ID, getDefaultCourse } from '@/data/courseRegistry';
import type {
  DashboardData,
  DashboardInsights,
  ReviewDueResponse,
  ActivityDay,
} from '../types';

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache
const cache: {
  insights?: CacheEntry<DashboardInsights>;
  review?: CacheEntry<ReviewDueResponse>;
} = {};

export function useDashboardData(): DashboardData {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const { user, isLoading: isUserLoading } = useUser();

  // Get course data from registry (has full module data, unlike useCourse hook)
  const course = getDefaultCourse();
  const totalLessons = course.modules?.reduce(
    (total, mod) => total + (mod.lessons?.length ?? 0),
    0
  ) ?? 0;

  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewDueResponse | null>(null);
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(true);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if cache is still valid
  const isCacheValid = useCallback((entry: CacheEntry<unknown> | undefined): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_DURATION_MS;
  }, []);

  // Fetch dashboard insights
  const fetchInsights = useCallback(async () => {
    if (!firebaseUser || !user?.id) {
      setIsInsightsLoading(false);
      return;
    }

    // Check cache
    if (isCacheValid(cache.insights)) {
      setInsights(cache.insights!.data);
      setIsInsightsLoading(false);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/dashboard/insights?userId=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const insightsData = data.data as DashboardInsights;
          cache.insights = { data: insightsData, timestamp: Date.now() };
          setInsights(insightsData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard insights:', err);
      setError('Failed to load insights');
    } finally {
      setIsInsightsLoading(false);
    }
  }, [firebaseUser, user?.id, isCacheValid]);

  // Fetch review queue
  const fetchReviewQueue = useCallback(async () => {
    if (!firebaseUser) {
      setIsReviewLoading(false);
      return;
    }

    // Check cache
    if (isCacheValid(cache.review)) {
      setReviewQueue(cache.review!.data);
      setIsReviewLoading(false);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/review/due?limit=20&forecast=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as ReviewDueResponse;
        cache.review = { data, timestamp: Date.now() };
        setReviewQueue(data);
      }
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
      setError('Failed to load reviews');
    } finally {
      setIsReviewLoading(false);
    }
  }, [firebaseUser, isCacheValid]);

  // Generate activity heatmap data (last 12 weeks)
  const generateActivityData = useCallback((): ActivityDay[] => {
    const days: ActivityDay[] = [];
    const today = new Date();

    // Generate 84 days (12 weeks)
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Check if user has activity on this day from streak history
      const streakHistory = user?.streak?.streakHistory || [];
      const hasActivity = streakHistory.includes(dateStr);

      // Calculate activity level based on various factors
      // In production, this would come from actual interaction logs
      let count = 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;

      if (hasActivity) {
        // Simulate activity levels based on day patterns
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Higher activity mid-week, lower on weekends
        if (isWeekend) {
          count = Math.floor(Math.random() * 3) + 1;
        } else {
          count = Math.floor(Math.random() * 8) + 2;
        }

        // Map count to level
        if (count >= 8) level = 4;
        else if (count >= 5) level = 3;
        else if (count >= 3) level = 2;
        else if (count >= 1) level = 1;
      }

      days.push({ date: dateStr, count, level });
    }

    return days;
  }, [user?.streak?.streakHistory]);

  // Fetch all data on mount
  useEffect(() => {
    if (firebaseUser && user) {
      fetchInsights();
      fetchReviewQueue();
      setActivityData(generateActivityData());
    }
  }, [firebaseUser, user, fetchInsights, fetchReviewQueue, generateActivityData]);

  // Build progress object from user data
  // Use the stored overallPercentage from Firebase (atom-based, updated by sync API)
  // This is more reliable than calculating from lessonsCompleted which may not be synced
  const lessonsCompletedCount = user?.progress?.lessonsCompleted?.length || 0;
  const atomsCompletedCount = user?.progress?.atomsCompleted?.length || 0;

  // Use stored percentage from Firebase - this is set by /api/progress/sync
  // and represents actual progress based on atoms completed
  const storedPercentage = user?.progress?.overallPercentage || 0;

  const progress = user?.progress ? {
    // Use stored percentage from Firebase (atom-based, more reliable)
    overallPercentage: storedPercentage,
    lessonsCompleted: lessonsCompletedCount,
    atomsCompleted: atomsCompletedCount,
    totalLessons,
    currentCourseId: user.progress.currentCourseId || DEFAULT_COURSE_ID,
    currentModuleId: user.progress.currentModuleId,
    currentLessonId: user.progress.currentLessonId,
    xp: user.progress.xp || 0,
  } : null;

  // Build streak object from user data
  const streak = user?.streak ? {
    currentStreak: user.streak.currentStreak || 0,
    longestStreak: user.streak.longestStreak || 0,
    freezesAvailable: user.streak.freezesAvailable || 0,
  } : null;

  const isLoading = isUserLoading || isInsightsLoading || isReviewLoading;

  return {
    insights,
    reviewQueue,
    progress,
    streak,
    activityData,
    isLoading,
    isCourseLoading: false, // Course data is now from registry, always available
    isInsightsLoading,
    isReviewLoading,
    error,
  };
}

/**
 * Hook to check if user is new (no lessons completed)
 */
export function useIsNewUser(): boolean {
  const { user } = useUser();
  const lessonsCompleted = user?.progress?.lessonsCompleted?.length || 0;
  const atomsCompleted = user?.progress?.atomsCompleted?.length || 0;

  return lessonsCompleted === 0 && atomsCompleted === 0;
}

/**
 * Invalidate dashboard cache (call after completing lessons, etc.)
 */
export function invalidateDashboardCache(): void {
  delete cache.insights;
  delete cache.review;
}

export default useDashboardData;
