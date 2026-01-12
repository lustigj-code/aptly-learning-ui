/**
 * Push Notification Types
 *
 * Defines all notification types and payloads for Aptly Learning.
 */

// ============================================
// NOTIFICATION TYPE ENUM
// ============================================

export type NotificationType =
  | 'streak_reminder'
  | 'streak_at_risk'
  | 'streak_lost'
  | 'streak_milestone'
  | 'review_due'
  | 'review_overdue'
  | 'achievement_unlock'
  | 'badge_earned'
  | 'level_up'
  | 'course_reminder'
  | 'daily_goal_reminder'
  | 'weekly_summary';

// ============================================
// NOTIFICATION PRIORITY
// ============================================

export type NotificationPriority = 'low' | 'normal' | 'high';

// ============================================
// BASE NOTIFICATION PAYLOAD
// ============================================

export type BaseNotificationPayload = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  priority?: NotificationPriority;
  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;
};

// ============================================
// STREAK NOTIFICATIONS
// ============================================

export type StreakReminderPayload = BaseNotificationPayload & {
  type: 'streak_reminder';
  data: {
    currentStreak: string;
    notificationType: 'streak_reminder';
  };
};

export type StreakAtRiskPayload = BaseNotificationPayload & {
  type: 'streak_at_risk';
  data: {
    currentStreak: string;
    hoursRemaining: string;
    notificationType: 'streak_at_risk';
  };
};

export type StreakLostPayload = BaseNotificationPayload & {
  type: 'streak_lost';
  data: {
    previousStreak: string;
    notificationType: 'streak_lost';
  };
};

export type StreakMilestonePayload = BaseNotificationPayload & {
  type: 'streak_milestone';
  data: {
    streakDays: string;
    milestone: string;
    notificationType: 'streak_milestone';
  };
};

// ============================================
// REVIEW NOTIFICATIONS (Spaced Repetition)
// ============================================

export type ReviewDuePayload = BaseNotificationPayload & {
  type: 'review_due';
  data: {
    itemCount: string;
    topicName?: string;
    notificationType: 'review_due';
  };
};

export type ReviewOverduePayload = BaseNotificationPayload & {
  type: 'review_overdue';
  data: {
    itemCount: string;
    daysPastDue: string;
    notificationType: 'review_overdue';
  };
};

// ============================================
// ACHIEVEMENT NOTIFICATIONS
// ============================================

export type AchievementUnlockPayload = BaseNotificationPayload & {
  type: 'achievement_unlock';
  data: {
    achievementId: string;
    achievementTitle: string;
    xpEarned: string;
    notificationType: 'achievement_unlock';
  };
};

export type BadgeEarnedPayload = BaseNotificationPayload & {
  type: 'badge_earned';
  data: {
    badgeId: string;
    badgeTitle: string;
    badgeRarity: string;
    notificationType: 'badge_earned';
  };
};

export type LevelUpPayload = BaseNotificationPayload & {
  type: 'level_up';
  data: {
    newLevel: string;
    totalXp: string;
    notificationType: 'level_up';
  };
};

// ============================================
// LEARNING REMINDERS
// ============================================

export type CourseReminderPayload = BaseNotificationPayload & {
  type: 'course_reminder';
  data: {
    courseId: string;
    courseName: string;
    lessonName?: string;
    notificationType: 'course_reminder';
  };
};

export type DailyGoalReminderPayload = BaseNotificationPayload & {
  type: 'daily_goal_reminder';
  data: {
    goalMinutes: string;
    completedMinutes: string;
    notificationType: 'daily_goal_reminder';
  };
};

export type WeeklySummaryPayload = BaseNotificationPayload & {
  type: 'weekly_summary';
  data: {
    lessonsCompleted: string;
    minutesStudied: string;
    xpEarned: string;
    notificationType: 'weekly_summary';
  };
};

// ============================================
// UNION TYPE
// ============================================

export type NotificationPayload =
  | StreakReminderPayload
  | StreakAtRiskPayload
  | StreakLostPayload
  | StreakMilestonePayload
  | ReviewDuePayload
  | ReviewOverduePayload
  | AchievementUnlockPayload
  | BadgeEarnedPayload
  | LevelUpPayload
  | CourseReminderPayload
  | DailyGoalReminderPayload
  | WeeklySummaryPayload;

// ============================================
// FCM TOKEN STORAGE
// ============================================

export type FCMTokenRecord = {
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
};

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export type NotificationPreferences = {
  // Global toggle
  enabled: boolean;

  // By type
  streakReminders: boolean;
  reviewAlerts: boolean;
  achievements: boolean;
  courseReminders: boolean;
  weeklySummary: boolean;

  // Timing preferences
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string; // e.g., "08:00"
  preferredReminderTime?: string; // e.g., "09:00"
  timezone?: string; // e.g., "America/New_York"
};

// ============================================
// SCHEDULED NOTIFICATION
// ============================================

export type ScheduledNotification = {
  id: string;
  payload: NotificationPayload;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
};
