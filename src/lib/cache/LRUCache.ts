/**
 * LRU Cache with TTL Support
 *
 * A simple, lightweight LRU (Least Recently Used) cache with:
 * - Maximum size limits to prevent unbounded growth
 * - TTL (Time To Live) expiration for entries
 * - Periodic cleanup of expired entries
 *
 * Usage:
 *   const cache = new LRUCache<string, UserData>({ maxSize: 100, ttlMs: 300000 });
 *   cache.set('user-123', userData);
 *   const data = cache.get('user-123');
 */

export interface LRUCacheOptions {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Time to live in milliseconds (0 = no expiration) */
  ttlMs?: number;
  /** Cleanup interval in milliseconds (default: 60000 = 1 minute) */
  cleanupIntervalMs?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number | null;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: LRUCacheOptions) {
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs ?? 0;
    this.cache = new Map();

    // Start periodic cleanup if TTL is set
    if (this.ttlMs > 0 && options.cleanupIntervalMs !== 0) {
      const cleanupInterval = options.cleanupIntervalMs ?? 60000;
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);

      // Unref the timer so it doesn't prevent Node.js from exiting
      if (typeof this.cleanupTimer.unref === 'function') {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   * Optionally override TTL for this specific entry
   */
  set(key: K, value: V, ttlMs?: number): void {
    // Delete if exists (to update position)
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const effectiveTtl = ttlMs ?? this.ttlMs;
    const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : null;

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Stop the cleanup timer (call when done with the cache)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

/**
 * Create a simple function memoizer with LRU cache
 *
 * Usage:
 *   const cachedFetch = memoize(
 *     (userId: string) => fetchUserData(userId),
 *     { maxSize: 100, ttlMs: 300000 }
 *   );
 */
export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  options: LRUCacheOptions,
  keyFn?: (...args: Args) => string
): (...args: Args) => R {
  const cache = new LRUCache<string, R>(options);

  return (...args: Args): R => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create an async function memoizer with LRU cache
 *
 * Usage:
 *   const cachedFetch = memoizeAsync(
 *     (userId: string) => fetchUserData(userId),
 *     { maxSize: 100, ttlMs: 300000 }
 *   );
 */
export function memoizeAsync<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  options: LRUCacheOptions,
  keyFn?: (...args: Args) => string
): (...args: Args) => Promise<R> {
  const cache = new LRUCache<string, R>(options);
  const pending = new Map<string, Promise<R>>();

  return async (...args: Args): Promise<R> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    // Check cache first
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if already in-flight (prevent duplicate requests)
    const pendingRequest = pending.get(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Execute and cache
    const promise = fn(...args)
      .then((result) => {
        cache.set(key, result);
        pending.delete(key);
        return result;
      })
      .catch((error) => {
        pending.delete(key);
        throw error;
      });

    pending.set(key, promise);
    return promise;
  };
}

export default LRUCache;
