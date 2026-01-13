/**
 * Sync state management
 * Handles offline/online sync status and pending updates
 *
 * This is a focused store - split from the monolithic unifiedStore
 * for better separation of concerns and maintainability.
 */
import { create } from 'zustand';
import { useEffect, useMemo } from 'react';
import type { User } from '@/types';

// ============================================
// TYPES
// ============================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SyncState {
  // State
  status: SyncStatus;
  lastSyncedAt: Date | null;
  pendingUpdates: Partial<User> | null;
  isSyncing: boolean;
  syncError: string | null;

  // Actions
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (date: Date) => void;
  setIsSyncing: (syncing: boolean) => void;
  setPendingUpdates: (updates: Partial<User> | null) => void;
  addPendingUpdates: (updates: Partial<User>) => void;
  clearPendingUpdates: () => void;
  setSyncError: (error: string | null) => void;
  markSynced: () => void;
  markOffline: () => void;
  markError: (error: string) => void;
}

// ============================================
// STORE
// ============================================

export const useSyncStore = create<SyncState>((set) => ({
  // Initial state
  status: 'idle',
  lastSyncedAt: null,
  pendingUpdates: null,
  isSyncing: false,
  syncError: null,

  // Actions
  setSyncStatus: (status) => set({ status }),

  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),

  setIsSyncing: (syncing) =>
    set({
      isSyncing: syncing,
      status: syncing ? 'syncing' : 'idle',
    }),

  setPendingUpdates: (updates) => set({ pendingUpdates: updates }),

  addPendingUpdates: (updates) =>
    set((state) => ({
      pendingUpdates: state.pendingUpdates
        ? { ...state.pendingUpdates, ...updates }
        : updates,
    })),

  clearPendingUpdates: () => set({ pendingUpdates: null }),

  setSyncError: (error) => set({ syncError: error }),

  markSynced: () =>
    set({
      status: 'synced',
      lastSyncedAt: new Date(),
      isSyncing: false,
      pendingUpdates: null,
      syncError: null,
    }),

  markOffline: () =>
    set({
      status: 'offline',
      isSyncing: false,
    }),

  markError: (error) =>
    set({
      status: 'error',
      isSyncing: false,
      syncError: error,
    }),
}));

// ============================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================

/**
 * Hook for sync status monitoring
 */
export function useSyncStatus() {
  const status = useSyncStore((state) => state.status);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const pendingUpdates = useSyncStore((state) => state.pendingUpdates);
  const syncError = useSyncStore((state) => state.syncError);

  const isOnline = useMemo(() => status !== 'offline', [status]);
  const hasPendingUpdates = useMemo(
    () => pendingUpdates !== null,
    [pendingUpdates]
  );

  return {
    status,
    lastSyncedAt,
    isSyncing,
    isOnline,
    hasPendingUpdates,
    pendingUpdates,
    syncError,
  };
}

/**
 * Hook to sync pending updates when coming back online
 */
export function useOfflineSync(
  syncToFirestore?: (updates: Partial<User>) => Promise<void>
) {
  const pendingUpdates = useSyncStore((state) => state.pendingUpdates);
  const setSyncStatus = useSyncStore((state) => state.setSyncStatus);
  const clearPendingUpdates = useSyncStore((state) => state.clearPendingUpdates);

  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      if (pendingUpdates && syncToFirestore) {
        try {
          await syncToFirestore(pendingUpdates);
          clearPendingUpdates();
          setSyncStatus('synced');
        } catch (error) {
          console.error('Failed to sync pending updates:', error);
          setSyncStatus('error');
        }
      } else {
        setSyncStatus('synced');
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingUpdates, syncToFirestore, setSyncStatus, clearPendingUpdates]);
}
