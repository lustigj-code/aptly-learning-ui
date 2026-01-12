/**
 * Firebase Cloud Messaging Client Setup
 *
 * Handles FCM initialization for push notifications on the client side.
 * This module should only be imported in client-side code.
 */

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from '../firebase/config';

// FCM messaging instance (lazily initialized)
let messaging: Messaging | null = null;

/**
 * Check if FCM is supported in the current environment
 */
export function isFCMSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get the FCM messaging instance
 * Lazily initializes on first call
 */
export function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isFCMSupported()) {
    console.warn('FCM is not supported in this browser');
    return null;
  }

  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      return null;
    }
  }

  return messaging;
}

/**
 * Request notification permission from the user
 * Returns the permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isFCMSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isFCMSupported()) {
    return 'denied';
  }

  return Notification.permission;
}

/**
 * Get FCM registration token
 * Requires notification permission to be granted
 */
export async function getFCMToken(): Promise<string | null> {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return null;
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('VAPID key not configured');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Subscribe to foreground messages
 * Returns an unsubscribe function
 */
export function onForegroundMessage(
  callback: (payload: {
    notification?: {
      title?: string;
      body?: string;
      image?: string;
    };
    data?: Record<string, string>;
  }) => void
): () => void {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, callback);
}

/**
 * Register the service worker for background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}
