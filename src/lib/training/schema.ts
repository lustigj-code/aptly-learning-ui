/**
 * Training Data Schema
 *
 * Defines the data structures for collecting, storing, and exporting
 * training data for the vertical AI tutor.
 */

// ============================================
// CORE TRAINING DATA TYPES
// ============================================

/**
 * A single turn in a tutoring conversation
 */
export type ConversationTurn = {
  role: 'user' | 'tutor';
  content: string;
  timestamp: Date;

  // Metadata for the turn
  metadata: TurnMetadata;
};

export type TurnMetadata = {
  // For tutor responses
  isSocratic: boolean;           // Did the tutor use Socratic method?
  askedQuestion: boolean;        // Did the response end with a question?
  gaveDirectAnswer: boolean;     // Did the tutor give away the answer?
  usedExample: boolean;          // Did the tutor use a real-world example?
  acknowledgedEmotion: boolean;  // Did the tutor acknowledge user's emotional state?

  // For user messages
  expressedConfusion: boolean;
  expressedFrustration: boolean;
  askedForHelp: boolean;
  demonstratedUnderstanding: boolean;

  // Quality signals
  responseTimeMs: number;
  tokenCount: number;
};

/**
 * A complete tutoring session with outcome data
 */
export type TutoringSession = {
  id: string;

  // Identifiers
  conversationId: string;
  userId: string;

  // Context
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  courseId: string;
  atomId?: string;
  atomType?: 'reading' | 'video' | 'quiz' | 'practice';

  // The conversation
  turns: ConversationTurn[];

  // Session metadata
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  totalTurns: number;

  // User state at session start
  userStateAtStart: UserLearningState;

  // User state at session end
  userStateAtEnd: UserLearningState;

  // Session quality metrics
  qualityMetrics: SessionQualityMetrics;

  // Learning outcomes (the key for RLHF)
  outcomes: LearningOutcome;

  // Annotations (human or automated)
  annotations?: SessionAnnotation[];

  // Export status
  exportedForTraining: boolean;
  exportedAt?: Date;
};

export type UserLearningState = {
  masteryLevel: number;           // 0-100
  experienceLevel: number;        // 0-100
  currentStreak: number;
  totalTimeSpentMinutes: number;
  lessonsCompleted: number;
  averageQuizScore: number;
  strugglingConcepts: string[];
  strongConcepts: string[];
  emotionalState: string;
  adaptiveDifficulty: 'beginner' | 'intermediate' | 'advanced';
};

export type SessionQualityMetrics = {
  // Socratic method adherence
  socraticRatio: number;              // % of tutor responses that are Socratic
  questionEndingRatio: number;        // % of responses ending with questions
  directAnswerRatio: number;          // % that gave direct answers (lower is better)

  // Engagement
  averageUserResponseLength: number;
  userEngagementScore: number;        // 0-1 based on response patterns

  // Pedagogical quality
  scaffoldingScore: number;           // 0-1 how well concepts were broken down
  exampleUsageScore: number;          // 0-1 use of real-world examples
  emotionalIntelligenceScore: number; // 0-1 response to user emotions

  // Conversation flow
  topicCoherence: number;             // 0-1 staying on topic
  progressionScore: number;           // 0-1 moving toward understanding
};

export type LearningOutcome = {
  // Immediate outcomes
  quizScoreAfter?: number;            // If they took a quiz after
  quizScoreBefore?: number;           // Quiz score before the session
  scoreImprovement?: number;          // Delta

  // Understanding signals
  demonstratedUnderstanding: boolean; // Did user show "aha" moment?
  completedAtom: boolean;             // Did they complete the learning content?
  neededMultipleAttempts: boolean;    // Required multiple explanations?

  // Retention (measured later)
  retentionScore7Day?: number;        // Spaced rep performance after 7 days
  retentionScore30Day?: number;       // After 30 days

  // User satisfaction
  userRating?: number;                // If user rated the session 1-5
  userFeedback?: string;              // Free-form feedback

  // Behavioral signals
  continuedLearning: boolean;         // Did they continue to next lesson?
  returnedNextDay: boolean;           // Did they come back?

  // Composite score for RLHF reward
  overallOutcomeScore: number;        // 0-1, computed from above
};

export type SessionAnnotation = {
  id: string;
  annotatorId: string;                // Human or 'auto'
  annotatedAt: Date;

  // Overall quality rating
  overallQuality: 1 | 2 | 3 | 4 | 5;

  // Specific ratings
  socraticMethodQuality: 1 | 2 | 3 | 4 | 5;
  explanationClarity: 1 | 2 | 3 | 4 | 5;
  adaptationToUser: 1 | 2 | 3 | 4 | 5;
  engagementMaintenance: 1 | 2 | 3 | 4 | 5;

  // Flags
  containsErrors: boolean;
  inappropriateContent: boolean;
  gaveAwayAnswer: boolean;

  // Notes
  notes?: string;

  // For training data selection
  includeInTraining: boolean;
  trainingWeight: number;             // 0-1, higher = more important example
};

// ============================================
// TRAINING DATA FORMATS
// ============================================

/**
 * Format for instruction fine-tuning (Alpaca/Vicuna style)
 */
export type InstructionExample = {
  instruction: string;
  input: string;
  output: string;

  // Metadata for filtering
  quality_score: number;
  topic: string;
  difficulty: string;
  conversation_id: string;
};

/**
 * Format for conversational fine-tuning
 */
export type ConversationalExample = {
  system: string;
  conversations: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;

  // Metadata
  quality_score: number;
  topic: string;
  session_id: string;
};

/**
 * Format for RLHF preference data
 */
export type PreferencePair = {
  prompt: string;
  chosen: string;          // Better response
  rejected: string;        // Worse response

  // Why chosen is better
  preference_reason: string;

  // Metadata
  topic: string;
  quality_delta: number;   // How much better is chosen vs rejected
};

/**
 * Format for reward model training
 */
export type RewardExample = {
  prompt: string;
  response: string;
  reward: number;          // -1 to 1

  // Components of reward
  reward_components: {
    socratic_adherence: number;
    clarity: number;
    engagement: number;
    learning_outcome: number;
    user_satisfaction: number;
  };
};

// ============================================
// DATA COLLECTION CONFIG
// ============================================

export type DataCollectionConfig = {
  // What to collect
  collectAllSessions: boolean;
  minimumTurnsForCollection: number;
  minimumDurationMinutes: number;

  // Quality thresholds for training
  minimumQualityScore: number;
  minimumOutcomeScore: number;

  // Anonymization
  anonymizeUserData: boolean;
  removePersonalInfo: boolean;

  // Sampling
  samplingRate: number;               // 0-1, % of sessions to collect
  oversamplePositiveOutcomes: boolean;

  // Storage
  storageLocation: 'firestore' | 's3' | 'gcs';
  retentionDays: number;
};

export const DEFAULT_COLLECTION_CONFIG: DataCollectionConfig = {
  collectAllSessions: true,
  minimumTurnsForCollection: 4,
  minimumDurationMinutes: 2,

  minimumQualityScore: 0.5,
  minimumOutcomeScore: 0.3,

  anonymizeUserData: true,
  removePersonalInfo: true,

  samplingRate: 1.0,
  oversamplePositiveOutcomes: true,

  storageLocation: 'firestore',
  retentionDays: 365,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate overall outcome score from individual signals
 */
export function calculateOutcomeScore(outcome: Partial<LearningOutcome>): number {
  let score = 0;
  let weights = 0;

  // Quiz improvement (weight: 0.25)
  if (outcome.scoreImprovement !== undefined) {
    const normalizedImprovement = Math.min(1, Math.max(0, outcome.scoreImprovement / 30));
    score += normalizedImprovement * 0.25;
    weights += 0.25;
  }

  // Demonstrated understanding (weight: 0.2)
  if (outcome.demonstratedUnderstanding !== undefined) {
    score += (outcome.demonstratedUnderstanding ? 1 : 0) * 0.2;
    weights += 0.2;
  }

  // Completed atom (weight: 0.15)
  if (outcome.completedAtom !== undefined) {
    score += (outcome.completedAtom ? 1 : 0) * 0.15;
    weights += 0.15;
  }

  // User rating (weight: 0.2)
  if (outcome.userRating !== undefined) {
    score += ((outcome.userRating - 1) / 4) * 0.2;
    weights += 0.2;
  }

  // Continued learning (weight: 0.1)
  if (outcome.continuedLearning !== undefined) {
    score += (outcome.continuedLearning ? 1 : 0) * 0.1;
    weights += 0.1;
  }

  // Returned next day (weight: 0.1)
  if (outcome.returnedNextDay !== undefined) {
    score += (outcome.returnedNextDay ? 1 : 0) * 0.1;
    weights += 0.1;
  }

  // Normalize by weights used
  return weights > 0 ? score / weights : 0.5;
}

/**
 * Calculate session quality metrics from turns
 */
export function calculateQualityMetrics(turns: ConversationTurn[]): SessionQualityMetrics {
  const tutorTurns = turns.filter(t => t.role === 'tutor');
  const userTurns = turns.filter(t => t.role === 'user');

  if (tutorTurns.length === 0) {
    return {
      socraticRatio: 0,
      questionEndingRatio: 0,
      directAnswerRatio: 1,
      averageUserResponseLength: 0,
      userEngagementScore: 0,
      scaffoldingScore: 0,
      exampleUsageScore: 0,
      emotionalIntelligenceScore: 0,
      topicCoherence: 0,
      progressionScore: 0,
    };
  }

  const socraticCount = tutorTurns.filter(t => t.metadata.isSocratic).length;
  const questionCount = tutorTurns.filter(t => t.metadata.askedQuestion).length;
  const directAnswerCount = tutorTurns.filter(t => t.metadata.gaveDirectAnswer).length;
  const exampleCount = tutorTurns.filter(t => t.metadata.usedExample).length;
  const emotionAckCount = tutorTurns.filter(t => t.metadata.acknowledgedEmotion).length;

  const emotionalTurns = userTurns.filter(
    t => t.metadata.expressedConfusion || t.metadata.expressedFrustration
  ).length;

  const avgUserLength = userTurns.length > 0
    ? userTurns.reduce((sum, t) => sum + t.content.length, 0) / userTurns.length
    : 0;

  // Engagement based on response length and understanding signals
  const understandingCount = userTurns.filter(t => t.metadata.demonstratedUnderstanding).length;
  const engagementScore = Math.min(1, (avgUserLength / 200) * 0.5 + (understandingCount / Math.max(1, userTurns.length)) * 0.5);

  return {
    socraticRatio: socraticCount / tutorTurns.length,
    questionEndingRatio: questionCount / tutorTurns.length,
    directAnswerRatio: directAnswerCount / tutorTurns.length,
    averageUserResponseLength: avgUserLength,
    userEngagementScore: engagementScore,
    scaffoldingScore: 1 - (directAnswerCount / tutorTurns.length), // Inverse of direct answers
    exampleUsageScore: exampleCount / tutorTurns.length,
    emotionalIntelligenceScore: emotionalTurns > 0 ? emotionAckCount / emotionalTurns : 1,
    topicCoherence: 0.8, // Would need NLP to calculate properly
    progressionScore: understandingCount > 0 ? 0.8 : 0.4, // Simplified
  };
}

/**
 * Create empty turn metadata
 */
export function createEmptyTurnMetadata(): TurnMetadata {
  return {
    isSocratic: false,
    askedQuestion: false,
    gaveDirectAnswer: false,
    usedExample: false,
    acknowledgedEmotion: false,
    expressedConfusion: false,
    expressedFrustration: false,
    askedForHelp: false,
    demonstratedUnderstanding: false,
    responseTimeMs: 0,
    tokenCount: 0,
  };
}
