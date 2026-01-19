/**
 * Re-engagement Service
 *
 * Generates personalized messages and manages streak mechanics to prevent dropout.
 *
 * Key Research Findings:
 * - Loss aversion (streak saver) is most effective re-engagement trigger
 * - Micro-reviews (< 10 min) have highest return completion rate
 * - 60-65 hours is optimal intervention timing (before 72-hour cliff)
 * - Reducing retention from 90% to 82% reduces workload by 30%, retention by only 3%
 *
 * Source: Aptly Deep Research, Duolingo gamification studies
 */

// ============================================================================
// TYPES
// ============================================================================

export type ReengagementMessageType =
  | 'streak_saver'
  | 'progress_pulse'
  | 'social_proof'
  | 'micro_review'
  | 'curiosity_hook'
  | 'achievement_unlock';

export interface ReengagementMessage {
  type: ReengagementMessageType;
  subject: string;
  body: string;
  cta: string;
  ctaUrl: string;
  priority: number; // 1 = highest
  expiresInHours?: number;
}

export interface UserContext {
  name: string;
  streakDays: number;
  progressPercent: number;
  lastSkillName?: string;
  hoursUntilStreakLoss: number;
  completedLessons: number;
  totalLessons: number;
  hasFreezeTokens: boolean;
  freezeTokenCount: number;
}

export interface StreakConfig {
  freezeTokens: number;
  maxConsecutiveFreezes: number;
  repairWindowHours: number;
  freezeEarnThreshold: number; // Days of streak to earn a freeze
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_STREAK_CONFIG: StreakConfig = {
  freezeTokens: 0,
  maxConsecutiveFreezes: 2,
  repairWindowHours: 24,
  freezeEarnThreshold: 7, // Earn 1 freeze per 7-day streak
};

// ============================================================================
// MESSAGE GENERATION
// ============================================================================

/**
 * Generate optimal re-engagement message based on user context
 *
 * Selection priority:
 * 1. Streak saver (if streak at risk) - Loss aversion is strongest motivator
 * 2. Progress pulse (if near milestone) - Goal gradient effect
 * 3. Micro review (default) - Low friction return
 */
export function generateReengagementMessage(
  user: UserContext,
  hoursSinceLogin: number
): ReengagementMessage {
  // Priority 1: Streak saver (loss aversion - most effective)
  if (user.streakDays > 3 && hoursSinceLogin >= 60) {
    return generateStreakSaverMessage(user, hoursSinceLogin);
  }

  // Priority 2: Progress pulse (near milestone)
  if (user.progressPercent >= 50 && user.progressPercent < 100) {
    return generateProgressPulseMessage(user);
  }

  // Priority 3: Achievement unlock (gamification)
  if (user.completedLessons > 0 && user.completedLessons % 5 === 4) {
    return generateAchievementMessage(user);
  }

  // Default: Micro review
  return generateMicroReviewMessage(user);
}

/**
 * Streak Saver - Loss Aversion Message
 *
 * Research shows loss aversion is 2x more motivating than gain framing.
 */
function generateStreakSaverMessage(
  user: UserContext,
  hoursSinceLogin: number
): ReengagementMessage {
  const hoursUntilLoss = Math.max(0, 72 - hoursSinceLogin);

  return {
    type: 'streak_saver',
    subject: `${user.name}, your ${user.streakDays}-day streak is at risk!`,
    body: `You're ${hoursUntilLoss} hours away from losing your ${user.streakDays}-day progress streak. ` +
          `Complete a quick 3-minute review to save it.` +
          (user.hasFreezeTokens
            ? ` (You have ${user.freezeTokenCount} streak freeze${user.freezeTokenCount > 1 ? 's' : ''} available)`
            : ''),
    cta: 'Save My Streak',
    ctaUrl: '/review?mode=micro&duration=3',
    priority: 1,
    expiresInHours: hoursUntilLoss,
  };
}

/**
 * Progress Pulse - Goal Gradient Message
 *
 * The closer to a goal, the more motivated people become.
 */
function generateProgressPulseMessage(user: UserContext): ReengagementMessage {
  const lessonsRemaining = user.totalLessons - user.completedLessons;

  return {
    type: 'progress_pulse',
    subject: `You're ${user.progressPercent}% there, ${user.name}!`,
    body: `Just ${lessonsRemaining} more lesson${lessonsRemaining > 1 ? 's' : ''} to complete this module. ` +
          `Keep the momentum going!`,
    cta: 'Continue Learning',
    ctaUrl: '/learn',
    priority: 2,
  };
}

/**
 * Achievement Unlock - Gamification Message
 */
function generateAchievementMessage(user: UserContext): ReengagementMessage {
  const nextMilestone = Math.ceil((user.completedLessons + 1) / 5) * 5;

  return {
    type: 'achievement_unlock',
    subject: `${user.name}, you're 1 lesson away from a badge!`,
    body: `Complete one more lesson to unlock your ${nextMilestone}-lesson achievement badge. ` +
          `Your dedication is paying off!`,
    cta: 'Earn My Badge',
    ctaUrl: '/learn',
    priority: 2,
  };
}

/**
 * Micro Review - Low Friction Return
 *
 * Research shows < 10 minute sessions have highest completion rate for returning users.
 */
function generateMicroReviewMessage(user: UserContext): ReengagementMessage {
  return {
    type: 'micro_review',
    subject: `Quick 3-minute review, ${user.name}?`,
    body: `Reviewing now boosts memory retention by 2x. ` +
          (user.lastSkillName
            ? `Pick up where you left off with "${user.lastSkillName}".`
            : `Your cards are waiting!`),
    cta: 'Start Quick Review',
    ctaUrl: '/review?mode=micro&duration=3',
    priority: 3,
  };
}

/**
 * Curiosity Hook - Tease upcoming content
 */
export function generateCuriosityMessage(
  user: UserContext,
  nextTopicName: string
): ReengagementMessage {
  return {
    type: 'curiosity_hook',
    subject: `Coming up: ${nextTopicName}`,
    body: `You're ready to learn about ${nextTopicName}. ` +
          `This builds directly on what you've already mastered.`,
    cta: 'See What\'s Next',
    ctaUrl: '/learn',
    priority: 3,
  };
}

// ============================================================================
// STREAK MECHANICS
// ============================================================================

/**
 * Check if streak can be repaired after a break
 *
 * Grace period allows repair within 24 hours of breaking.
 */
export function canRepairStreak(
  streakBrokenAt: Date,
  now: Date = new Date(),
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): boolean {
  const hoursSinceBroken = Math.floor(
    (now.getTime() - streakBrokenAt.getTime()) / (1000 * 60 * 60)
  );
  return hoursSinceBroken <= config.repairWindowHours;
}

/**
 * Check if user can use a streak freeze
 */
export function canUseStreakFreeze(
  config: StreakConfig,
  consecutiveFreezesUsed: number
): boolean {
  return config.freezeTokens > 0 &&
         consecutiveFreezesUsed < config.maxConsecutiveFreezes;
}

/**
 * Use a streak freeze to preserve streak
 */
export function useStreakFreeze(config: StreakConfig): StreakConfig {
  if (config.freezeTokens <= 0) {
    throw new Error('No freeze tokens available');
  }

  return {
    ...config,
    freezeTokens: config.freezeTokens - 1,
  };
}

/**
 * Award streak freeze for consistent practice
 */
export function checkFreezeEligibility(
  currentStreakDays: number,
  freezesEarned: number,
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): { eligible: boolean; reason?: string } {
  const expectedFreezes = Math.floor(currentStreakDays / config.freezeEarnThreshold);

  if (expectedFreezes > freezesEarned) {
    return {
      eligible: true,
      reason: `Earned streak freeze for ${config.freezeEarnThreshold}-day streak!`,
    };
  }

  const daysUntilNext = config.freezeEarnThreshold - (currentStreakDays % config.freezeEarnThreshold);
  return {
    eligible: false,
    reason: `${daysUntilNext} more days until next streak freeze`,
  };
}

/**
 * Calculate streak status
 */
export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  isAtRisk: boolean;
  hoursUntilRisk: number;
  freezesAvailable: number;
  canRepair: boolean;
}

export function calculateStreakStatus(
  currentStreak: number,
  longestStreak: number,
  lastActivityAt: Date,
  streakBrokenAt: Date | null,
  freezeTokens: number,
  now: Date = new Date()
): StreakStatus {
  const hoursSinceActivity = Math.floor(
    (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60)
  );

  const hoursUntilRisk = Math.max(0, 72 - hoursSinceActivity);
  const isAtRisk = hoursUntilRisk <= 12; // Within 12 hours of losing streak

  const canRepair = streakBrokenAt !== null && canRepairStreak(streakBrokenAt, now);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    isAtRisk,
    hoursUntilRisk,
    freezesAvailable: freezeTokens,
    canRepair,
  };
}

// ============================================================================
// MICRO-REVIEW SESSION
// ============================================================================

export interface MicroReviewSession {
  durationMinutes: number;
  maxCards: number;
  prioritizeHighUrgency: boolean;
  reducedRetention: number; // Temporarily lower target
}

/**
 * Create micro-review session configuration
 *
 * Research shows:
 * - < 10 minutes optimal for returning users
 * - Focus on high-priority reviews (not new material)
 * - Reduced retention target reduces overwhelm
 */
export function createMicroReviewSession(
  durationMinutes: number = 3
): MicroReviewSession {
  return {
    durationMinutes,
    maxCards: Math.ceil(durationMinutes * 3), // ~3 cards per minute
    prioritizeHighUrgency: true,
    reducedRetention: 0.82, // 82% instead of 90%
  };
}

/**
 * Return destination configuration
 *
 * Where should returning users be directed?
 * Research: Micro-reviews (not new content) have highest completion.
 */
export type ReturnDestination = 'micro_review' | 'last_lesson' | 'dashboard' | 'progress_map';

export function determineReturnDestination(
  hoursSinceLogin: number,
  hasOverdueReviews: boolean,
  streakAtRisk: boolean
): ReturnDestination {
  // Streak at risk: Quick review to save it
  if (streakAtRisk) {
    return 'micro_review';
  }

  // Long absence with overdue reviews: Micro-review first
  if (hoursSinceLogin >= 48 && hasOverdueReviews) {
    return 'micro_review';
  }

  // Shorter absence: Continue where left off
  if (hoursSinceLogin < 48) {
    return 'last_lesson';
  }

  // Default: Dashboard for orientation
  return 'dashboard';
}

// ============================================================================
// NOTIFICATION SCHEDULING
// ============================================================================

export interface NotificationSchedule {
  sendAt: Date;
  messageType: ReengagementMessageType;
  priority: number;
}

/**
 * Schedule re-engagement notifications
 *
 * Optimal timing: 60-65 hours after last login (before 72-hour cliff)
 */
export function scheduleReengagementNotification(
  lastLoginAt: Date,
  _userTimezone: string = 'UTC'
): NotificationSchedule {
  // Target: 60 hours after last login
  const targetTime = new Date(lastLoginAt.getTime() + 60 * 60 * 1000 * 60);

  // Adjust to reasonable hour (9am-8pm in user's timezone)
  // This is simplified; production would use proper timezone handling
  const hour = targetTime.getHours();
  if (hour < 9) {
    targetTime.setHours(9, 0, 0, 0);
  } else if (hour > 20) {
    targetTime.setHours(9, 0, 0, 0);
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return {
    sendAt: targetTime,
    messageType: 'streak_saver',
    priority: 1,
  };
}

/**
 * Rate limiting for re-engagement messages
 */
export function shouldSendNotification(
  lastNotificationAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastNotificationAt) return true;

  // Minimum 72 hours between notifications
  const hoursSinceLast = Math.floor(
    (now.getTime() - lastNotificationAt.getTime()) / (1000 * 60 * 60)
  );

  return hoursSinceLast >= 72;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_STREAK_CONFIG };
