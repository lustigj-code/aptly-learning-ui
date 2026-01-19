/**
 * Notification Triggers
 *
 * Functions that check conditions and trigger notifications for learning events.
 * These are fire-and-forget async functions designed to be called from various
 * parts of the application without blocking the main flow.
 */

import { adminDb } from '../firebase/admin';
import {
  sendStreakAtRisk,
  sendReviewDue,
  sendNotification,
  getUserNotificationPreferences,
} from './notificationService';
import { canSendNotification, recordNotificationSent } from './rateLimiter';

// ============================================
// CONSTANTS
// ============================================

const STREAK_AT_RISK_HOURS = 2; // Hours before midnight to send warning
const REVIEW_BACKLOG_THRESHOLD = 5; // Minimum items to trigger notification
const MASTERY_DECAY_THRESHOLD = 0.15; // 15% drop triggers notification

// ============================================
// STREAK NOTIFICATIONS
// ============================================

/**
 * Check if user's streak is at risk and send notification
 * Should be called when user hasn't completed activity today
 *
 * @param userId - The user ID to check
 */
export async function checkStreakAtRisk(userId: string): Promise<void> {
  try {
    // Check rate limit first
    if (!(await canSendNotification(userId, 'streak_at_risk'))) {
      return;
    }

    // Get user progress to check streak
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();

    if (!userProgressSnap.exists) {
      return;
    }

    const userProgress = userProgressSnap.data();
    const streakData = userProgress?.streak;

    if (!streakData || streakData.currentStreak < 1) {
      return; // No streak to protect
    }

    const lastCompletedDate = streakData.lastCompletedDate;
    const today = new Date().toISOString().split('T')[0];

    // If already completed today, no risk
    if (lastCompletedDate === today) {
      return;
    }

    // Calculate hours remaining until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const hoursRemaining = Math.floor(
      (midnight.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    // Only send notification when streak is actually at risk (within threshold)
    if (hoursRemaining <= STREAK_AT_RISK_HOURS && hoursRemaining > 0) {
      const result = await sendStreakAtRisk(
        userId,
        streakData.currentStreak,
        hoursRemaining
      );

      if (result.success) {
        await recordNotificationSent(userId, 'streak_at_risk');
      }
    }
  } catch (error) {
    console.error('checkStreakAtRisk error:', error);
    // Fire and forget - don't throw
  }
}

// ============================================
// REVIEW NOTIFICATIONS
// ============================================

/**
 * Check if user has a review backlog and send notification
 * Called when fetching due items
 *
 * @param userId - The user ID to check
 * @param dueCount - Number of items currently due (if already known)
 */
export async function checkReviewBacklog(
  userId: string,
  dueCount?: number
): Promise<void> {
  try {
    // Check rate limit first
    if (!(await canSendNotification(userId, 'review_due'))) {
      return;
    }

    let itemCount = dueCount;

    // If count not provided, query it
    if (itemCount === undefined) {
      const now = new Date();
      const reviewItemsRef = adminDb
        .collection('reviewQueue')
        .doc(userId)
        .collection('items');

      const dueItemsSnap = await reviewItemsRef
        .where('dueDate', '<=', now)
        .get();

      itemCount = dueItemsSnap.size;
    }

    // Only send if backlog exceeds threshold
    if (itemCount >= REVIEW_BACKLOG_THRESHOLD) {
      const result = await sendReviewDue(userId, itemCount);

      if (result.success) {
        await recordNotificationSent(userId, 'review_due');
      }
    }
  } catch (error) {
    console.error('checkReviewBacklog error:', error);
    // Fire and forget - don't throw
  }
}

/**
 * Check for overdue reviews and send notification
 * Called from scheduled jobs
 *
 * @param userId - The user ID to check
 */
export async function checkReviewOverdue(userId: string): Promise<void> {
  try {
    // Check rate limit first
    if (!(await canSendNotification(userId, 'review_overdue'))) {
      return;
    }

    // Get oldest due item to calculate days overdue
    const now = new Date();
    const reviewItemsRef = adminDb
      .collection('reviewQueue')
      .doc(userId)
      .collection('items');

    const overdueSnap = await reviewItemsRef
      .where('dueDate', '<=', now)
      .orderBy('dueDate', 'asc')
      .limit(1)
      .get();

    if (overdueSnap.empty) {
      return;
    }

    const oldestDue = overdueSnap.docs[0].data();
    const dueDate = oldestDue.dueDate?.toDate?.() || new Date(oldestDue.dueDate);
    const daysPastDue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only send if more than 1 day overdue
    if (daysPastDue > 1) {
      // Get total count
      const allOverdueSnap = await reviewItemsRef
        .where('dueDate', '<=', now)
        .get();

      const result = await sendNotification({
        userId,
        type: 'review_overdue',
        title: 'Reviews waiting for you',
        body: `You have ${allOverdueSnap.size} items overdue by ${daysPastDue} days.`,
        data: {
          itemCount: allOverdueSnap.size.toString(),
          daysPastDue: daysPastDue.toString(),
          notificationType: 'review_overdue',
        },
        priority: 'normal',
      });

      if (result.success) {
        await recordNotificationSent(userId, 'review_overdue');
      }
    }
  } catch (error) {
    console.error('checkReviewOverdue error:', error);
    // Fire and forget - don't throw
  }
}

// ============================================
// MASTERY NOTIFICATIONS
// ============================================

/**
 * Check if a skill's mastery has decayed significantly and notify user
 *
 * @param userId - The user ID to check
 * @param skillId - The skill/concept ID that may have decayed
 * @param previousMastery - Previous mastery level (0-1)
 * @param currentMastery - Current mastery level (0-1)
 */
export async function checkMasteryDecay(
  userId: string,
  skillId: string,
  previousMastery?: number,
  currentMastery?: number
): Promise<void> {
  try {
    // Check rate limit (use review_due type for mastery alerts)
    if (!(await canSendNotification(userId, 'review_due'))) {
      return;
    }

    let prevMastery = previousMastery;
    let currMastery = currentMastery;

    // If mastery values not provided, fetch them
    if (prevMastery === undefined || currMastery === undefined) {
      const reviewItemRef = adminDb
        .collection('reviewQueue')
        .doc(userId)
        .collection('items')
        .doc(skillId);

      const itemSnap = await reviewItemRef.get();
      if (!itemSnap.exists) {
        return;
      }

      const itemData = itemSnap.data();
      currMastery = itemData?.masteryLevel || 0;
      prevMastery = itemData?.previousMasteryLevel || currMastery;
    }

    // At this point both values are defined
    const finalPrevMastery = prevMastery ?? 0;
    const finalCurrMastery = currMastery ?? 0;

    // Calculate mastery drop
    const masteryDrop = finalPrevMastery - finalCurrMastery;

    // Only send if drop exceeds threshold
    if (masteryDrop >= MASTERY_DECAY_THRESHOLD) {
      // Get skill name from knowledge graph or items
      const skillName = await getSkillName(skillId);

      const result = await sendNotification({
        userId,
        type: 'review_due',
        title: 'Skill needs refreshing',
        body: `Your mastery of "${skillName}" has dropped. Time for a quick review!`,
        data: {
          itemCount: '1',
          topicName: skillName,
          notificationType: 'review_due',
        },
        priority: 'normal',
      });

      if (result.success) {
        await recordNotificationSent(userId, 'review_due');
      }
    }
  } catch (error) {
    console.error('checkMasteryDecay error:', error);
    // Fire and forget - don't throw
  }
}

// ============================================
// OPTIMAL LEARNING TIME
// ============================================

/**
 * Send a nudge at the user's optimal learning time
 * Called from scheduled jobs based on user preferences
 *
 * @param userId - The user ID to nudge
 */
export async function checkOptimalLearningTime(userId: string): Promise<void> {
  try {
    // Check rate limit using course_reminder type
    if (!(await canSendNotification(userId, 'course_reminder'))) {
      return;
    }

    // Get user preferences for optimal time
    const prefs = await getUserNotificationPreferences(userId);

    if (!prefs.enabled || !prefs.courseReminders) {
      return;
    }

    const preferredTime = prefs.preferredReminderTime;
    if (!preferredTime) {
      return; // No preferred time set
    }

    // Check if current time matches preferred time (within 30 min window)
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const [prefHours, prefMinutes] = preferredTime.split(':').map(Number);
    const [currHours, currMinutes] = currentTime.split(':').map(Number);

    const prefTotalMinutes = prefHours * 60 + prefMinutes;
    const currTotalMinutes = currHours * 60 + currMinutes;
    const diff = Math.abs(currTotalMinutes - prefTotalMinutes);

    // Within 30 minute window
    if (diff > 30) {
      return;
    }

    // Check if user has already studied today
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();

    if (userProgressSnap.exists) {
      const userProgress = userProgressSnap.data();
      const lastCompletedDate = userProgress?.streak?.lastCompletedDate;
      const today = new Date().toISOString().split('T')[0];

      if (lastCompletedDate === today) {
        return; // Already studied today
      }
    }

    // Send the nudge
    const result = await sendNotification({
      userId,
      type: 'course_reminder',
      title: 'Time to learn!',
      body: "It's your optimal learning time. A quick 5-minute session?",
      data: {
        courseId: '',
        courseName: 'Your courses',
        notificationType: 'course_reminder',
      },
      priority: 'normal',
    });

    if (result.success) {
      await recordNotificationSent(userId, 'course_reminder');
    }
  } catch (error) {
    console.error('checkOptimalLearningTime error:', error);
    // Fire and forget - don't throw
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a human-readable skill name from the skill ID
 */
async function getSkillName(skillId: string): Promise<string> {
  try {
    // Try to get from concepts collection first
    const conceptRef = adminDb.collection('concepts').doc(skillId);
    const conceptSnap = await conceptRef.get();

    if (conceptSnap.exists) {
      return conceptSnap.data()?.name || skillId;
    }

    // Fallback: format the skill ID
    return skillId
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return skillId;
  }
}

// ============================================
// BATCH TRIGGER HELPER
// ============================================

/**
 * Run all applicable notification checks for a user
 * Used by the scheduler
 */
export async function runAllChecksForUser(userId: string): Promise<void> {
  // Run checks in parallel, but don't let one failure stop others
  await Promise.allSettled([
    checkStreakAtRisk(userId),
    checkReviewBacklog(userId),
    checkReviewOverdue(userId),
    checkOptimalLearningTime(userId),
  ]);
}
