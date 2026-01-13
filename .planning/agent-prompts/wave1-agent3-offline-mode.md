# Agent 1-3: Offline Mode Completion

## Mission
Wire existing offline queue functions to the learning flow so progress syncs when offline.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/pwa/offline.ts           # queueProgress, syncQueuedProgress functions
src/lib/pwa/serviceWorker.ts     # SW registration
src/components/learning/CoachLearningView.tsx  # Main learning component
src/hooks/usePWA.ts              # PWA hook (if exists)
src/components/pwa/OfflineIndicator.tsx  # Offline UI
```

## Current State
- `offline.ts` has `queueProgress()` and `syncQueuedProgress()` functions
- These functions are never called from the learning flow
- User progress is lost when offline

## Changes to Make

### 1. Create `src/hooks/useOfflineSync.ts`
Purpose: Hook that wraps API calls with offline detection

```typescript
import { useState, useEffect, useCallback } from 'react';
import { queueProgress, syncQueuedProgress, getPendingCount } from '@/lib/pwa/offline';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      await syncPendingProgress();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending progress
  const syncPendingProgress = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncQueuedProgress();
      setPendingCount(0);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Queue progress for later sync
  const queueProgressUpdate = useCallback(async (progressData: ProgressData) => {
    await queueProgress(progressData);
    setPendingCount(prev => prev + 1);
  }, []);

  // Wrap API call with offline fallback
  const withOfflineSupport = useCallback(async <T>(
    apiCall: () => Promise<T>,
    offlineData: ProgressData
  ): Promise<T | null> => {
    if (!isOnline) {
      await queueProgressUpdate(offlineData);
      return null;
    }

    try {
      return await apiCall();
    } catch (error) {
      // If network error, queue for later
      if (error instanceof TypeError && error.message.includes('network')) {
        await queueProgressUpdate(offlineData);
        return null;
      }
      throw error;
    }
  }, [isOnline, queueProgressUpdate]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncPendingProgress,
    queueProgressUpdate,
    withOfflineSupport,
  };
}
```

### 2. Modify `src/components/learning/CoachLearningView.tsx`
Wire offline support to progress updates:

```typescript
// Add import
import { useOfflineSync } from '@/hooks/useOfflineSync';

// In component:
const { isOnline, pendingCount, withOfflineSupport } = useOfflineSync();

// Modify the progress update function (find where API is called):
const completeAtom = async (atomId: string, result: AtomResult) => {
  const progressData = {
    type: 'atom_complete',
    atomId,
    result,
    timestamp: Date.now(),
  };

  await withOfflineSupport(
    () => fetch('/api/progress/complete-atom', {
      method: 'POST',
      body: JSON.stringify(progressData),
    }),
    progressData
  );

  // Continue with local state update regardless of online status
  setCompletedAtoms(prev => [...prev, atomId]);
};

// Add offline indicator in header
{!isOnline && (
  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
    Offline - Progress will sync when connected
  </div>
)}

{pendingCount > 0 && isOnline && (
  <div className="text-gray-500 text-sm">
    Syncing {pendingCount} updates...
  </div>
)}
```

### 3. Modify `src/lib/pwa/offline.ts`
Ensure functions handle edge cases:

```typescript
// Add if missing:
export interface ProgressData {
  type: 'atom_complete' | 'quiz_answer' | 'review_complete';
  atomId?: string;
  skillId?: string;
  result?: any;
  timestamp: number;
}

// Ensure queueProgress handles storage limits:
export async function queueProgress(data: ProgressData): Promise<void> {
  const db = await openDB();
  const queue = await db.get('offlineQueue') || [];

  // Limit queue size to prevent storage issues
  if (queue.length >= 100) {
    // Remove oldest items
    queue.splice(0, 10);
  }

  queue.push(data);
  await db.put('offlineQueue', queue);
}

// Add sync retry logic:
export async function syncQueuedProgress(): Promise<SyncResult> {
  const db = await openDB();
  const queue = await db.get('offlineQueue') || [];

  const results = { success: 0, failed: 0 };

  for (const item of queue) {
    try {
      await syncSingleItem(item);
      results.success++;
    } catch (error) {
      results.failed++;
      // Keep failed items in queue for retry
    }
  }

  // Remove successfully synced items
  const remaining = queue.slice(results.success);
  await db.put('offlineQueue', remaining);

  return results;
}
```

### 4. Modify `src/components/pwa/OfflineIndicator.tsx`
Show sync status:

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingProgress } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white shadow-lg rounded-lg p-4 max-w-sm">
      {!isOnline ? (
        <div className="flex items-center gap-2">
          <WifiOffIcon className="w-5 h-5 text-yellow-500" />
          <span>You're offline. Progress is saved locally.</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Spinner className="w-5 h-5" />
              <span>Syncing {pendingCount} updates...</span>
            </>
          ) : (
            <>
              <CloudIcon className="w-5 h-5 text-blue-500" />
              <span>{pendingCount} updates pending</span>
              <button onClick={syncPendingProgress} className="text-blue-600 underline">
                Sync now
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
```

### 5. Add offline indicator to layout
`src/app/layout.tsx` or appropriate layout file:

```typescript
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';

// In layout JSX:
<OfflineIndicator />
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Go offline in DevTools Network tab
4. Manual test: Complete an atom while offline
5. Manual test: Go online, verify progress syncs
6. Manual test: Verify UI shows offline/syncing status
7. Edge case: Queue 50+ items, verify storage doesn't fail

## Do NOT Modify
- Service worker caching logic
- PWA manifest
- API routes (they should work the same)

## Output
When complete:
- Learning works offline (progress queued locally)
- Automatic sync when connection restored
- Visual feedback for offline/syncing states
- No data loss from network interruptions
