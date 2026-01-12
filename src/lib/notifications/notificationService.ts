/**
 * Notification Service
 *
 * Server-side service for sending and scheduling push notifications.
 * Uses Firebase Admin SDK to send notifications via FCM.
 */

import { adminDb } from '../firebase/admin';
import * as admin from 'firebase-admin';
import type {
  NotificationPayload,
  NotificationType,
  FCMTokenRecord,
  NotificationPreferences,
  ScheduledNotification,
} from './types';

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { title: string; body: string; icon?: string }
> = {
  streak_reminder: {
    title: 'Keep your streak going!',
    body: "You haven't studied today yet. Keep your {currentStreak}-day streak alive!",
    icon: '/icons/streak.png',
  },
  streak_at_risk: {
    title: 'Your streak is at risk!',
    body: 'Only {hoursRemaining} hours left to keep your {currentStreak}-day streak!',
    icon: '/icons/streak-warning.png',
  },
  streak_lost: {
    title: 'Streak lost',
    body: 'Your {previousStreak}-day streak has ended. Start fresh today!',
    icon: '/icons/streak-lost.png',
  },
  streak_milestone: {
    title: 'Streak milestone!',
    body: "Amazing! You've hit a {streakDays}-day streak!",
    icon: '/icons/streak-milestone.png',
  },
  review_due: {
    title: 'Time to review!',
    body: 'You have {itemCount} items ready for review.',
    icon: '/icons/review.png',
  },
  review_overdue: {
    title: 'Reviews waiting for you',
    body: 'You have {itemCount} items overdue by {daysPastDue} days.',
    icon: '/icons/review-overdue.png',
  },
  achievement_unlock: {
    title: 'Achievement unlocked!',
    body: "You've unlocked: {achievementTitle}! (+{xpEarned} XP)",
    icon: '/icons/achievement.png',
  },
  badge_earned: {
    title: 'New badge earned!',
    body: "You've earned the {badgeTitle} badge!",
    icon: '/icons/badge.png',
  },
  level_up: {
    title: 'Level up!',
    body: "Congratulations! You've reached level {newLevel}!",
    icon: '/icons/level-up.png',
  },
  course_reminder: {
    title: 'Continue learning',
    body: "Pick up where you left off in {courseName}.",
    icon: '/icons/course.png',
  },
  daily_goal_reminder: {
    title: 'Daily goal reminder',
    body: "You've completed {completedMinutes}/{goalMinutes} minutes today.",
    icon: '/icons/goal.png',
  },
  weekly_summary: {
    title: 'Your weekly progress',
    body: 'This week: {lessonsCompleted} lessons, {minutesStudied} minutes, {xpEarned} XP!',
    icon: '/icons/summary.png',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Replace template variables in a string
 */
function interpolateTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
}

/**
 * Build FCM message from notification payload
 */
function buildFCMMessage(
  token: string,
  payload: NotificationPayload
): admin.messaging.Message {
  const template = NOTIFICATION_TEMPLATES[payload.type];
  const data = payload.data || {};

  const title = payload.title || interpolateTemplate(template.title, data);
  const body = payload.body || interpolateTemplate(template.body, data);

  return {
    token,
    notification: {
      title,
      body,
      imageUrl: payload.imageUrl,
    },
    data: {
      ...data,
      type: payload.type,
      clickAction: getClickAction(payload.type),
    },
    webpush: {
      notification: {
        icon: template.icon || '/icons/default.png',
        badge: '/icons/badge-icon.png',
        tag: payload.type,
        requireInteraction: payload.priority === 'high',
      },
      fcmOptions: {
        link: getClickAction(payload.type),
      },
    },
    android: {
      priority: payload.priority === 'high' ? 'high' : 'normal',
      notification: {
        icon: 'ic_notification',
        color: '#6366F1',
        channelId: getChannelId(payload.type),
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          category: payload.type,
        },
      },
    },
  };
}

/**
 * Get click action URL based on notification type
 */
function getClickAction(type: NotificationType): string {
  switch (type) {
    case 'streak_reminder':
    case 'streak_at_risk':
    case 'streak_lost':
    case 'streak_milestone':
      return '/dashboard';
    case 'review_due':
    case 'review_overdue':
      return '/learn/review';
    case 'achievement_unlock':
    case 'badge_earned':
      return '/achievements';
    case 'level_up':
      return '/progress';
    case 'course_reminder':
      return '/learn';
    case 'daily_goal_reminder':
      return '/dashboard';
    case 'weekly_summary':
      return '/progress';
    default:
      return '/';
  }
}

/**
 * Get Android notification channel ID
 */
function getChannelId(type: NotificationType): string {
  if (type.startsWith('streak')) return 'streaks';
  if (type.startsWith('review')) return 'reviews';
  if (['achievement_unlock', 'badge_earned', 'level_up'].includes(type))
    return 'achievements';
  return 'general';
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Save FCM token for a user
 */
export async function saveFCMToken(
  userId: string,
  token: string,
  platform: 'web' | 'ios' | 'android' = 'web'
): Promise<void> {
  const tokenRef = adminDb.collection('fcmTokens').doc(`${userId}_${token.slice(-10)}`);

  const tokenRecord: FCMTokenRecord = {
    userId,
    token,
    platform,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    isActive: true,
  };

  await tokenRef.set(tokenRecord, { merge: true });
}

/**
 * Get all active FCM tokens for a user
 */
export async function getUserTokens(userId: string): Promise<string[]> {
  const tokensSnap = await adminDb
    .collection('fcmTokens')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();

  return tokensSnap.docs.map((doc) => doc.data().token);
}

/**
 * Deactivate a FCM token (e.g., when it becomes invalid)
 */
export async function deactivateToken(token: string): Promise<void> {
  const tokensSnap = await adminDb
    .collection('fcmTokens')
    .where('token', '==', token)
    .get();

  const batch = adminDb.batch();
  tokensSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { isActive: false });
  });

  await batch.commit();
}

// ============================================
// USER PREFERENCES
// ============================================

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const prefsSnap = await adminDb
    .collection('notificationPreferences')
    .doc(userId)
    .get();

  if (!prefsSnap.exists) {
    // Return default preferences
    return {
      enabled: true,
      streakReminders: true,
      reviewAlerts: true,
      achievements: true,
      courseReminders: true,
      weeklySummary: true,
    };
  }

  return prefsSnap.data() as NotificationPreferences;
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  await adminDb
    .collection('notificationPreferences')
    .doc(userId)
    .set(preferences, { merge: true });
}

/**
 * Check if user should receive a notification type
 */
function shouldSendNotification(
  type: NotificationType,
  prefs: NotificationPreferences
): boolean {
  if (!prefs.enabled) return false;

  switch (type) {
    case 'streak_reminder':
    case 'streak_at_risk':
    case 'streak_lost':
    case 'streak_milestone':
      return prefs.streakReminders;
    case 'review_due':
    case 'review_overdue':
      return prefs.reviewAlerts;
    case 'achievement_unlock':
    case 'badge_earned':
    case 'level_up':
      return prefs.achievements;
    case 'course_reminder':
    case 'daily_goal_reminder':
      return prefs.courseReminders;
    case 'weekly_summary':
      return prefs.weeklySummary;
    default:
      return true;
  }
}

/**
 * Check if current time is within quiet hours
 */
function isWithinQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, '0') +
    ':' +
    now.getMinutes().toString().padStart(2, '0');

  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
}

// ============================================
// SEND NOTIFICATIONS
// ============================================

/**
 * Send a push notification to a user
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user preferences
    const prefs = await getUserNotificationPreferences(payload.userId);

    // Check if notification should be sent
    if (!shouldSendNotification(payload.type, prefs)) {
      return { success: true }; // Silent success - user opted out
    }

    // Check quiet hours (unless high priority)
    if (payload.priority !== 'high' && isWithinQuietHours(prefs)) {
      // Schedule for after quiet hours
      const scheduled = await scheduleNotification(payload, getEndOfQuietHours(prefs));
      return {
        success: true,
        error: scheduled ? undefined : 'Failed to schedule notification',
      };
    }

    // Get user tokens
    const tokens = await getUserTokens(payload.userId);
    if (tokens.length === 0) {
      return { success: false, error: 'No active tokens for user' };
    }

    // Send to all tokens
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const message = buildFCMMessage(token, payload);
          await admin.messaging().send(message);
          return { token, success: true };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          // Deactivate invalid tokens
          if (
            errorMessage.includes('not-registered') ||
            errorMessage.includes('invalid-registration-token')
          ) {
            await deactivateToken(token);
          }

          return { token, success: false, error: errorMessage };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    if (successCount === 0) {
      return { success: false, error: 'All delivery attempts failed' };
    }

    // Log notification sent
    await logNotificationSent(payload, successCount, failedCount);

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotification(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    userIds.map(async (userId) => {
      const result = await sendNotification({ ...payload, userId } as NotificationPayload);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    })
  );

  return { sent, failed };
}

// ============================================
// SCHEDULING
// ============================================

/**
 * Schedule a notification for later delivery
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  scheduledFor: Date
): Promise<string | null> {
  try {
    const scheduled: ScheduledNotification = {
      id: `${payload.userId}_${Date.now()}`,
      payload,
      scheduledFor,
      status: 'pending',
      attempts: 0,
    };

    await adminDb.collection('scheduledNotifications').doc(scheduled.id).set(scheduled);

    return scheduled.id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(
  notificationId: string
): Promise<boolean> {
  try {
    await adminDb.collection('scheduledNotifications').doc(notificationId).update({
      status: 'cancelled',
    });
    return true;
  } catch (error) {
    console.error('Failed to cancel notification:', error);
    return false;
  }
}

/**
 * Get pending scheduled notifications (for cron job)
 */
export async function getPendingNotifications(): Promise<ScheduledNotification[]> {
  const now = new Date();
  const snap = await adminDb
    .collection('scheduledNotifications')
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', now)
    .limit(100)
    .get();

  return snap.docs.map((doc) => doc.data() as ScheduledNotification);
}

/**
 * Process scheduled notifications (call from cron job)
 */
export async function processScheduledNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const pending = await getPendingNotifications();
  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const result = await sendNotification(notification.payload);

    await adminDb
      .collection('scheduledNotifications')
      .doc(notification.id)
      .update({
        status: result.success ? 'sent' : 'failed',
        attempts: notification.attempts + 1,
        lastAttemptAt: new Date(),
        error: result.error,
      });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { processed: pending.length, sent, failed };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the end of quiet hours as a Date
 */
function getEndOfQuietHours(prefs: NotificationPreferences): Date {
  if (!prefs.quietHoursEnd) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  }

  const [hours, minutes] = prefs.quietHoursEnd.split(':').map(Number);
  const endTime = new Date();
  endTime.setHours(hours, minutes, 0, 0);

  // If end time is earlier than now, it means quiet hours end tomorrow
  if (endTime <= new Date()) {
    endTime.setDate(endTime.getDate() + 1);
  }

  return endTime;
}

/**
 * Log notification sent for analytics
 */
async function logNotificationSent(
  payload: NotificationPayload,
  successCount: number,
  failedCount: number
): Promise<void> {
  try {
    await adminDb.collection('notificationLogs').add({
      userId: payload.userId,
      type: payload.type,
      sentAt: new Date(),
      successCount,
      failedCount,
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON NOTIFICATIONS
// ============================================

/**
 * Send streak reminder notification
 */
export async function sendStreakReminder(
  userId: string,
  currentStreak: number
): Promise<{ success: boolean; error?: string }> {
  return sendNotification({
    userId,
    type: 'streak_reminder',
    title: 'Keep your streak going!',
    body: `You haven't studied today yet. Keep your ${currentStreak}-day streak alive!`,
    data: {
      currentStreak: currentStreak.toString(),
      notificationType: 'streak_reminder',
    },
    priority: 'normal',
  });
}

/**
 * Send streak at risk notification
 */
export async function sendStreakAtRisk(
  userId: string,
  currentStreak: number,
  hoursRemaining: number
): Promise<{ success: boolean; error?: string }> {
  return sendNotification({
    userId,
    type: 'streak_at_risk',
    title: 'Your streak is at risk!',
    body: `Only ${hoursRemaining} hours left to keep your ${currentStreak}-day streak!`,
    data: {
      currentStreak: currentStreak.toString(),
      hoursRemaining: hoursRemaining.toString(),
      notificationType: 'streak_at_risk',
    },
    priority: 'high',
  });
}

/**
 * Send review due notification
 */
export async function sendReviewDue(
  userId: string,
  itemCount: number,
  topicName?: string
): Promise<{ success: boolean; error?: string }> {
  const body = topicName
    ? `You have ${itemCount} ${topicName} items ready for review.`
    : `You have ${itemCount} items ready for review.`;

  return sendNotification({
    userId,
    type: 'review_due',
    title: 'Time to review!',
    body,
    data: {
      itemCount: itemCount.toString(),
      topicName: topicName || '',
      notificationType: 'review_due',
    },
    priority: 'normal',
  });
}

/**
 * Send badge earned notification
 */
export async function sendBadgeEarned(
  userId: string,
  badgeId: string,
  badgeTitle: string,
  badgeRarity: string
): Promise<{ success: boolean; error?: string }> {
  return sendNotification({
    userId,
    type: 'badge_earned',
    title: 'New badge earned!',
    body: `You've earned the ${badgeTitle} badge!`,
    data: {
      badgeId,
      badgeTitle,
      badgeRarity,
      notificationType: 'badge_earned',
    },
    priority: 'normal',
  });
}

/**
 * Send achievement unlock notification
 */
export async function sendAchievementUnlock(
  userId: string,
  achievementId: string,
  achievementTitle: string,
  xpEarned: number
): Promise<{ success: boolean; error?: string }> {
  return sendNotification({
    userId,
    type: 'achievement_unlock',
    title: 'Achievement unlocked!',
    body: `You've unlocked: ${achievementTitle}! (+${xpEarned} XP)`,
    data: {
      achievementId,
      achievementTitle,
      xpEarned: xpEarned.toString(),
      notificationType: 'achievement_unlock',
    },
    priority: 'normal',
  });
}
