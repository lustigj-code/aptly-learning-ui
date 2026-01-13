/**
 * Application-wide constants
 * Single source of truth for magic numbers
 *
 * Phase 6: Configuration & Deployment
 * Centralizes all hardcoded values for easy maintenance and consistency
 */

// ============================================
// QUIZ CONFIGURATION
// ============================================

export const QUIZ = {
  /** Default passing score percentage (70%) */
  DEFAULT_PASSING_SCORE: 70,
  /** Certification passing score percentage (80%) */
  CERTIFICATION_PASSING_SCORE: 80,
  /** Default allow retakes setting */
  DEFAULT_ALLOW_RETAKES: false,
  /** Maximum quiz attempts before requiring remediation */
  MAX_ATTEMPTS: 3,
  /** Default time limit in minutes (null = no limit) */
  TIME_LIMIT_MINUTES: null as number | null,
  /** Certification quiz time limit in seconds */
  CERTIFICATION_TIME_LIMIT_SECONDS: 3600,
  /** Progressive hint stages count */
  HINT_STAGES: 3,
  /** Delay before showing hint option (seconds) */
  HINT_DELAY_SECONDS: 30,
} as const;

// ============================================
// INTERACTION LOGGING
// ============================================

export const INTERACTION = {
  /** Client-side batch size before flush */
  BATCH_SIZE: 50,
  /** Interval between automatic flushes (ms) */
  FLUSH_INTERVAL_MS: 10000,
  /** Maximum batch size for interaction logs */
  MAX_BATCH_SIZE: 100,
  /** Session storage key for session ID */
  SESSION_KEY: 'aptly_learning_session',
} as const;

// ============================================
// MASTERY THRESHOLDS
// ============================================

export const MASTERY = {
  /** Mastered threshold (95%) */
  THRESHOLD_MASTERED: 0.95,
  /** Proficient/familiar threshold (70%) */
  THRESHOLD_PROFICIENT: 0.7,
  /** Learning threshold (40%) */
  THRESHOLD_LEARNING: 0.4,
  /** Expert threshold (90%) */
  THRESHOLD_EXPERT: 0.9,
  /** Needs review threshold (75%) */
  THRESHOLD_NEEDS_REVIEW: 0.75,
  /** Default gate threshold for unlocking content (70%) */
  DEFAULT_GATE_THRESHOLD: 0.7,
  /** Advanced content gate threshold (80%) */
  ADVANCED_GATE_THRESHOLD: 0.8,
  /** Expert/certification gate threshold (90%) */
  EXPERT_GATE_THRESHOLD: 0.9,
  /** Default target retention (95%) */
  TARGET_RETENTION: 0.95,
} as const;

// ============================================
// URGENCY THRESHOLDS (for review scheduling)
// ============================================

export const URGENCY = {
  /** High urgency threshold - needs immediate review */
  HIGH_THRESHOLD: 0.7,
  /** Medium urgency threshold */
  MEDIUM_THRESHOLD: 0.5,
  /** Low urgency threshold */
  LOW_THRESHOLD: 0.85,
} as const;

// ============================================
// STREAK CONFIGURATION
// ============================================

export const STREAK = {
  /** Maximum streak freezes available */
  FREEZE_MAX: 5,
  /** Initial freezes for new users */
  INITIAL_FREEZES: 2,
  /** Streak bonus multiplier */
  BONUS_MULTIPLIER: 1.5,
  /** Streak milestone days for celebrations */
  MILESTONE_DAYS: [3, 7, 14, 30, 60, 90, 180, 365] as readonly number[],
  /** Days to earn a freeze at these milestones */
  FREEZE_MILESTONES: [7, 30, 90] as readonly number[],
} as const;

// ============================================
// XP CONFIGURATION
// ============================================

export const XP = {
  /** Base XP for atom completion */
  ATOM_COMPLETION: 10,
  /** XP for lesson completion */
  LESSON_COMPLETION: 50,
  /** XP for module completion */
  MODULE_COMPLETION: 150,
  /** XP for course completion */
  COURSE_COMPLETION: 500,
  /** Bonus XP for perfect quiz score */
  QUIZ_PERFECT: 10,
  /** Streak bonus XP */
  STREAK_BONUS: 5,
  /** Base XP for level calculation */
  LEVEL_BASE: 100,
  /** Level multiplier for XP curve */
  LEVEL_MULTIPLIER: 1.5,
  /** Maximum XP time bonus */
  MAX_TIME_BONUS: 10,
  /** Speed bonus max points */
  SPEED_BONUS_MAX: 5,
  /** Speed threshold in seconds */
  SPEED_THRESHOLD_SECONDS: 60,
} as const;

// ============================================
// CONTENT STRUCTURE
// ============================================

export const CONTENT = {
  /** Total lessons in AI at Work course */
  TOTAL_LESSONS: 47,
  /** Average atoms per lesson */
  ATOMS_PER_LESSON: 8,
  /** Number of modules */
  MODULES_COUNT: 5,
} as const;

// ============================================
// TIMING CONFIGURATION
// ============================================

export const TIMING = {
  /** Idle threshold before pausing timer (seconds) */
  IDLE_THRESHOLD_SECONDS: 120,
  /** Proactive prompt delay (seconds) */
  PROACTIVE_PROMPT_SECONDS: 60,
  /** Session timeout (minutes) */
  SESSION_TIMEOUT_MINUTES: 30,
  /** Time sync interval (seconds) */
  SYNC_INTERVAL_SECONDS: 30,
  /** Time bonus cap (minutes) */
  TIME_BONUS_CAP_MINUTES: 10,
} as const;

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
  /** Batch size for Firestore operations */
  FIRESTORE_BATCH_SIZE: 500,
} as const;

// ============================================
// EMBEDDING & RAG
// ============================================

export const EMBEDDING = {
  /** Batch size for embedding generation */
  BATCH_SIZE: 20,
  /** Maximum batch size for OpenAI */
  OPENAI_MAX_BATCH: 2048,
  /** Maximum batch size for Google */
  GOOGLE_MAX_BATCH: 100,
  /** Vector upsert batch size */
  VECTOR_BATCH_SIZE: 100,
} as const;

// ============================================
// RATE LIMITS
// ============================================

export const RATE_LIMITS = {
  /** Coach messages per minute */
  COACH_MESSAGES_PER_MINUTE: 10,
  /** Coach messages per hour */
  COACH_MESSAGES_PER_HOUR: 100,
  /** Atom completions per minute */
  ATOM_COMPLETIONS_PER_MINUTE: 30,
  /** Atom completions per hour */
  ATOM_COMPLETIONS_PER_HOUR: 200,
  /** Profile updates per minute */
  PROFILE_UPDATES_PER_MINUTE: 10,
  /** Login attempts per minute */
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
  /** Signup attempts per hour */
  SIGNUP_ATTEMPTS_PER_HOUR: 3,
} as const;

// ============================================
// DAILY GOALS
// ============================================

export const DAILY_GOALS = {
  /** Default daily goal (minutes) */
  DEFAULT: 30,
  /** Light goal preset (minutes) */
  LIGHT: 15,
  /** Moderate goal preset (minutes) */
  MODERATE: 30,
  /** Intensive goal preset (minutes) */
  INTENSIVE: 60,
  /** Dedicated goal preset (minutes) */
  DEDICATED: 120,
  /** Minimum allowed goal (minutes) */
  MIN: 5,
  /** Maximum allowed goal (minutes) */
  MAX: 300,
} as const;

// ============================================
// CELEBRATION CONFIGURATION
// ============================================

export const CELEBRATION = {
  /** Confetti animation duration (ms) */
  CONFETTI_DURATION_MS: 3000,
  /** Toast notification duration (ms) */
  TOAST_DURATION_MS: 4000,
  /** Badge animation duration (ms) */
  BADGE_ANIMATION_DURATION_MS: 2000,
  /** Delay before celebration (ms) */
  DELAY_MS: 300,
  /** Confetti particle count */
  CONFETTI_PARTICLES: 100,
  /** Sound effects volume */
  SOUND_VOLUME: 0.5,
} as const;

// ============================================
// AI CONFIGURATION
// ============================================

export const AI = {
  /** Default temperature for AI responses */
  DEFAULT_TEMPERATURE: 0.7,
  /** Low temperature for factual responses */
  LOW_TEMPERATURE: 0.3,
  /** High temperature for creative responses */
  HIGH_TEMPERATURE: 0.9,
  /** Maximum tokens for chat responses */
  MAX_TOKENS_CHAT: 1000,
  /** Maximum tokens for explanations */
  MAX_TOKENS_EXPLANATION: 500,
  /** RAG similarity threshold */
  RAG_SIMILARITY_THRESHOLD: 0.7,
  /** Number of RAG context chunks */
  RAG_CONTEXT_CHUNKS: 5,
} as const;

// ============================================
// UI SCORE THRESHOLDS
// ============================================

export const SCORE_THRESHOLDS = {
  /** Excellent score (90%) */
  EXCELLENT: 90,
  /** Good score (70%) */
  GOOD: 70,
  /** Fair score (50%) */
  FAIR: 50,
  /** XP reward for excellent score */
  EXCELLENT_XP: 100,
  /** XP reward for good score */
  GOOD_XP: 75,
  /** XP reward for fair score */
  FAIR_XP: 50,
} as const;
