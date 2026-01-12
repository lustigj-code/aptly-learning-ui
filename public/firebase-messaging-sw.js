/// <reference lib="webworker" />

/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications from Firebase Cloud Messaging.
 * This service worker is specifically for FCM and works alongside the main sw.js
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (must match the client-side config)
// These values are public and safe to include in client code
const firebaseConfig = {
  apiKey: self.FIREBASE_CONFIG?.apiKey || '',
  authDomain: self.FIREBASE_CONFIG?.authDomain || '',
  projectId: self.FIREBASE_CONFIG?.projectId || '',
  storageBucket: self.FIREBASE_CONFIG?.storageBucket || '',
  messagingSenderId: self.FIREBASE_CONFIG?.messagingSenderId || '',
  appId: self.FIREBASE_CONFIG?.appId || '',
};

// Initialize Firebase (only if config is available)
let messaging = null;

try {
  firebase.initializeApp(firebaseConfig);
  messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Aptly Learning';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: payload.notification?.image || '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      tag: payload.data?.type || 'default',
      data: payload.data || {},
      requireInteraction: payload.data?.priority === 'high',
      vibrate: [100, 50, 100],
      actions: getNotificationActions(payload.data?.type),
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.warn('[FCM SW] Firebase initialization skipped (config not available):', error);
}

/**
 * Get notification actions based on notification type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'streak_reminder':
    case 'streak_at_risk':
      return [
        { action: 'study', title: 'Start Studying' },
        { action: 'snooze', title: 'Remind Later' },
      ];
    case 'review_due':
    case 'review_overdue':
      return [
        { action: 'review', title: 'Start Review' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'achievement_unlock':
    case 'badge_earned':
      return [
        { action: 'view', title: 'View Achievement' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle different actions
  let targetUrl = '/';

  if (action === 'dismiss') {
    return;
  }

  if (action === 'snooze') {
    // Schedule a reminder for 30 minutes later
    // This would need to be handled by the server
    console.log('[FCM SW] Snooze requested');
    return;
  }

  // Determine URL based on notification type and action
  switch (data.type) {
    case 'streak_reminder':
    case 'streak_at_risk':
    case 'streak_lost':
    case 'streak_milestone':
      targetUrl = '/dashboard';
      break;
    case 'review_due':
    case 'review_overdue':
      targetUrl = '/learn/review';
      break;
    case 'achievement_unlock':
    case 'badge_earned':
      targetUrl = '/achievements';
      break;
    case 'level_up':
      targetUrl = '/progress';
      break;
    case 'course_reminder':
      targetUrl = data.courseId ? `/learn/${data.courseId}` : '/learn';
      break;
    case 'daily_goal_reminder':
      targetUrl = '/dashboard';
      break;
    case 'weekly_summary':
      targetUrl = '/progress';
      break;
    default:
      targetUrl = data.clickAction || '/';
  }

  // Navigate to the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open at the target URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if none found
      return clients.openWindow(targetUrl);
    })
  );
});

/**
 * Handle push event (fallback for non-FCM push)
 */
self.addEventListener('push', (event) => {
  // FCM handles this via onBackgroundMessage
  // This is a fallback for direct push messages
  if (!event.data) return;

  try {
    const data = event.data.json();

    // Skip if this looks like an FCM message (FCM handles these)
    if (data.notification || data.from?.includes('firebase')) {
      return;
    }

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Aptly Learning', options)
    );
  } catch (error) {
    console.error('[FCM SW] Error handling push:', error);
  }
});

/**
 * Handle service worker messages
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_FIREBASE_CONFIG') {
    // Allow client to set Firebase config if not hardcoded
    self.FIREBASE_CONFIG = event.data.config;
    console.log('[FCM SW] Firebase config updated');
  }
});

console.log('[FCM SW] Firebase Messaging Service Worker loaded');
