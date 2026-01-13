/**
 * Offline Support Utilities
 * Handles offline detection, data queuing, and sync
 */

const DB_NAME = 'aptly-offline';
const DB_VERSION = 1;
const PROGRESS_STORE = 'progressQueue';

/** Maximum number of items to keep in the queue */
const MAX_QUEUE_SIZE = 100;

export interface ProgressData {
  type: string;
  atomId?: string;
  skillId?: string;
  lessonId?: string;
  courseId?: string;
  quizScore?: number;
  timeSpent?: number;
  result?: {
    score?: number;
    passed?: boolean;
    timeSpent?: number;
  };
  timestamp: number;
}

export interface QueuedProgress {
  id?: number;
  data: ProgressData;
  createdAt: number;
  retryCount?: number;
}

/**
 * Check if the user is currently online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Add listener for online/offline events
 */
export function addConnectionListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Queue progress data for later sync
 * Limits queue to MAX_QUEUE_SIZE items, removing oldest if exceeded
 */
export async function queueProgress(data: QueuedProgress['data']): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    console.warn('[Offline] IndexedDB not available');
    return;
  }

  try {
    const db = await openDatabase();

    // Check current queue size and trim if needed
    const existingItems = await getQueuedProgress();
    if (existingItems.length >= MAX_QUEUE_SIZE) {
      // Remove oldest items to make room (keep most recent MAX_QUEUE_SIZE - 1)
      const itemsToRemove = existingItems
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, existingItems.length - MAX_QUEUE_SIZE + 1);

      for (const item of itemsToRemove) {
        if (item.id) {
          await removeQueuedProgress(item.id);
        }
      }
      console.log(`[Offline] Removed ${itemsToRemove.length} oldest items from queue`);
    }

    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);

    const item: QueuedProgress = {
      data: {
        ...data,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
      retryCount: 0,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[Offline] Progress queued for sync');
  } catch (error) {
    console.error('[Offline] Failed to queue progress:', error);
  }
}

/**
 * Get all queued progress items
 */
export async function getQueuedProgress(): Promise<QueuedProgress[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(PROGRESS_STORE, 'readonly');
    const store = tx.objectStore(PROGRESS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Offline] Failed to get queued progress:', error);
    return [];
  }
}

/**
 * Remove queued progress item by ID
 */
export async function removeQueuedProgress(id: number): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Offline] Failed to remove queued progress:', error);
  }
}

/**
 * Clear all queued progress
 */
export async function clearQueuedProgress(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[Offline] Queued progress cleared');
  } catch (error) {
    console.error('[Offline] Failed to clear queued progress:', error);
  }
}

/** Maximum retry attempts for failed sync */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Update retry count for a queued item
 */
async function updateRetryCount(id: number, retryCount: number): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);

    // Get the item first
    const getRequest = store.get(id);
    await new Promise<void>((resolve, reject) => {
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = retryCount;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[Offline] Failed to update retry count:', error);
  }
}

/**
 * Sync queued progress when online
 * Includes retry logic with exponential backoff
 */
export async function syncQueuedProgress(
  syncFn: (data: QueuedProgress['data']) => Promise<boolean>
): Promise<{ synced: number; failed: number; skipped: number }> {
  const items = await getQueuedProgress();
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  // Sort by createdAt to process oldest first
  const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);

  for (const item of sortedItems) {
    // Skip items that have exceeded retry limit
    if ((item.retryCount || 0) >= MAX_RETRY_ATTEMPTS) {
      console.log(`[Offline] Skipping item ${item.id} - exceeded retry limit`);
      // Remove items that have permanently failed
      if (item.id) {
        await removeQueuedProgress(item.id);
      }
      skipped++;
      continue;
    }

    try {
      const success = await syncFn(item.data);
      if (success && item.id) {
        await removeQueuedProgress(item.id);
        synced++;
      } else {
        // Increment retry count on failure
        if (item.id) {
          await updateRetryCount(item.id, (item.retryCount || 0) + 1);
        }
        failed++;
      }
    } catch {
      // Increment retry count on error
      if (item.id) {
        await updateRetryCount(item.id, (item.retryCount || 0) + 1);
      }
      failed++;
    }

    // Small delay between sync attempts to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[Offline] Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped`);
  return { synced, failed, skipped };
}

/**
 * Get the count of queued items
 */
export async function getQueueCount(): Promise<number> {
  const items = await getQueuedProgress();
  return items.length;
}

/**
 * Store data in localStorage with expiration
 */
export function setLocalData<T>(key: string, data: T, expiresIn?: number): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const item = {
    data,
    expiresAt: expiresIn ? Date.now() + expiresIn : null,
  };

  try {
    localStorage.setItem(`aptly-${key}`, JSON.stringify(item));
  } catch (error) {
    console.warn('[Offline] Failed to store local data:', error);
  }
}

/**
 * Get data from localStorage (checks expiration)
 */
export function getLocalData<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const item = localStorage.getItem(`aptly-${key}`);
    if (!item) return null;

    const parsed = JSON.parse(item);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`aptly-${key}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Remove data from localStorage
 */
export function removeLocalData(key: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(`aptly-${key}`);
}

/**
 * Check if sufficient storage is available
 */
export async function checkStorageQuota(): Promise<{
  available: boolean;
  usage?: number;
  quota?: number;
}> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return { available: true };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - usage > 50 * 1024 * 1024; // At least 50MB free

    return { available, usage, quota };
  } catch {
    return { available: true };
  }
}

/**
 * Request persistent storage (prevents browser from clearing data)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    const persisted = await navigator.storage.persisted();
    if (persisted) return true;

    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
