/**
 * Gamification Constants
 * Phase 4.3: XP & Progression Transparency
 *
 * Centralizes all XP values, level thresholds, and gamification magic numbers
 * for transparency and easy tuning.
 */

// ============================================
// XP VALUES (Base Points)
// ============================================

export const XP_VALUES = {
  // Atom completion XP (base values before multipliers)
  ATOM_VIDEO: 10,
  ATOM_READING: 8,
  ATOM_QUIZ: 15,
  ATOM_PRACTICE: 20,
  ATOM_PROJECT: 50,

  // Lesson completion bonus
  LESSON_COMPLETE: 50,

  // Module completion bonus
  MODULE_COMPLETE: 150,

  // Course completion bonus
  COURSE_COMPLETE: 500,

  // Perfect quiz bonus
  PERFECT_QUIZ: 10, // Extra XP for 100% score

  // Speed bonus (completing quickly)
  SPEED_BONUS_MAX: 5, // Max bonus for fast completion
  SPEED_THRESHOLD_SECONDS: 60, // Under 1 minute = full bonus

  // Review completion XP
  REVIEW_CORRECT: 5,
  REVIEW_STREAK_BONUS: 2, // Per consecutive correct review
} as const;

// ============================================
// XP MULTIPLIERS
// ============================================

export const XP_MULTIPLIERS = {
  // Streak multipliers
  STREAK_3_DAY: 1.1, // 10% bonus at 3-day streak
  STREAK_7_DAY: 1.25, // 25% bonus at 7-day streak
  STREAK_14_DAY: 1.5, // 50% bonus at 14-day streak
  STREAK_30_DAY: 2.0, // 100% bonus at 30-day streak

  // First-time completion bonus
  FIRST_TIME: 1.2, // 20% bonus for first completion

  // Difficulty-based multipliers
  DIFFICULTY_BEGINNER: 1.0,
  DIFFICULTY_INTERMEDIATE: 1.3,
  DIFFICULTY_ADVANCED: 1.6,
} as const;

// ============================================
// LEVEL PROGRESSION
// ============================================

export const LEVEL_THRESHOLDS = {
  // XP required for each level (exponential curve)
  LEVEL_1: 0,
  LEVEL_2: 100,
  LEVEL_3: 250,
  LEVEL_4: 500,
  LEVEL_5: 850,
  LEVEL_6: 1300,
  LEVEL_7: 1850,
  LEVEL_8: 2500,
  LEVEL_9: 3250,
  LEVEL_10: 4100,
  LEVEL_11: 5050,
  LEVEL_12: 6100,
  LEVEL_13: 7250,
  LEVEL_14: 8500,
  LEVEL_15: 9850,
  LEVEL_16: 11300,
  LEVEL_17: 12850,
  LEVEL_18: 14500,
  LEVEL_19: 16250,
  LEVEL_20: 18100, // Max level
} as const;

// Array format for easier iteration
export const LEVEL_THRESHOLDS_ARRAY = [
  0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4100, 5050, 6100, 7250, 8500, 9850, 11300, 12850,
  14500, 16250, 18100,
] as const;

export const MAX_LEVEL = 20;

// ============================================
// STREAK CONFIGURATION
// ============================================

export const STREAK_CONFIG = {
  // Starting number of streak freezes
  INITIAL_FREEZES: 2,

  // Earn a freeze at these streak milestones
  FREEZE_MILESTONES: [7, 30, 90], // Get freeze at 7, 30, 90 day streaks

  // Maximum freezes a user can have
  MAX_FREEZES: 5,

  // Streak milestone celebrations
  MILESTONE_DAYS: [3, 7, 14, 30, 60, 90, 180, 365],
} as const;

// ============================================
// BADGE CRITERIA THRESHOLDS
// ============================================

export const BADGE_THRESHOLDS = {
  // Completion badges
  FIRST_LESSON: 1,
  TEN_ATOMS: 10,
  FIFTY_ATOMS: 50,
  HUNDRED_ATOMS: 100,

  // Streak badges
  WEEK_WARRIOR: 7, // 7-day streak
  MONTH_MASTER: 30, // 30-day streak
  YEAR_CHAMPION: 365, // 365-day streak

  // Score badges
  PERFECT_QUIZ: 100, // 100% on any quiz
  FIVE_PERFECT: 5, // Five perfect quizzes
  TEN_PERFECT: 10,

  // Time badges
  HOUR_HERO: 60, // 60 minutes in one session
  TEN_HOURS: 600, // 10 hours total
  HUNDRED_HOURS: 6000, // 100 hours total

  // Special badges
  EARLY_BIRD: 1, // Complete before 8 AM
  NIGHT_OWL: 1, // Complete after 10 PM
  WEEKEND_WARRIOR: 2, // Complete on both weekend days
} as const;

// ============================================
// MASTERY THRESHOLDS
// ============================================

export const MASTERY_CONFIG = {
  // Mastery levels (percentage)
  NOVICE: 0,
  BEGINNER: 30,
  INTERMEDIATE: 60,
  ADVANCED: 80,
  EXPERT: 95,

  // Gate thresholds
  DEFAULT_GATE_THRESHOLD: 70, // Need 70% mastery to unlock dependent concepts
  ADVANCED_GATE_THRESHOLD: 80, // For advanced content
  EXPERT_GATE_THRESHOLD: 90, // For expert/certification content

  // Review scheduling thresholds
  NEEDS_REVIEW_BELOW: 75, // Schedule review if mastery drops below 75%
  MASTERED_ABOVE: 90, // Consider mastered if above 90%

  // Decay rates (how fast mastery decays without review)
  DECAY_RATE_EASY_CONCEPT: 0.02, // 2% per week
  DECAY_RATE_MEDIUM_CONCEPT: 0.05, // 5% per week
  DECAY_RATE_HARD_CONCEPT: 0.08, // 8% per week
} as const;

// ============================================
// QUIZ CONFIGURATION
// ============================================

export const QUIZ_CONFIG = {
  // Passing scores
  DEFAULT_PASSING_SCORE: 70,
  CERTIFICATION_PASSING_SCORE: 80,

  // Attempts
  MAX_ATTEMPTS: 3, // Before requiring remediation
  XP_ON_IMPROVEMENT_ONLY: true, // Award XP only when score improves

  // Time limits (optional, in seconds)
  DEFAULT_TIME_LIMIT: null, // No time limit by default
  CERTIFICATION_TIME_LIMIT: 3600, // 60 minutes for certification quizzes

  // Hint system
  HINT_STAGES: 3, // Progressive disclosure: hint 1, hint 2, full explanation
  HINT_DELAY_SECONDS: 30, // Wait 30s before showing hint option
} as const;

// ============================================
// TIME TRACKING
// ============================================

export const TIME_TRACKING = {
  // Sync intervals
  SYNC_INTERVAL_SECONDS: 30, // Sync time data every 30 seconds

  // Idle detection
  MAX_IDLE_SECONDS: 120, // Pause timer after 2 minutes of inactivity

  // XP caps
  MAX_XP_TIME_BONUS: 10, // Cap time-based bonus at 10 XP
  TIME_BONUS_CAP_MINUTES: 10, // Stop awarding time bonus after 10 minutes

  // Activity detection events
  ACTIVITY_EVENTS: ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'] as const,
} as const;

// ============================================
// CELEBRATION TIMINGS
// ============================================

export const CELEBRATION_CONFIG = {
  // Animation durations (ms)
  CONFETTI_DURATION: 3000,
  TOAST_DURATION: 4000,
  BADGE_ANIMATION_DURATION: 2000,

  // Delays
  CELEBRATION_DELAY: 300, // Wait for backend confirmation
  CONFETTI_PARTICLE_COUNT: 100,

  // Sound effects (if enabled)
  SOUND_VOLUME: 0.5,
  SOUNDS_ENABLED_DEFAULT: true,
} as const;

// ============================================
// RATE LIMITS
// ============================================

export const RATE_LIMITS = {
  // Coach API
  COACH_MESSAGES_PER_MINUTE: 10,
  COACH_MESSAGES_PER_HOUR: 100,

  // Progress updates
  ATOM_COMPLETIONS_PER_MINUTE: 30,
  ATOM_COMPLETIONS_PER_HOUR: 200,

  // Profile updates
  PROFILE_UPDATES_PER_MINUTE: 10,

  // Auth
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
  SIGNUP_ATTEMPTS_PER_HOUR: 3,
} as const;

// ============================================
// DAILY GOALS
// ============================================

export const DAILY_GOALS = {
  // Default goal (minutes)
  DEFAULT_DAILY_GOAL: 30,

  // Goal presets
  LIGHT: 15, // 15 minutes
  MODERATE: 30, // 30 minutes
  INTENSIVE: 60, // 1 hour
  DEDICATED: 120, // 2 hours

  // Minimum/maximum allowed
  MIN_GOAL: 5,
  MAX_GOAL: 300, // 5 hours
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get streak multiplier based on current streak
 */
export function getStreakMultiplier(currentStreak: number): number {
  if (currentStreak >= 30) return XP_MULTIPLIERS.STREAK_30_DAY;
  if (currentStreak >= 14) return XP_MULTIPLIERS.STREAK_14_DAY;
  if (currentStreak >= 7) return XP_MULTIPLIERS.STREAK_7_DAY;
  if (currentStreak >= 3) return XP_MULTIPLIERS.STREAK_3_DAY;
  return 1.0;
}

// Atom type to XP mapping for type-safe lookup
const ATOM_XP_MAP: Record<'video' | 'reading' | 'quiz' | 'practice' | 'project', number> = {
  video: XP_VALUES.ATOM_VIDEO,
  reading: XP_VALUES.ATOM_READING,
  quiz: XP_VALUES.ATOM_QUIZ,
  practice: XP_VALUES.ATOM_PRACTICE,
  project: XP_VALUES.ATOM_PROJECT,
};

/**
 * Get XP for atom completion with all bonuses applied
 */
export function calculateAtomXPWithBonuses(
  atomType: 'video' | 'reading' | 'quiz' | 'practice' | 'project',
  currentStreak: number = 0,
  score?: number,
  timeSpentSeconds?: number
): {
  baseXP: number;
  streakBonus: number;
  speedBonus: number;
  perfectBonus: number;
  totalXP: number;
  breakdown: string[];
} {
  const baseXP = ATOM_XP_MAP[atomType] || 10;
  const streakMultiplier = getStreakMultiplier(currentStreak);

  // Calculate bonuses
  const streakBonus = Math.round(baseXP * (streakMultiplier - 1.0));

  const perfectBonus =
    atomType === 'quiz' && score === 100 ? XP_VALUES.PERFECT_QUIZ : 0;

  let speedBonus = 0;
  if (timeSpentSeconds && timeSpentSeconds < XP_VALUES.SPEED_THRESHOLD_SECONDS) {
    const speedRatio = 1 - timeSpentSeconds / XP_VALUES.SPEED_THRESHOLD_SECONDS;
    speedBonus = Math.min(
      Math.round(speedRatio * XP_VALUES.SPEED_BONUS_MAX),
      XP_VALUES.SPEED_BONUS_MAX
    );
  }

  const totalXP = baseXP + streakBonus + perfectBonus + speedBonus;

  // Build breakdown for UI
  const breakdown: string[] = [`${baseXP} base XP (${atomType})`];
  if (streakBonus > 0) breakdown.push(`+${streakBonus} streak bonus (${currentStreak} days)`);
  if (perfectBonus > 0) breakdown.push(`+${perfectBonus} perfect score`);
  if (speedBonus > 0) breakdown.push(`+${speedBonus} speed bonus`);

  return {
    baseXP,
    streakBonus,
    speedBonus,
    perfectBonus,
    totalXP,
    breakdown,
  };
}

/**
 * Get level info from total XP
 */
export function getLevelFromXP(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
} {
  let level = 1;

  // Find current level
  for (let i = LEVEL_THRESHOLDS_ARRAY.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS_ARRAY[i]) {
      level = i + 1;
      break;
    }
  }

  // Cap at max level
  if (level > MAX_LEVEL) {
    level = MAX_LEVEL;
  }

  // Calculate XP within current level
  const currentLevelThreshold = LEVEL_THRESHOLDS_ARRAY[level - 1] || 0;
  const nextLevelThreshold =
    level < MAX_LEVEL ? LEVEL_THRESHOLDS_ARRAY[level] : LEVEL_THRESHOLDS_ARRAY[MAX_LEVEL - 1];

  const currentLevelXP = totalXP - currentLevelThreshold;
  const xpToNextLevel = nextLevelThreshold - totalXP;
  const levelRange = nextLevelThreshold - currentLevelThreshold;
  const progressPercentage = levelRange > 0 ? (currentLevelXP / levelRange) * 100 : 100;

  return {
    level,
    currentLevelXP,
    xpToNextLevel: Math.max(0, xpToNextLevel),
    progressPercentage: Math.min(100, progressPercentage),
  };
}

/**
 * Estimate lessons needed to reach next level
 */
export function estimateLessonsToNextLevel(currentXP: number, avgXPPerLesson: number = 100): number {
  const { xpToNextLevel } = getLevelFromXP(currentXP);
  return Math.ceil(xpToNextLevel / avgXPPerLesson);
}
