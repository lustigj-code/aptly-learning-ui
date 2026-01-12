/// <reference lib="webworker" />

/**
 * Aptly Learning Service Worker
 * Provides offline support and caching strategies for course content
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `aptly-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aptly-dynamic-${CACHE_VERSION}`;
const COURSE_CACHE = `aptly-courses-${CACHE_VERSION}`;
const API_CACHE = `aptly-api-${CACHE_VERSION}`;

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/learn',
  '/coach',
  '/offline',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

// API routes that should be cached for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/courses\/.*/,
  /\/api\/progress\/.*/,
  /\/api\/users\/profile/,
];

// Maximum age for different cache types (in seconds)
const CACHE_MAX_AGE = {
  static: 7 * 24 * 60 * 60, // 7 days
  api: 5 * 60, // 5 minutes
  course: 24 * 60 * 60, // 24 hours
};

// Maximum items in dynamic cache
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_API_CACHE_ITEMS = 30;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Failed to cache some static assets:', error);
        // Don't fail install if some assets aren't available
        return Promise.resolve();
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('aptly-') &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE &&
              name !== COURSE_CACHE &&
              name !== API_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different request types
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, CACHE_MAX_AGE.api));
  } else if (isCourseContent(url)) {
    event.respondWith(cacheFirstWithNetwork(request, COURSE_CACHE, CACHE_MAX_AGE.course));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE, CACHE_MAX_AGE.static));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirstWithFallback(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

/**
 * Check if request is for API
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Check if request is for course content
 */
function isCourseContent(url) {
  return (
    url.pathname.includes('/courses/') ||
    url.pathname.includes('/lessons/') ||
    url.pathname.includes('/videos/') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm')
  );
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ico')
  );
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Network first with cache fallback
 * Best for API requests that need fresh data
 */
async function networkFirstWithCache(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();

      // Add timestamp header for cache validation
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      await cache.put(request, cachedResponse);
      await trimCache(cacheName, MAX_API_CACHE_ITEMS);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is still valid
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      if (cacheTime && Date.now() - parseInt(cacheTime, 10) < maxAge * 1000) {
        return cachedResponse;
      }
    }

    return cachedResponse || new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Cache first with network fallback
 * Best for static assets and course content
 */
async function cacheFirstWithNetwork(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Check cache freshness
    const cacheTime = cachedResponse.headers.get('sw-cache-time');
    const isFresh = !cacheTime || Date.now() - parseInt(cacheTime, 10) < maxAge * 1000;

    if (isFresh) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();

      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      await cache.put(request, cachedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, returning cached:', request.url);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

/**
 * Network first with offline fallback for navigation
 */
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation offline, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }

    // Fallback to root page
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

/**
 * Stale while revalidate
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        await trimCache(cacheName, MAX_DYNAMIC_CACHE_ITEMS);
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/**
 * Trim cache to maximum size
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map((key) => cache.delete(key)));
  }
}

/**
 * Handle background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

/**
 * Sync queued progress updates
 */
async function syncProgress() {
  try {
    // Get queued progress from IndexedDB
    const db = await openDatabase();
    const tx = db.transaction('progressQueue', 'readwrite');
    const store = tx.objectStore('progressQueue');
    const items = await store.getAll();

    for (const item of items) {
      try {
        await fetch('/api/progress/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        await store.delete(item.id);
      } catch (error) {
        console.error('[SW] Failed to sync item:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Open IndexedDB for offline queue
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('aptly-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('progressQueue')) {
        db.createObjectStore('progressQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Aptly Learning', options)
  );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none found
      return clients.openWindow(url);
    })
  );
});

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_COURSE') {
    event.waitUntil(cacheCourseContent(event.data.courseId));
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }

  if (event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(getCacheStatus().then((status) => {
      event.ports[0].postMessage(status);
    }));
  }
});

/**
 * Cache course content for offline access
 */
async function cacheCourseContent(courseId) {
  try {
    console.log('[SW] Caching course:', courseId);
    const cache = await caches.open(COURSE_CACHE);

    // Fetch course data
    const courseResponse = await fetch(`/api/courses/${courseId}`);
    if (courseResponse.ok) {
      await cache.put(`/api/courses/${courseId}`, courseResponse.clone());

      const courseData = await courseResponse.json();

      // Cache all lesson content
      if (courseData.modules) {
        for (const module of courseData.modules) {
          if (module.lessons) {
            for (const lesson of module.lessons) {
              try {
                const lessonResponse = await fetch(`/api/courses/${courseId}/lessons/${lesson.id}`);
                if (lessonResponse.ok) {
                  await cache.put(`/api/courses/${courseId}/lessons/${lesson.id}`, lessonResponse);
                }
              } catch (e) {
                console.warn('[SW] Failed to cache lesson:', lesson.id);
              }
            }
          }
        }
      }
    }

    console.log('[SW] Course cached successfully:', courseId);
  } catch (error) {
    console.error('[SW] Failed to cache course:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('aptly-'))
      .map((name) => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

/**
 * Get cache status
 */
async function getCacheStatus() {
  const status = {
    caches: {},
    totalSize: 0,
  };

  const cacheNames = await caches.keys();
  for (const name of cacheNames.filter((n) => n.startsWith('aptly-'))) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status.caches[name] = {
      count: keys.length,
      urls: keys.map((k) => k.url),
    };
  }

  return status;
}

console.log('[SW] Service Worker loaded');
