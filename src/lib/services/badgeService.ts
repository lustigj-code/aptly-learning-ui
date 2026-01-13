/**
 * Badge Service
 * Handles all Firestore operations for badges and gamification
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Badge, BadgeProgress } from '@/lib/auth/schemas';
import { withErrorHandling, validateString, validateRequired } from '@/lib/errors/handlers';

/**
 * Get all badge definitions
 * @returns Array of all available badges
 * @throws Error if database operation fails
 */
export async function getBadges(): Promise<Badge[]> {
  return withErrorHandling('fetch badges', async () => {
    const snapshot = await adminDb
      .collection('badges')
      .get();

    const badges: Badge[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      badges.push({
        id: doc.id,
        ...data,
        earnedAt: data.earnedAt?.toDate?.(),
      } as Badge);
    });

    return badges;
  });
}

/**
 * Get a single badge definition by ID
 * @param badgeId - The badge's ID
 * @returns Badge definition or null if not found
 * @throws Error if database operation fails
 */
export async function getBadge(badgeId: string): Promise<Badge | null> {
  return withErrorHandling(`fetch badge ${badgeId}`, async () => {
    validateString('badgeId', badgeId);

    const doc = await adminDb.collection('badges').doc(badgeId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      ...data,
      earnedAt: data.earnedAt?.toDate?.(),
    } as Badge;
  });
}

/**
 * Get all badges earned by a specific user
 * @param uid - User's Firebase UID
 * @returns Array of earned badges
 * @throws Error if database operation fails
 */
export async function getUserBadges(uid: string): Promise<Badge[]> {
  return withErrorHandling(`fetch badges for user ${uid}`, async () => {
    validateString('uid', uid);

    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return [];
    }

    const data = userDoc.data();
    const badges = data?.badges || [];

    return badges.map((badge: Badge) => ({
      ...badge,
      earnedAt: badge.earnedAt instanceof Date ? badge.earnedAt : undefined,
    })) as Badge[];
  });
}

/**
 * Award a badge to a user
 * Adds badge to user's badges array with earnedAt timestamp
 * @param uid - User's Firebase UID
 * @param badgeId - The badge's ID
 * @returns Void on success
 * @throws Error if badge not found or award fails
 */
export async function awardBadge(uid: string, badgeId: string): Promise<void> {
  return withErrorHandling(`award badge ${badgeId} to user ${uid}`, async () => {
    validateRequired({ uid, badgeId });

    // Verify badge exists
    const badgeDoc = await adminDb.collection('badges').doc(badgeId).get();
    if (!badgeDoc.exists) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    const badgeData = badgeDoc.data();
    if (!badgeData) {
      throw new Error(`Badge ${badgeId} has no data`);
    }

    // Create badge with earnedAt timestamp
    const earnedBadge: Badge = {
      id: badgeId,
      type: badgeData.type,
      title: badgeData.title,
      description: badgeData.description,
      icon: badgeData.icon,
      criteria: badgeData.criteria,
      rarity: badgeData.rarity,
      earnedAt: new Date(),
    };

    // Add to user's badges array
    await adminDb.collection('users').doc(uid).update({
      badges: FieldValue.arrayUnion([earnedBadge]),
    });
  });
}

/**
 * Check if user already has a badge
 * @param uid - User's Firebase UID
 * @param badgeId - The badge's ID
 * @returns Boolean indicating if user has badge
 * @throws Error if database operation fails
 */
export async function userHasBadge(uid: string, badgeId: string): Promise<boolean> {
  return withErrorHandling(`check badge for user ${uid}`, async () => {
    validateRequired({ uid, badgeId });

    const badges = await getUserBadges(uid);
    return badges.some(badge => badge.id === badgeId);
  });
}

/**
 * Evaluate all badge criteria and auto-award new badges
 * Checks each badge's criteria against user's progress
 * @param uid - User's Firebase UID
 * @returns Array of newly awarded badge IDs
 * @throws Error if evaluation fails
 */
export async function checkBadgeCriteria(uid: string): Promise<string[]> {
  return withErrorHandling(`check badge criteria for user ${uid}`, async () => {
    validateString('uid', uid);

    // Get user progress
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error('User has no data');
    }

    // Get all badge definitions
    const badgesSnapshot = await adminDb.collection('badges').get();
    const userBadges = userData.badges || [];
    const awardedBadges: string[] = [];

    for (const badgeDoc of badgesSnapshot.docs) {
      const badgeData = badgeDoc.data();
      const badgeId = badgeDoc.id;

      // Skip if user already has this badge
      if (userBadges.some((b: Badge) => b.id === badgeId)) {
        continue;
      }

      const criteria = badgeData.criteria;
      let shouldAward = false;

      // Evaluate criteria based on type
      switch (criteria.type) {
        case 'completion': {
          // Check if user completed required entity
          const { atomsCompleted = [], lessonsCompleted = [], modulesCompleted = [], coursesCompleted = [] } = userData.progress || {};
          const entityId = criteria.relatedEntityId;

          if (
            atomsCompleted.includes(entityId) ||
            lessonsCompleted.includes(entityId) ||
            modulesCompleted.includes(entityId) ||
            coursesCompleted.includes(entityId)
          ) {
            shouldAward = true;
          }
          break;
        }

        case 'streak': {
          // Check if current streak meets threshold
          const currentStreak = userData.streak?.currentStreak || 0;
          if (currentStreak >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        }

        case 'score': {
          // Check if assessment score meets threshold
          const { assessmentScores = [] } = userData.progress || {};
          const highestScore = assessmentScores.reduce((max: number, score: { score?: number }) => {
            return Math.max(max, score.score || 0);
          }, 0);

          if (highestScore >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        }

        case 'time': {
          // Check if total time spent meets threshold (in minutes)
          const totalTime = userData.progress?.totalTimeSpentMinutes || 0;
          if (totalTime >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        }

        case 'custom': {
          // Custom criteria - would require additional business logic
          // For now, skip custom criteria
          break;
        }
      }

      // Award badge if criteria met
      if (shouldAward) {
        try {
          await awardBadge(uid, badgeId);
          awardedBadges.push(badgeId);
        } catch (e) {
          console.error(`Failed to award badge ${badgeId}:`, e);
          // Continue to next badge instead of throwing
        }
      }
    }

    return awardedBadges;
  });
}

/**
 * Get progress toward a specific badge
 * Shows how close user is to earning a badge
 * @param uid - User's Firebase UID
 * @param badgeId - The badge's ID
 * @returns BadgeProgress with current progress and target
 * @throws Error if badge not found or check fails
 */
export async function getBadgeProgress(uid: string, badgeId: string): Promise<BadgeProgress> {
  return withErrorHandling(`get badge progress for badge ${badgeId}`, async () => {
    validateRequired({ uid, badgeId });

    // Get badge definition
    const badgeDoc = await adminDb.collection('badges').doc(badgeId).get();
    if (!badgeDoc.exists) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    const badgeData = badgeDoc.data();
    if (!badgeData) {
      throw new Error(`Badge ${badgeId} has no data`);
    }

    // Check if already earned
    const hasEarned = await userHasBadge(uid, badgeId);
    if (hasEarned) {
      return {
        badgeId,
        currentProgress: badgeData.criteria.threshold,
        target: badgeData.criteria.threshold,
        completed: true,
        percentComplete: 100,
      };
    }

    // Get user progress
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error('User has no data');
    }

    let currentProgress = 0;
    const target = badgeData.criteria.threshold;
    const criteria = badgeData.criteria;

    // Calculate progress based on criteria type
    switch (criteria.type) {
      case 'completion': {
        const { atomsCompleted = [], lessonsCompleted = [], modulesCompleted = [], coursesCompleted = [] } = userData.progress || {};
        const allCompleted = [
          ...atomsCompleted,
          ...lessonsCompleted,
          ...modulesCompleted,
          ...coursesCompleted,
        ];
        currentProgress = allCompleted.length;
        break;
      }

      case 'streak': {
        currentProgress = userData.streak?.currentStreak || 0;
        break;
      }

      case 'score': {
        const { assessmentScores = [] } = userData.progress || {};
        currentProgress = assessmentScores.reduce((max: number, score: { score?: number }) => {
          return Math.max(max, score.score || 0);
        }, 0);
        break;
      }

      case 'time': {
        currentProgress = userData.progress?.totalTimeSpentMinutes || 0;
        break;
      }

      case 'custom': {
        currentProgress = 0;
        break;
      }
    }

    return {
      badgeId,
      currentProgress,
      target,
      completed: currentProgress >= target,
      percentComplete: Math.min(100, Math.round((currentProgress / target) * 100)),
    };
  });
}

/**
 * Remove a badge from a user (admin operation)
 * @param uid - User's Firebase UID
 * @param badgeId - The badge's ID to remove
 * @returns Void on success
 * @throws Error if removal fails
 */
export async function removeBadge(uid: string, badgeId: string): Promise<void> {
  return withErrorHandling(`remove badge ${badgeId} from user ${uid}`, async () => {
    validateRequired({ uid, badgeId });

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const badges = userData?.badges || [];

    // Filter out the badge
    const filteredBadges = badges.filter((b: Badge) => b.id !== badgeId);

    await adminDb.collection('users').doc(uid).update({
      badges: filteredBadges,
    });
  });
}

/**
 * Get badge count for a user
 * @param uid - User's Firebase UID
 * @returns Number of badges earned
 * @throws Error if database operation fails
 */
export async function getUserBadgeCount(uid: string): Promise<number> {
  return withErrorHandling(`get badge count for user ${uid}`, async () => {
    validateString('uid', uid);

    const badges = await getUserBadges(uid);
    return badges.length;
  });
}
