/**
 * Cache Strategy Utilities
 * Phase 9.4: Performance Optimization
 *
 * Aggressive caching utilities for improved performance
 */

// Cache duration constants (in seconds)
export const CACHE_DURATIONS = {
  /** Static content that rarely changes - 1 year */
  IMMUTABLE: 31536000,
  /** Long-lived content - 30 days */
  LONG: 2592000,
  /** Medium-lived content - 1 day */
  MEDIUM: 86400,
  /** Short-lived content - 1 hour */
  SHORT: 3600,
  /** Very short-lived content - 5 minutes */
  BRIEF: 300,
  /** No caching */
  NONE: 0,
} as const;

// Stale-while-revalidate durations
export const SWR_DURATIONS = {
  /** Allow stale for 1 day while revalidating */
  LONG: 86400,
  /** Allow stale for 1 hour while revalidating */
  MEDIUM: 3600,
  /** Allow stale for 5 minutes while revalidating */
  SHORT: 300,
} as const;

/**
 * Generate Cache-Control header value
 */
export function getCacheControl(options: {
  maxAge: number;
  staleWhileRevalidate?: number;
  isPublic?: boolean;
  immutable?: boolean;
  mustRevalidate?: boolean;
}): string {
  const directives: string[] = [];

  // Public vs Private
  directives.push(options.isPublic !== false ? 'public' : 'private');

  // Max age
  directives.push(`max-age=${options.maxAge}`);

  // Stale-while-revalidate for background updates
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  // Immutable for truly static content
  if (options.immutable) {
    directives.push('immutable');
  }

  // Must revalidate
  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}

/**
 * In-memory cache for client-side data
 */
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttlMs: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instances for different cache types
export const dataCache = new MemoryCache<unknown>(200);
export const apiCache = new MemoryCache<unknown>(100);

/**
 * Wrapper for fetch with caching support
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & {
    cacheTtlMs?: number;
    forceRefresh?: boolean;
  }
): Promise<T> {
  const { cacheTtlMs = CACHE_DURATIONS.SHORT * 1000, forceRefresh = false, ...fetchOptions } = options || {};
  const cacheKey = `fetch:${url}:${JSON.stringify(fetchOptions)}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey) as T | null;
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch fresh data
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;

  // Cache the response
  apiCache.set(cacheKey, data, cacheTtlMs);

  return data;
}

/**
 * Deduplicate concurrent requests for the same resource
 */
const pendingRequests = new Map<string, Promise<unknown>>();

export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const key = `${url}:${JSON.stringify(options)}`;

  // Return existing promise if request is in flight
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  // Create new request
  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise as Promise<T>;
}

/**
 * Preload data into cache
 */
export function preloadData<T>(key: string, data: T, ttlMs: number = CACHE_DURATIONS.MEDIUM * 1000): void {
  dataCache.set(key, data, ttlMs);
}

/**
 * Get or compute cached data
 */
export async function getOrCompute<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs: number = CACHE_DURATIONS.MEDIUM * 1000
): Promise<T> {
  // Check cache first
  const cached = dataCache.get(key) as T | null;
  if (cached !== null) {
    return cached;
  }

  // Compute and cache
  const data = await compute();
  dataCache.set(key, data, ttlMs);
  return data;
}

/**
 * Invalidate cache entries matching a pattern
 * Note: This is a simplified implementation that clears all caches.
 * In production, you might want more sophisticated invalidation.
 */
export function invalidatePattern(_pattern: RegExp): void {
  dataCache.clear();
  apiCache.clear();
}

/**
 * Local storage cache with expiry
 */
export const localStorageCache = {
  set<T>(key: string, data: T, ttlMs: number): void {
    if (typeof window === 'undefined') return;

    const entry = {
      data,
      expiry: Date.now() + ttlMs,
    };

    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch {
      // Storage quota exceeded - clear old cache entries
      this.clearExpired();
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(`cache:${key}`);
      if (!raw) return null;

      const entry = JSON.parse(raw) as { data: T; expiry: number };

      if (Date.now() > entry.expiry) {
        localStorage.removeItem(`cache:${key}`);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache:${key}`);
  },

  clearExpired(): void {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry = JSON.parse(raw) as { expiry: number };
            if (Date.now() > entry.expiry) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  clear(): void {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  },
};

/**
 * Session storage cache (cleared when tab closes)
 */
export const sessionStorageCache = {
  set<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(data));
    } catch {
      // Storage quota exceeded
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = sessionStorage.getItem(`cache:${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(`cache:${key}`);
  },

  clear(): void {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  },
};
