/**
 * Notifications Module - Public API
 *
 * Re-exports all notification-related utilities.
 */

// Types
export type {
  NotificationType,
  NotificationPriority,
  BaseNotificationPayload,
  StreakReminderPayload,
  StreakAtRiskPayload,
  StreakLostPayload,
  StreakMilestonePayload,
  ReviewDuePayload,
  ReviewOverduePayload,
  AchievementUnlockPayload,
  BadgeEarnedPayload,
  LevelUpPayload,
  CourseReminderPayload,
  DailyGoalReminderPayload,
  WeeklySummaryPayload,
  NotificationPayload,
  FCMTokenRecord,
  NotificationPreferences,
  ScheduledNotification,
} from './types';

// FCM Client (client-side only)
export {
  isFCMSupported,
  getMessagingInstance,
  requestNotificationPermission,
  getNotificationPermission,
  getFCMToken,
  onForegroundMessage,
  registerServiceWorker,
} from './fcm';

// Notification Service (server-side only)
export {
  saveFCMToken,
  getUserTokens,
  deactivateToken,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  sendNotification,
  sendBulkNotification,
  scheduleNotification,
  cancelScheduledNotification,
  getPendingNotifications,
  processScheduledNotifications,
  // Convenience functions
  sendStreakReminder,
  sendStreakAtRisk,
  sendReviewDue,
  sendBadgeEarned,
  sendAchievementUnlock,
} from './notificationService';
