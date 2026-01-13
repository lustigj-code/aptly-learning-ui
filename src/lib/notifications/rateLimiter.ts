/**
 * Notification Rate Limiter
 *
 * Prevents notification spam by enforcing cooldown periods between
 * notifications of the same type to the same user.
 */

import { adminDb } from '../firebase/admin';
import type { NotificationType } from './types';

// ============================================
// CONSTANTS
// ============================================

// Cooldown period in milliseconds (4 hours)
export const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000;

// Type-specific cooldowns (override default)
const TYPE_COOLDOWNS: Partial<Record<NotificationType, number>> = {
  streak_at_risk: 6 * 60 * 60 * 1000, // 6 hours - important but not spammy
  streak_reminder: 24 * 60 * 60 * 1000, // 24 hours - once per day
  review_due: 4 * 60 * 60 * 1000, // 4 hours
  review_overdue: 24 * 60 * 60 * 1000, // 24 hours - once per day
  weekly_summary: 7 * 24 * 60 * 60 * 1000, // 7 days
  course_reminder: 8 * 60 * 60 * 1000, // 8 hours
  achievement_unlock: 0, // No cooldown for achievements
  badge_earned: 0, // No cooldown for badges
  level_up: 0, // No cooldown for level ups
};

// ============================================
// FIRESTORE COLLECTION
// ============================================

const NOTIFICATION_LOG_COLLECTION = 'notificationLogs';

// ============================================
// RATE LIMITING FUNCTIONS
// ============================================

/**
 * Check if a notification can be sent to a user
 * Returns true if cooldown has passed, false otherwise
 *
 * @param userId - The user ID to check
 * @param type - The notification type
 * @returns Whether the notification can be sent
 */
export async function canSendNotification(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    // Get cooldown for this type
    const cooldownMs = TYPE_COOLDOWNS[type] ?? NOTIFICATION_COOLDOWN_MS;

    // No cooldown for this type
    if (cooldownMs === 0) {
      return true;
    }

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - cooldownMs);

    // Query for recent notifications of this type to this user
    const recentNotifications = await adminDb
      .collection(NOTIFICATION_LOG_COLLECTION)
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('sentAt', '>', cutoffTime)
      .limit(1)
      .get();

    // If no recent notifications, can send
    return recentNotifications.empty;
  } catch (error) {
    console.error('canSendNotification error:', error);
    // On error, allow the notification (fail open)
    return true;
  }
}

/**
 * Record that a notification was sent
 * This updates the cooldown tracking
 *
 * @param userId - The user ID
 * @param type - The notification type
 */
export async function recordNotificationSent(
  userId: string,
  type: NotificationType
): Promise<void> {
  try {
    await adminDb.collection(NOTIFICATION_LOG_COLLECTION).add({
      userId,
      type,
      sentAt: new Date(),
    });
  } catch (error) {
    console.error('recordNotificationSent error:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get the time until next notification of a type can be sent
 * Returns 0 if notification can be sent now
 *
 * @param userId - The user ID
 * @param type - The notification type
 * @returns Milliseconds until notification can be sent
 */
export async function getTimeUntilNextNotification(
  userId: string,
  type: NotificationType
): Promise<number> {
  try {
    const cooldownMs = TYPE_COOLDOWNS[type] ?? NOTIFICATION_COOLDOWN_MS;

    if (cooldownMs === 0) {
      return 0;
    }

    // Get most recent notification of this type
    const recentSnap = await adminDb
      .collection(NOTIFICATION_LOG_COLLECTION)
      .where('userId', '==', userId)
      .where('type', '==', type)
      .orderBy('sentAt', 'desc')
      .limit(1)
      .get();

    if (recentSnap.empty) {
      return 0;
    }

    const lastSent = recentSnap.docs[0].data();
    const lastSentTime = lastSent.sentAt?.toDate?.() || new Date(lastSent.sentAt);
    const nextAllowedTime = lastSentTime.getTime() + cooldownMs;
    const timeUntil = nextAllowedTime - Date.now();

    return Math.max(0, timeUntil);
  } catch (error) {
    console.error('getTimeUntilNextNotification error:', error);
    return 0;
  }
}

/**
 * Clear notification history for a user (for testing or user request)
 *
 * @param userId - The user ID
 * @param type - Optional specific type to clear, or all if not provided
 */
export async function clearNotificationHistory(
  userId: string,
  type?: NotificationType
): Promise<void> {
  try {
    let query = adminDb
      .collection(NOTIFICATION_LOG_COLLECTION)
      .where('userId', '==', userId);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snap = await query.get();

    const batch = adminDb.batch();
    snap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('clearNotificationHistory error:', error);
  }
}

/**
 * Get notification statistics for a user
 *
 * @param userId - The user ID
 * @returns Count of notifications by type in last 24 hours
 */
export async function getNotificationStats(
  userId: string
): Promise<Record<string, number>> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const snap = await adminDb
      .collection(NOTIFICATION_LOG_COLLECTION)
      .where('userId', '==', userId)
      .where('sentAt', '>', oneDayAgo)
      .get();

    const stats: Record<string, number> = {};

    snap.docs.forEach((doc) => {
      const type = doc.data().type as string;
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('getNotificationStats error:', error);
    return {};
  }
}
