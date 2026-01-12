/**
 * Service Worker Registration and Management
 * Handles PWA installation and offline capabilities
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface CacheStatus {
  caches: Record<string, { count: number; urls: string[] }>;
  totalSize: number;
}

let swRegistration: ServiceWorkerRegistration | null = null;
let updateCallback: (() => void) | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      isRegistered: false,
      isUpdateAvailable: false,
      registration: null,
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (updateCallback) {
              updateCallback();
            }
          }
        });
      }
    });

    // Handle controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload to get new version
      window.location.reload();
    });

    console.log('[PWA] Service worker registered successfully');

    return {
      isSupported: true,
      isRegistered: true,
      isUpdateAvailable: false,
      registration,
    };
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return {
      isSupported: true,
      isRegistered: false,
      isUpdateAvailable: false,
      registration: null,
    };
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  try {
    const result = await swRegistration.unregister();
    swRegistration = null;
    console.log('[PWA] Service worker unregistered');
    return result;
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<void> {
  if (swRegistration) {
    await swRegistration.update();
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Set callback for when updates are available
 */
export function onUpdateAvailable(callback: () => void): void {
  updateCallback = callback;
}

/**
 * Send message to service worker
 */
export function sendMessage(message: unknown): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Cache a course for offline access
 */
export function cacheCourse(courseId: string): void {
  sendMessage({ type: 'CACHE_COURSE', courseId });
}

/**
 * Clear all service worker caches
 */
export function clearCache(): void {
  sendMessage({ type: 'CLEAR_CACHE' });
}

/**
 * Get cache status from service worker
 */
export async function getCacheStatus(): Promise<CacheStatus | null> {
  if (!navigator.serviceWorker.controller) {
    return null;
  }

  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(null);
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHE_STATUS' },
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Request background sync
 */
export async function requestBackgroundSync(tag: string): Promise<boolean> {
  if (!swRegistration || !('sync' in swRegistration)) {
    return false;
  }

  try {
    // @ts-expect-error - Background sync API
    await swRegistration.sync.register(tag);
    return true;
  } catch (error) {
    console.error('[PWA] Failed to register background sync:', error);
    return false;
  }
}

/**
 * Get service worker registration
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}
