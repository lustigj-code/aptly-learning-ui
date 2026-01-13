/**
 * Aptly Learning - Firebase Database Schema Types
 *
 * Single source of truth for all Firestore collection types.
 * Every read/write should use these types for consistency.
 *
 * Collections:
 * - learners/{userId}/progress - Overall learning progress
 * - learners/{userId}/mastery/{conceptId} - Per-concept mastery
 * - learners/{userId}/sessions/{sessionId} - Learning sessions
 * - learners/{userId}/achievements/{badgeId} - Earned badges
 * - events/interactions/{eventId} - Quiz/practice responses (ML data)
 * - events/engagement/{eventId} - Video/reading analytics
 * - events/struggles/{eventId} - Struggle detection events
 * - content/concepts/{conceptId} - Concept graph metadata
 */

import type { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// LEARNER PROGRESS - learners/{userId}/progress
// ═══════════════════════════════════════════════════════════════════════════

export type AtomType = 'video' | 'reading' | 'quiz' | 'practice';

export type ResumeState = {
  atomId: string;
  atomType: AtomType;

  // Video resume - exact timestamp in seconds
  videoTimestamp: number | null;

  // Quiz resume - restore question position and partial answers
  quizQuestionIndex: number | null;
  quizAnswers: Record<string, string> | null;

  // Reading resume - scroll position as percentage (0-100)
  scrollPosition: number | null;

  // Practice resume - preserve draft response
  practiceResponse: string | null;

  lastUpdated: Timestamp;
};

export type StreakDay = {
  date: string; // YYYY-MM-DD
  completed: boolean;
  minutes: number;
};

export type StreakData = {
  current: number;
  longest: number;
  lastDate: string; // YYYY-MM-DD
  freezesLeft: number;
  history: StreakDay[]; // Last 30 days
};

export type LearnerProgress = {
  // ═══════════════════════════════════════════════════════
  // EXACT POSITION - For "pick up where you left off"
  // ═══════════════════════════════════════════════════════
  currentCourseId: string;
  currentModuleId: string;
  currentLessonId: string;
  currentAtomId: string;

  // Granular resume state (for mid-content resume)
  resumeState: ResumeState | null;

  // ═══════════════════════════════════════════════════════
  // COMPLETION TRACKING - What's done
  // ═══════════════════════════════════════════════════════
  atomsCompleted: string[];
  lessonsCompleted: string[];
  modulesCompleted: string[];
  coursesCompleted: string[];

  // ═══════════════════════════════════════════════════════
  // GAMIFICATION
  // ═══════════════════════════════════════════════════════
  totalXP: number;
  currentLevel: number;

  // ═══════════════════════════════════════════════════════
  // TIME TRACKING
  // ═══════════════════════════════════════════════════════
  totalTimeMinutes: number;
  lastActiveAt: Timestamp;

  // ═══════════════════════════════════════════════════════
  // STREAK (embedded, single source)
  // ═══════════════════════════════════════════════════════
  streak: StreakData;

  // ═══════════════════════════════════════════════════════
  // AGGREGATE METRICS (computed from events)
  // ═══════════════════════════════════════════════════════
  avgMastery: number; // 0-1, across all concepts
  learningVelocity: number; // Concepts mastered per week
  struggleScore: number; // 0-1, current struggle level
  engagementScore: number; // 0-1, recent engagement
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT MASTERY - learners/{userId}/mastery/{conceptId}
// ═══════════════════════════════════════════════════════════════════════════

export type MasteryLevel = 'none' | 'learning' | 'familiar' | 'proficient' | 'mastered';

export type FSRSState = 'new' | 'learning' | 'review' | 'relearning';

export type FSRSData = {
  stability: number; // Memory stability (days)
  difficulty: number; // 0-10 personal difficulty
  nextReviewAt: Timestamp;
  state: FSRSState;
  reps: number;
  lapses: number;
};

export type BKTData = {
  pLearn: number; // Probability of learning
  pGuess: number; // Probability of guessing
  pSlip: number; // Probability of slip
  attempts: number;
  correctCount: number;
};

export type MasteryHistoryEntry = {
  timestamp: Timestamp;
  correct: boolean;
  pMasteryAfter: number;
  responseTimeMs: number;
};

export type ConceptMastery = {
  conceptId: string;
  conceptName: string;

  // Mastery state (0-1 scale, unified)
  pMastery: number;
  masteryLevel: MasteryLevel;

  // FSRS scheduling
  fsrs: FSRSData;

  // BKT components (for hybrid model)
  bkt: BKTData;

  // Learning curve data
  history: MasteryHistoryEntry[];

  lastAttempt: Timestamp;
  updatedAt: Timestamp;
};

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING SESSIONS - learners/{userId}/sessions/{sessionId}
// ═══════════════════════════════════════════════════════════════════════════

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type LearningSession = {
  sessionId: string;

  // Timing
  startedAt: Timestamp;
  endedAt: Timestamp | null; // null = active session
  durationMinutes: number;

  // What was studied
  atomsViewed: string[];
  atomsCompleted: string[];
  conceptsTouched: string[];

  // Engagement metrics
  activeTimeMinutes: number; // Excluding idle time
  idleTimeMinutes: number;

  // Performance in session
  questionsAttempted: number;
  questionsCorrect: number;
  avgResponseTimeMs: number;

  // Struggle indicators
  hintsRequested: number;
  retryCount: number;
  struggleEvents: number;

  // Device context
  deviceType: DeviceType;
  userAgent: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION EVENTS - events/interactions/{eventId}
// ML Training Data for quiz answers, practice responses
// ═══════════════════════════════════════════════════════════════════════════

export type InteractionType = 'quiz_answer' | 'practice_submit' | 'hint_request' | 'review_attempt';

export type InteractionEvent = {
  // Identity
  userId: string;
  sessionId: string;
  eventId: string;

  // Context
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: AtomType;
  conceptId: string;
  questionId: string | null;

  // The interaction
  type: InteractionType;
  isCorrect: boolean | null;
  selectedAnswer: string | null;
  correctAnswer: string | null;

  // Timing (critical for ML)
  timestamp: Timestamp;
  responseTimeMs: number;
  timeSinceLastAttempt: number | null; // For forgetting curve

  // State at time of interaction (for model training)
  pMasteryBefore: number;
  pMasteryAfter: number;
  attemptNumber: number;
  consecutiveWrong: number;

  // Difficulty context
  questionDifficulty: number | null;
  userAbilityEstimate: number | null;
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT EVENTS - events/engagement/{eventId}
// Video watch, reading analytics, scroll tracking
// ═══════════════════════════════════════════════════════════════════════════

export type EngagementType = 'video_watch' | 'reading_view' | 'page_scroll' | 'content_complete';

export type VideoMetrics = {
  watchedSeconds: number;
  totalSeconds: number;
  completionPercent: number;
  pauseCount: number;
  rewindCount: number;
  playbackSpeed: number;
  watchedSegments: [number, number][]; // [start, end] pairs
};

export type ReadingMetrics = {
  scrollDepthPercent: number;
  timeOnPageMs: number;
  estimatedReadTime: number;
  actualReadTime: number;
};

export type EngagementEvent = {
  userId: string;
  sessionId: string;
  atomId: string;
  atomType: AtomType;

  type: EngagementType;

  // Video-specific (null if not video)
  videoMetrics: VideoMetrics | null;

  // Reading-specific (null if not reading)
  readingMetrics: ReadingMetrics | null;

  timestamp: Timestamp;
};

// ═══════════════════════════════════════════════════════════════════════════
// STRUGGLE EVENTS - events/struggles/{eventId}
// Intervention triggers for adaptive learning
// ═══════════════════════════════════════════════════════════════════════════

export type StruggleType = 'long_pause' | 'multiple_wrong' | 'hint_request' | 'rage_quit' | 'fast_skip';

export type StruggeSeverity = 'low' | 'medium' | 'high';

export type StruggleEvent = {
  userId: string;
  sessionId: string;
  conceptId: string;
  atomId: string;

  type: StruggleType;
  severity: StruggeSeverity;

  // Metrics at struggle point
  consecutiveWrong: number;
  timeStuckMs: number;
  hintsUsed: number;
  pMasteryAtStruggle: number;

  // Intervention taken (if any)
  interventionType: string | null;
  interventionAccepted: boolean | null;

  timestamp: Timestamp;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT CONCEPTS - content/concepts/{conceptId}
// Concept graph for prerequisite mapping and adaptive pathways
// ═══════════════════════════════════════════════════════════════════════════

export type Concept = {
  conceptId: string;
  name: string;
  description: string;

  // Prerequisites (for adaptive pathways)
  prerequisites: string[]; // Other concept IDs
  dependents: string[]; // Concepts that require this

  // Content mapping
  taughtInAtoms: string[]; // Which atoms teach this
  assessedInAtoms: string[]; // Which atoms assess this

  // Difficulty metadata
  avgDifficulty: number; // 0-10, computed from learner data
  avgTimeToMastery: number; // Days, computed

  // Domain
  domain: string; // 'social-media-marketing'
  category: string; // 'advertising', 'analytics', etc.
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES FOR CREATING NEW DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════

// For creating new progress - omit fields that will be auto-set
export type CreateLearnerProgress = Omit<LearnerProgress, 'lastActiveAt'> & {
  lastActiveAt?: Timestamp;
};

// For creating new mastery - omit fields that will be auto-set
export type CreateConceptMastery = Omit<ConceptMastery, 'lastAttempt' | 'updatedAt'> & {
  lastAttempt?: Timestamp;
  updatedAt?: Timestamp;
};

// Default values for new learner progress
export const DEFAULT_LEARNER_PROGRESS: Omit<LearnerProgress, 'lastActiveAt'> = {
  currentCourseId: 'course-1',
  currentModuleId: 'c1-m1',
  currentLessonId: 'c1-m1-l1',
  currentAtomId: '',
  resumeState: null,
  atomsCompleted: [],
  lessonsCompleted: [],
  modulesCompleted: [],
  coursesCompleted: [],
  totalXP: 0,
  currentLevel: 1,
  totalTimeMinutes: 0,
  streak: {
    current: 0,
    longest: 0,
    lastDate: '',
    freezesLeft: 2,
    history: [],
  },
  avgMastery: 0,
  learningVelocity: 0,
  struggleScore: 0,
  engagementScore: 0,
};

// Default FSRS values for new concepts
export const DEFAULT_FSRS: FSRSData = {
  stability: 0,
  difficulty: 5,
  nextReviewAt: null as unknown as Timestamp, // Will be set on first review
  state: 'new',
  reps: 0,
  lapses: 0,
};

// Default BKT values for new concepts
export const DEFAULT_BKT: BKTData = {
  pLearn: 0.3, // Probability of learning on attempt
  pGuess: 0.2, // Probability of guessing correctly
  pSlip: 0.1, // Probability of slipping (wrong despite knowing)
  attempts: 0,
  correctCount: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL MEDIA MARKETING SKILL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SMM_SKILLS: Record<string, string> = {
  'smm-fundamentals': 'Social Media Fundamentals',
  'platform-overview': 'Platform Overview',
  'campaign-objectives': 'Campaign Objectives',
  'campaign-structure': 'Campaign Structure',
  'social-strategy': 'Social Strategy',
  'content-creation': 'Content Creation',
  'meta-ads': 'Meta Advertising',
  'analytics': 'Analytics & Reporting',
  'audience-targeting': 'Audience Targeting',
};

// Mastery level thresholds
export const MASTERY_THRESHOLDS = {
  none: 0,
  learning: 0.2,
  familiar: 0.5,
  proficient: 0.75,
  mastered: 0.95,
} as const;

// Convert pMastery to MasteryLevel
export function getMasteryLevel(pMastery: number): MasteryLevel {
  if (pMastery >= MASTERY_THRESHOLDS.mastered) return 'mastered';
  if (pMastery >= MASTERY_THRESHOLDS.proficient) return 'proficient';
  if (pMastery >= MASTERY_THRESHOLDS.familiar) return 'familiar';
  if (pMastery >= MASTERY_THRESHOLDS.learning) return 'learning';
  return 'none';
}
