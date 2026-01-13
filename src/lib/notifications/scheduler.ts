/**
 * Notification Scheduler
 *
 * Handles scheduled notification checks for all users.
 * Designed to be called from a cron job or serverless function.
 */

import { adminDb } from '../firebase/admin';
import { runAllChecksForUser } from './triggers';
import { processScheduledNotifications } from './notificationService';

// ============================================
// TYPES
// ============================================

type SchedulerResult = {
  usersProcessed: number;
  notificationsSent: number;
  errors: number;
  duration: number;
};

// ============================================
// USER QUERY HELPERS
// ============================================

/**
 * Get all users with notifications enabled
 * Queries the notificationPreferences collection
 */
async function getUsersWithNotificationsEnabled(): Promise<string[]> {
  try {
    // Query users who have notifications enabled (or default/no preference)
    const prefsSnap = await adminDb
      .collection('notificationPreferences')
      .where('enabled', '==', true)
      .select() // Only get doc IDs, not full data
      .get();

    const enabledUserIds = prefsSnap.docs.map((doc) => doc.id);

    // Also get users without preferences (they get default enabled=true)
    // This is done by getting all users and filtering out those with disabled prefs
    const disabledSnap = await adminDb
      .collection('notificationPreferences')
      .where('enabled', '==', false)
      .select()
      .get();

    const disabledUserIds = new Set(disabledSnap.docs.map((doc) => doc.id));

    // Get all users who have FCM tokens registered
    const tokensSnap = await adminDb
      .collection('fcmTokens')
      .where('isActive', '==', true)
      .select('userId')
      .get();

    // Dedupe user IDs from tokens
    const tokenUserIds = new Set<string>();
    tokensSnap.docs.forEach((doc) => {
      const userId = doc.data().userId;
      if (userId && !disabledUserIds.has(userId)) {
        tokenUserIds.add(userId);
      }
    });

    // Combine explicitly enabled users and users with tokens (not disabled)
    const allUserIds = new Set([...enabledUserIds, ...Array.from(tokenUserIds)]);

    return Array.from(allUserIds);
  } catch (error) {
    console.error('Failed to get users with notifications enabled:', error);
    return [];
  }
}

/**
 * Get users who need streak reminders
 * Users with active streaks who haven't completed activity today
 */
async function getUsersNeedingStreakReminder(): Promise<string[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Query users with active streaks who haven't completed today
    const progressSnap = await adminDb
      .collection('userProgress')
      .where('streak.currentStreak', '>', 0)
      .get();

    return progressSnap.docs
      .filter((doc) => {
        const lastCompleted = doc.data().streak?.lastCompletedDate;
        return lastCompleted !== today;
      })
      .map((doc) => doc.id);
  } catch (error) {
    console.error('Failed to get users needing streak reminder:', error);
    return [];
  }
}

// ============================================
// MAIN SCHEDULER FUNCTION
// ============================================

/**
 * Run all scheduled notification checks
 *
 * This function should be called from a cron job (e.g., every hour).
 * It processes notifications for all eligible users.
 *
 * @returns Scheduler result with stats
 */
export async function runScheduledNotificationChecks(): Promise<SchedulerResult> {
  const startTime = Date.now();
  let usersProcessed = 0;
  let notificationsSent = 0;
  let errors = 0;

  try {
    // 1. Process any scheduled notifications that are due
    const scheduledResult = await processScheduledNotifications();
    notificationsSent += scheduledResult.sent;

    // 2. Get users to process
    const userIds = await getUsersWithNotificationsEnabled();

    // 3. Process users in batches to avoid overwhelming the system
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      batches.push(userIds.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((userId) => runAllChecksForUser(userId))
      );

      usersProcessed += batch.length;

      // Count errors
      results.forEach((result) => {
        if (result.status === 'rejected') {
          errors++;
          console.error('User notification check failed:', result.reason);
        }
      });
    }
  } catch (error) {
    console.error('Scheduler error:', error);
    errors++;
  }

  const duration = Date.now() - startTime;

  return {
    usersProcessed,
    notificationsSent,
    errors,
    duration,
  };
}

// ============================================
// TARGETED SCHEDULER FUNCTIONS
// ============================================

/**
 * Run streak-specific notifications
 * Call this in the evening (e.g., 8 PM user's local time)
 */
export async function runStreakReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  let sent = 0;
  let errors = 0;

  try {
    const userIds = await getUsersNeedingStreakReminder();

    const { checkStreakAtRisk } = await import('./triggers');

    await Promise.allSettled(
      userIds.map(async (userId) => {
        try {
          await checkStreakAtRisk(userId);
          sent++;
        } catch {
          errors++;
        }
      })
    );
  } catch (error) {
    console.error('Streak reminder error:', error);
    errors++;
  }

  return { sent, errors };
}

/**
 * Run review reminders
 * Call this in the morning or optimal learning time
 */
export async function runReviewReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  let sent = 0;
  let errors = 0;

  try {
    const userIds = await getUsersWithNotificationsEnabled();

    const { checkReviewBacklog } = await import('./triggers');

    await Promise.allSettled(
      userIds.map(async (userId) => {
        try {
          await checkReviewBacklog(userId);
          sent++;
        } catch {
          errors++;
        }
      })
    );
  } catch (error) {
    console.error('Review reminder error:', error);
    errors++;
  }

  return { sent, errors };
}

/**
 * Run optimal learning time nudges
 * Call this hourly to catch users at their preferred times
 */
export async function runOptimalTimeNudges(): Promise<{
  sent: number;
  errors: number;
}> {
  let sent = 0;
  let errors = 0;

  try {
    const userIds = await getUsersWithNotificationsEnabled();

    const { checkOptimalLearningTime } = await import('./triggers');

    await Promise.allSettled(
      userIds.map(async (userId) => {
        try {
          await checkOptimalLearningTime(userId);
          sent++;
        } catch {
          errors++;
        }
      })
    );
  } catch (error) {
    console.error('Optimal time nudge error:', error);
    errors++;
  }

  return { sent, errors };
}

// ============================================
// CRON JOB API ROUTE HELPER
// ============================================

/**
 * Validate cron secret to ensure only authorized calls
 */
export function validateCronSecret(secret: string | null): boolean {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.warn('CRON_SECRET not configured - allowing all requests');
    return true;
  }

  return secret === expectedSecret;
}
