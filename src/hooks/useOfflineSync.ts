'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isOnline as checkIsOnline,
  addConnectionListener,
  queueProgress,
  getQueueCount,
  syncQueuedProgress,
  type QueuedProgress,
} from '@/lib/pwa';

/**
 * Progress data structure for offline queue
 */
export interface ProgressData {
  type: 'atom_complete' | 'quiz_result' | 'lesson_complete' | 'session_time';
  atomId?: string;
  lessonId?: string;
  skillId?: string;
  courseId?: string;
  result?: {
    score?: number;
    passed?: boolean;
    timeSpent?: number;
  };
  timestamp: number;
}

/**
 * Sync result tracking
 */
export interface SyncResult {
  synced: number;
  failed: number;
  timestamp: number;
}

/**
 * Hook state
 */
export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
}

/**
 * Hook actions
 */
export interface OfflineSyncActions {
  syncPendingProgress: () => Promise<SyncResult>;
  queueProgressUpdate: (data: Omit<ProgressData, 'timestamp'>) => Promise<void>;
  withOfflineSupport: <T>(
    apiCall: () => Promise<T>,
    offlineData: Omit<ProgressData, 'timestamp'>
  ) => Promise<T | null>;
  refreshPendingCount: () => Promise<void>;
}

/**
 * Default sync function that sends progress to the API
 */
async function defaultSyncFn(data: QueuedProgress['data']): Promise<boolean> {
  try {
    const response = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Hook for managing offline progress sync
 *
 * Provides:
 * - Online/offline status tracking
 * - Queue pending progress updates when offline
 * - Auto-sync when connection restores
 * - Wrap API calls with offline fallback
 */
export function useOfflineSync(
  customSyncFn?: (data: QueuedProgress['data']) => Promise<boolean>
): OfflineSyncState & OfflineSyncActions {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return checkIsOnline();
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncFnRef = useRef(customSyncFn || defaultSyncFn);

  // Update sync function ref if it changes
  useEffect(() => {
    syncFnRef.current = customSyncFn || defaultSyncFn;
  }, [customSyncFn]);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch {
      console.error('[OfflineSync] Failed to get pending count');
    }
  }, []);

  // Initial load of pending count
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Sync all pending progress
  const syncPendingProgress = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline || isSyncing) {
      return { synced: 0, failed: 0, timestamp: Date.now() };
    }

    setIsSyncing(true);

    try {
      const result = await syncQueuedProgress(syncFnRef.current);
      const syncResult: SyncResult = {
        ...result,
        timestamp: Date.now(),
      };

      setLastSyncResult(syncResult);
      await refreshPendingCount();

      console.log(`[OfflineSync] Sync complete: ${result.synced} synced, ${result.failed} failed`);
      return syncResult;
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      const failResult: SyncResult = {
        synced: 0,
        failed: pendingCount,
        timestamp: Date.now(),
      };
      setLastSyncResult(failResult);
      return failResult;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pendingCount, refreshPendingCount]);

  // Queue a progress update for later sync
  const queueProgressUpdate = useCallback(async (data: Omit<ProgressData, 'timestamp'>) => {
    const progressData: QueuedProgress['data'] = {
      type: data.type,
      lessonId: data.lessonId,
      courseId: data.courseId,
      quizScore: data.result?.score,
      timeSpent: data.result?.timeSpent,
      timestamp: Date.now(),
    };

    await queueProgress(progressData);
    await refreshPendingCount();
    console.log('[OfflineSync] Progress queued');
  }, [refreshPendingCount]);

  // Wrap an API call with offline support
  const withOfflineSupport = useCallback(async <T>(
    apiCall: () => Promise<T>,
    offlineData: Omit<ProgressData, 'timestamp'>
  ): Promise<T | null> => {
    // If offline, queue the data and return null
    if (!isOnline) {
      await queueProgressUpdate(offlineData);
      console.log('[OfflineSync] Offline - queued for later');
      return null;
    }

    // If online, try the API call
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      // If API call fails (possibly due to network issues), queue the data
      console.warn('[OfflineSync] API call failed, queuing for later:', error);
      await queueProgressUpdate(offlineData);
      return null;
    }
  }, [isOnline, queueProgressUpdate]);

  // Listen for online/offline events
  useEffect(() => {
    const cleanup = addConnectionListener(
      // On online
      () => {
        console.log('[OfflineSync] Connection restored');
        setIsOnline(true);
      },
      // On offline
      () => {
        console.log('[OfflineSync] Connection lost');
        setIsOnline(false);
      }
    );

    return cleanup;
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        console.log('[OfflineSync] Auto-syncing pending progress');
        syncPendingProgress();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, isSyncing, syncPendingProgress]);

  return {
    // State
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    // Actions
    syncPendingProgress,
    queueProgressUpdate,
    withOfflineSupport,
    refreshPendingCount,
  };
}

export default useOfflineSync;
