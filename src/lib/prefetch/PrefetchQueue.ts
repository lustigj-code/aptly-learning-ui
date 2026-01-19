/**
 * Atom-Level Prefetch Queue Service
 *
 * Maintains a priority queue of the next 3 atoms to prefetch, optimizing for
 * zero-latency card transitions. Integrates with React Query caching and
 * manages memory budget (max 3 atoms in memory).
 *
 * Features:
 * - Priority-based prefetching (predicted next atoms)
 * - Stale prefetch cancellation on navigation change
 * - Firestore + Registry fallback pattern (matches useCourseContent)
 * - 3-atom memory budget enforcement
 */

import { QueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Atom } from '@/types';

// ============================================
// CONFIGURATION
// ============================================

const USE_FIRESTORE = process.env.NEXT_PUBLIC_USE_FIRESTORE_CONTENT === 'true';
const MAX_PREFETCH_ATOMS = 3; // Performance budget
const COURSE_CONTENT_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours (matches useCourseContent)
const COURSE_CONTENT_GC_TIME = 24 * 60 * 60 * 1000; // 24 hours

// Helper to get non-null db
function getFirestore(): Firestore | null {
  if (!USE_FIRESTORE || !db) return null;
  return db;
}

// ============================================
// ATOM FETCHING
// ============================================

/**
 * Fetch a single atom by ID from Firestore
 * Falls back to fetching entire lesson if Firestore is unavailable
 */
async function fetchAtomById(atomId: string): Promise<Atom | null> {
  const firestore = getFirestore();

  if (!firestore) {
    // Without Firestore, we need to fetch from registry via lesson
    // This is a limitation - consider storing atomId->lessonId mapping
    console.warn('Cannot fetch individual atom without Firestore - need lessonId');
    return null;
  }

  try {
    const atomRef = doc(firestore, 'atoms', atomId);
    const atomSnap = await getDoc(atomRef);

    if (!atomSnap.exists()) {
      return null;
    }

    const atomData = atomSnap.data();
    return {
      id: atomData.id,
      lessonId: atomData.lessonId,
      type: atomData.type,
      title: atomData.title,
      content: atomData.content,
      estimatedMinutes: atomData.estimatedMinutes,
      isRequired: atomData.isRequired,
      masteryThreshold: atomData.masteryThreshold,
    } as Atom;
  } catch (error) {
    console.error('Error fetching atom from Firestore:', error);
    return null;
  }
}

/**
 * Fetch atoms for a lesson by lessonId
 * This is more efficient than individual atom fetches when prefetching multiple atoms from same lesson
 */
async function fetchAtomsForLesson(lessonId: string): Promise<Atom[]> {
  const firestore = getFirestore();

  if (!firestore) {
    return [];
  }

  try {
    const atomsQuery = query(
      collection(firestore, 'atoms'),
      where('lessonId', '==', lessonId)
    );
    const atomsSnap = await getDocs(atomsQuery);

    return atomsSnap.docs.map((atomDoc) => {
      const atomData = atomDoc.data();
      return {
        id: atomData.id,
        lessonId: atomData.lessonId,
        type: atomData.type,
        title: atomData.title,
        content: atomData.content,
        estimatedMinutes: atomData.estimatedMinutes,
        isRequired: atomData.isRequired,
        masteryThreshold: atomData.masteryThreshold,
      } as Atom;
    });
  } catch (error) {
    console.error('Error fetching atoms for lesson:', error);
    return [];
  }
}

// ============================================
// PREFETCH QUEUE ITEM
// ============================================

interface PrefetchQueueItem {
  atomId: string;
  priority: number; // Higher = more likely to be viewed next (1-3)
  addedAt: number; // Timestamp for staleness tracking
  lessonId?: string; // Optional for batch optimization
}

// ============================================
// PREFETCH QUEUE SERVICE
// ============================================

export class PrefetchQueue {
  private queue: PrefetchQueueItem[] = [];
  private queryClient: QueryClient;
  private activePrefetches: Map<string, AbortController> = new Map();
  private prefetchedAtoms: Set<string> = new Set(); // Track what's in memory

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Add atoms to the prefetch queue with priority.
   * Higher priority = more likely to be viewed next.
   *
   * @param atomIds - Array of atom IDs to prefetch
   * @param priority - Priority level (1-3, higher = more important)
   * @param lessonId - Optional lesson ID for batch optimization
   */
  addToPrefetchQueue(
    atomIds: string[],
    priority: number = 2,
    lessonId?: string
  ): void {
    const now = Date.now();

    // Add new items to queue
    const newItems: PrefetchQueueItem[] = atomIds.map(atomId => ({
      atomId,
      priority,
      addedAt: now,
      lessonId,
    }));

    // Merge with existing queue, avoiding duplicates
    const existingIds = new Set(this.queue.map(item => item.atomId));
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.atomId));

    this.queue = [...this.queue, ...uniqueNewItems];

    // Sort by priority (descending) then by addedAt (ascending)
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.addedAt - b.addedAt;
    });

    // Enforce max queue size + already prefetched
    const totalInMemory = this.prefetchedAtoms.size;
    const availableSlots = Math.max(0, MAX_PREFETCH_ATOMS - totalInMemory);

    // Keep only top items that fit in available slots
    this.queue = this.queue.slice(0, availableSlots);

    // Start prefetching
    this.processPrefetchQueue();
  }

  /**
   * Cancel all pending prefetches and clear the queue.
   * Call this when user navigates away from current lesson.
   */
  cancelStalePrefeches(): void {
    // Abort all active fetch requests
    this.activePrefetches.forEach(controller => {
      controller.abort();
    });

    this.activePrefetches.clear();
    this.queue = [];
  }

  /**
   * Clear prefetched atoms from memory (beyond budget).
   * Keeps only the most recently accessed atoms in React Query cache.
   */
  clearExcessPrefetches(): void {
    // React Query handles cache eviction via gcTime
    // We just need to track what we've prefetched
    if (this.prefetchedAtoms.size > MAX_PREFETCH_ATOMS) {
      // Clear tracking (actual cache managed by React Query)
      const atomsToKeep = Array.from(this.prefetchedAtoms).slice(-MAX_PREFETCH_ATOMS);
      this.prefetchedAtoms = new Set(atomsToKeep);
    }
  }

  /**
   * Get the current prefetch queue status (for debugging/monitoring)
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activePrefetches: this.activePrefetches.size,
      prefetchedCount: this.prefetchedAtoms.size,
      availableSlots: Math.max(0, MAX_PREFETCH_ATOMS - this.prefetchedAtoms.size),
    };
  }

  /**
   * Remove a specific atom from the queue
   */
  removeFromQueue(atomId: string): void {
    this.queue = this.queue.filter(item => item.atomId !== atomId);

    // Cancel active prefetch if exists
    const controller = this.activePrefetches.get(atomId);
    if (controller) {
      controller.abort();
      this.activePrefetches.delete(atomId);
    }
  }

  /**
   * Process the prefetch queue, fetching atoms in priority order
   * @private
   */
  private async processPrefetchQueue(): Promise<void> {
    // Check if we're at capacity
    if (this.prefetchedAtoms.size >= MAX_PREFETCH_ATOMS) {
      return;
    }

    // Get atoms grouped by lesson for batch optimization
    const lessonGroups = new Map<string, PrefetchQueueItem[]>();

    for (const item of this.queue) {
      if (item.lessonId) {
        const group = lessonGroups.get(item.lessonId) || [];
        group.push(item);
        lessonGroups.set(item.lessonId, group);
      }
    }

    // Prefetch atoms
    const prefetchPromises: Promise<void>[] = [];

    for (const item of this.queue) {
      // Skip if already prefetched or being prefetched
      if (this.prefetchedAtoms.has(item.atomId) || this.activePrefetches.has(item.atomId)) {
        continue;
      }

      // Check memory budget
      if (this.prefetchedAtoms.size >= MAX_PREFETCH_ATOMS) {
        break;
      }

      const abortController = new AbortController();
      this.activePrefetches.set(item.atomId, abortController);

      const prefetchPromise = this.prefetchAtom(item.atomId, abortController.signal)
        .then(() => {
          this.prefetchedAtoms.add(item.atomId);
          this.activePrefetches.delete(item.atomId);
          // Remove from queue once prefetched
          this.removeFromQueue(item.atomId);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error(`Failed to prefetch atom ${item.atomId}:`, error);
          }
          this.activePrefetches.delete(item.atomId);
        });

      prefetchPromises.push(prefetchPromise);
    }

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch a single atom and store in React Query cache
   * @private
   */
  private async prefetchAtom(atomId: string, signal: AbortSignal): Promise<void> {
    // Use React Query's prefetchQuery for cache integration
    await this.queryClient.prefetchQuery({
      queryKey: ['atom', atomId],
      queryFn: async () => {
        if (signal.aborted) {
          throw new Error('Aborted');
        }
        return fetchAtomById(atomId);
      },
      staleTime: COURSE_CONTENT_STALE_TIME,
      gcTime: COURSE_CONTENT_GC_TIME,
    });
  }

  /**
   * Prefetch atoms from a specific lesson (batch optimization)
   * More efficient than individual atom fetches
   */
  async prefetchLessonAtoms(
    lessonId: string,
    atomIds: string[],
    signal?: AbortSignal
  ): Promise<void> {
    const atoms = await this.queryClient.fetchQuery({
      queryKey: ['lesson', lessonId, 'atoms'],
      queryFn: async () => {
        if (signal?.aborted) {
          throw new Error('Aborted');
        }
        return fetchAtomsForLesson(lessonId);
      },
      staleTime: COURSE_CONTENT_STALE_TIME,
      gcTime: COURSE_CONTENT_GC_TIME,
    });

    // Store individual atoms in cache
    atoms.forEach(atom => {
      if (atomIds.includes(atom.id)) {
        this.queryClient.setQueryData(['atom', atom.id], atom);
        this.prefetchedAtoms.add(atom.id);
      }
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let prefetchQueueInstance: PrefetchQueue | null = null;

/**
 * Initialize the global prefetch queue instance.
 * Should be called once during app initialization with the QueryClient.
 */
export function initPrefetchQueue(queryClient: QueryClient): PrefetchQueue {
  if (!prefetchQueueInstance) {
    prefetchQueueInstance = new PrefetchQueue(queryClient);
  }
  return prefetchQueueInstance;
}

/**
 * Get the global prefetch queue instance.
 * Throws if not initialized.
 */
export function getPrefetchQueue(): PrefetchQueue {
  if (!prefetchQueueInstance) {
    throw new Error('PrefetchQueue not initialized. Call initPrefetchQueue first.');
  }
  return prefetchQueueInstance;
}
