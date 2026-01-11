/**
 * useUserProfile Hook
 * Phase 6.1: React Query Integration Example
 *
 * Fetches and caches user profile with React Query
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/api/queryClient';
import type { User, UserPreferences } from '@/types';

/**
 * Fetch user profile with caching
 */
export function useUserProfile(uid: string | null) {
  return useQuery({
    queryKey: queryKeys.user(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided');

      const response = await fetch(`/api/users/${uid}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');

      const data = await response.json();
      return data.user as User;
    },
    enabled: !!uid, // Only run query if uid exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Update user preferences with optimistic updates
 */
export function useUpdatePreferences(uid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const response = await fetch('/api/users/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      return response.json();
    },
    // Optimistic update
    onMutate: async (newPreferences) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.user(uid) });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(queryKeys.user(uid));

      // Optimistically update
      if (previousUser) {
        queryClient.setQueryData<User>(queryKeys.user(uid), {
          ...previousUser,
          preferences: {
            ...previousUser.preferences,
            ...newPreferences,
          },
        });
      }

      return { previousUser };
    },
    // Rollback on error
    onError: (err, newPreferences, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.user(uid), context.previousUser);
      }
    },
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(uid) });
    },
  });
}

/**
 * Fetch user progress with caching
 */
export function useUserProgress(uid: string | null) {
  return useQuery({
    queryKey: queryKeys.userProgress(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided');

      const response = await fetch(`/api/users/${uid}/progress`);
      if (!response.ok) throw new Error('Failed to fetch user progress');

      return response.json();
    },
    enabled: !!uid,
    staleTime: 2 * 60 * 1000, // 2 minutes (progress changes frequently)
    refetchOnWindowFocus: true, // Refresh when user returns
  });
}

/**
 * Prefetch user data for faster navigation
 */
export function usePrefetchUserData(uid: string | null) {
  const queryClient = useQueryClient();

  const prefetchProfile = () => {
    if (!uid) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.user(uid),
      queryFn: async () => {
        const response = await fetch(`/api/users/${uid}`);
        if (!response.ok) throw new Error('Failed');
        return response.json();
      },
    });
  };

  const prefetchProgress = () => {
    if (!uid) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.userProgress(uid),
      queryFn: async () => {
        const response = await fetch(`/api/users/${uid}/progress`);
        if (!response.ok) throw new Error('Failed');
        return response.json();
      },
    });
  };

  return {
    prefetchProfile,
    prefetchProgress,
    prefetchAll: () => {
      prefetchProfile();
      prefetchProgress();
    },
  };
}
