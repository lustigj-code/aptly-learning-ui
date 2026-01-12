'use client';

/**
 * useNotifications Hook
 *
 * React hook for managing push notification permissions and subscriptions.
 * Handles FCM token registration, permission requests, and foreground messages.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isFCMSupported,
  requestNotificationPermission,
  getNotificationPermission,
  getFCMToken,
  onForegroundMessage,
  registerServiceWorker,
} from '@/lib/notifications/fcm';
import { getIdToken } from '@/lib/firebase/auth';

// ============================================
// TYPES
// ============================================

type NotificationStatus =
  | 'loading'
  | 'unsupported'
  | 'permission-required'
  | 'permission-denied'
  | 'subscribed'
  | 'error';

type ForegroundMessage = {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
};

type UseNotificationsOptions = {
  onMessage?: (message: ForegroundMessage) => void;
  autoSubscribe?: boolean;
  userId?: string;
};

type UseNotificationsReturn = {
  status: NotificationStatus;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
};

// ============================================
// HOOK
// ============================================

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { onMessage, autoSubscribe = false, userId } = options;

  // State
  const [status, setStatus] = useState<NotificationStatus>('loading');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const unsubscribeMessageRef = useRef<(() => void) | null>(null);
  const currentTokenRef = useRef<string | null>(null);

  /**
   * Initialize notification state
   */
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check browser support
    if (!isFCMSupported()) {
      setStatus('unsupported');
      setIsLoading(false);
      return;
    }

    // Check current permission
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === 'denied') {
      setStatus('permission-denied');
      setIsLoading(false);
      return;
    }

    if (currentPermission === 'default') {
      setStatus('permission-required');
      setIsLoading(false);
      return;
    }

    // Permission is granted - check if already subscribed
    try {
      const token = await getFCMToken();
      if (token) {
        currentTokenRef.current = token;
        setIsSubscribed(true);
        setStatus('subscribed');
      } else {
        setStatus('permission-required');
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setStatus('error');
      setError('Failed to check notification subscription');
    }

    setIsLoading(false);
  }, []);

  /**
   * Request notification permission
   */
  const requestPermissionHandler = useCallback(async (): Promise<NotificationPermission> => {
    if (!isFCMSupported()) {
      return 'denied';
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        setStatus('permission-required'); // Ready to subscribe
      } else if (newPermission === 'denied') {
        setStatus('permission-denied');
      }

      return newPermission;
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError('Failed to request notification permission');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isFCMSupported()) {
      setError('Push notifications are not supported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if needed
      let currentPermission = getNotificationPermission();
      if (currentPermission === 'default') {
        currentPermission = await requestNotificationPermission();
      }

      if (currentPermission !== 'granted') {
        setStatus('permission-denied');
        setError('Notification permission denied');
        return false;
      }

      setPermission(currentPermission);

      // Register service worker
      await registerServiceWorker();

      // Get FCM token
      const token = await getFCMToken();
      if (!token) {
        throw new Error('Failed to get FCM token');
      }

      // Send token to backend
      const authToken = await getIdToken();
      if (!authToken && !userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || userId}`,
        },
        body: JSON.stringify({
          token,
          platform: 'web',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to subscribe');
      }

      currentTokenRef.current = token;
      setIsSubscribed(true);
      setStatus('subscribed');

      return true;
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      setStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!currentTokenRef.current) {
      return true; // Already unsubscribed
    }

    setIsLoading(true);
    setError(null);

    try {
      const authToken = await getIdToken();

      const response = await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || userId || ''}`,
        },
        body: JSON.stringify({
          token: currentTokenRef.current,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      currentTokenRef.current = null;
      setIsSubscribed(false);
      setStatus('permission-required');

      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-subscribe if enabled and permission granted
  useEffect(() => {
    if (
      autoSubscribe &&
      permission === 'granted' &&
      !isSubscribed &&
      !isLoading &&
      status !== 'error'
    ) {
      subscribe();
    }
  }, [autoSubscribe, permission, isSubscribed, isLoading, status, subscribe]);

  // Set up foreground message listener
  useEffect(() => {
    if (!onMessage || !isSubscribed) {
      return;
    }

    unsubscribeMessageRef.current = onForegroundMessage(onMessage);

    return () => {
      if (unsubscribeMessageRef.current) {
        unsubscribeMessageRef.current();
        unsubscribeMessageRef.current = null;
      }
    };
  }, [onMessage, isSubscribed]);

  return {
    status,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission: requestPermissionHandler,
  };
}

// ============================================
// CONVENIENCE HOOK FOR SIMPLE USE CASES
// ============================================

/**
 * Simple hook that just checks if notifications are enabled
 * Uses lazy initialization to avoid setState in useEffect
 */
export function useNotificationStatus(): {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
} {
  // Use lazy initialization to set the initial state correctly
  const [isSupported] = useState(() => isFCMSupported());
  const [permission] = useState<NotificationPermission>(() => getNotificationPermission());

  return {
    isSupported,
    isEnabled: permission === 'granted',
    permission,
  };
}

export default useNotifications;
