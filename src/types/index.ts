// ============================================
// USER TYPES
// ============================================

export type LearningPace = 'relaxed' | 'moderate' | 'intensive';
export type LearningTime = 'morning' | 'afternoon' | 'evening';
export type Performance = 'struggling' | 'progressing' | 'excelling';

export type InterleavingIntensity = 'light' | 'moderate' | 'heavy';

export type UserPreferences = {
  learningPace: LearningPace;
  dailyGoalMinutes: number;
  preferredLearningTime: LearningTime;
  voiceEnabled: boolean;
  soundEffectsEnabled: boolean;
  reducedMotion: boolean;
  preferReadingOrVideo?: 'reading' | 'video';
  quizTiming?: 'during' | 'end';
  // Exam Mode (v2.0)
  certificationExamDate?: Date;
  targetRetention?: number; // Default 0.95 (95%)
  examModeEnabled?: boolean;
  // Review Interleaving (Phase 13)
  interleavingEnabled?: boolean; // Default true
  interleavingIntensity?: InterleavingIntensity; // Default 'moderate' (30%)
  // Coach timing preferences (Phase 3-2)
  showMilestones?: boolean;
  showTransitions?: boolean;
  showDifficultyPrep?: boolean;
};

export type StreakDay = {
  date: string;
  completed: boolean;
  minutesStudied: number;
  lessonsCompleted: number;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezesAvailable: number;
  freezesUsed: string[];
  streakHistory: StreakDay[];
};

export type AssessmentScore = {
  assessmentId: string;
  score: number;
  completedAt: Date;
};

export type MasteryLevel = {
  skillId: string;
  level: number;
};

export type UserProgress = {
  currentCourseId: string;
  currentModuleId: string;
  currentLessonId: string;
  currentAtomId: string;
  overallPercentage: number;
  coursesCompleted: string[];
  modulesCompleted: string[];
  lessonsCompleted: string[];
  atomsCompleted: string[];
  assessmentScores: AssessmentScore[];
  masteryLevels: MasteryLevel[];
  totalTimeSpentMinutes: number;
  lastActiveAt: Date;
  xp: number;
  streak: StreakData;
};

export type UserRole = 'student' | 'admin' | 'instructor';

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: UserRole;
  createdAt: Date;
  preferences: UserPreferences;
  progress: UserProgress;
  streak: StreakData;
  badges: Badge[];
  goal?: string;
  experienceLevel?: number;
};

// ============================================
// COURSE CONTENT TYPES
// ============================================

export type VideoChapter = {
  time: number;
  title: string;
};

export type Resource = {
  title: string;
  url: string;
  type: 'article' | 'video' | 'tool' | 'download';
};

export type RubricItem = {
  criterion: string;
  weight: number;
};

export type VideoContent = {
  videoUrl: string;
  transcript: string;
  duration: number;
  chapters: VideoChapter[];
  keyTakeaways: string[];
};

export type ReadingContent = {
  body: string;
  highlights: string[];
  relatedResources?: Resource[];
};

export type PracticeContent = {
  type: 'ai-conversation' | 'scenario' | 'exercise';
  prompt: string;
  context: string;
  expectedOutcomes: string[];
  rubric: RubricItem[];
};

export type Question = {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'open-ended';
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skills: string[];
};

export type QuizContent = {
  questions: Question[];
  passingScore: number;
  allowRetakes?: boolean;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};

export type ProjectContent = {
  title: string;
  description: string;
  requirements: string[];
  rubric: RubricItem[];
  submissionType: 'text' | 'file' | 'link';
};

export type AtomType = 'video' | 'reading' | 'practice' | 'quiz' | 'project';

export type Atom = {
  id: string;
  lessonId: string;
  type: AtomType;
  title: string;
  content: VideoContent | ReadingContent | PracticeContent | QuizContent | ProjectContent;
  estimatedMinutes: number;
  isRequired: boolean;
  masteryThreshold: number;
};

export type Lesson = {
  id: string;
  moduleId: string;
  number: number;
  title: string;
  objectives: string[];
  estimatedMinutes: number;
  atoms: Atom[];
  isLocked: boolean;
};

export type Module = {
  id: string;
  courseId: string;
  number: number;
  title: string;
  objectives: string[];
  estimatedMinutes: number;
  lessons: Lesson[];
  isLocked: boolean;
};

export type Course = {
  id: string;
  number: number;
  title: string;
  description: string;
  objectives: string[];
  estimatedHours: number;
  modules: Module[];
  isLocked: boolean;
  prerequisites: string[];
  /** Domain ID linking to DomainConfig (e.g., 'ai-at-work', 'social-media-marketing') */
  domain?: string;
};

export type Exam = {
  id: string;
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  totalQuestions: number;
};

export type Program = {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  courses: Course[];
  certificationExam: Exam;
};

// ============================================
// AI COACH TYPES
// ============================================

export type MessageContext = {
  currentAtomId: string;
  currentAtomType: AtomType;
  userMasteryLevel: number;
  recentPerformance: Performance;
  sessionGoal: string;
};

export type CoachFeedback = {
  isCorrect?: boolean;
  masteryDelta: number;
  encouragement: string;
  nextSteps: string[];
  suggestedReview?: string[];
};

export type CoachMessage = {
  id: string;
  role: 'coach' | 'user';
  content: string;
  timestamp: Date;
  context?: MessageContext;
  feedback?: CoachFeedback;
};

// ============================================
// GAMIFICATION TYPES
// ============================================

export type BadgeType = 'skill' | 'milestone' | 'streak' | 'special';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type BadgeCriteriaType = 'completion' | 'streak' | 'score' | 'time' | 'custom';

export type BadgeCriteria = {
  type: BadgeCriteriaType;
  threshold?: number;
  relatedEntityId?: string;
};

export type Badge = {
  id: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  earnedAt?: Date;
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
};

export type CelebrationTier = 1 | 2 | 3 | 4 | 5;

export type CelebrationEvent = {
  type: 'correct-answer' | 'quiz-passed' | 'atom-complete' | 'lesson-complete' | 'module-complete' | 'course-complete' | 'streak-milestone' | 'badge-unlock' | 'comeback';
  tier: CelebrationTier;
  xpEarned: number;
  message?: string;
  badgeId?: string;
};

// ============================================
// CHARACTER TYPES
// ============================================

export type CharacterName = 'owl' | 'cat' | 'dog' | 'squirrel' | 'jellyfish';

export type CharacterMood =
  | 'idle'
  | 'celebrating'
  | 'encouraging'
  | 'thinking'
  | 'proud'
  | 'concerned'
  | 'excited'
  | 'impressed';

export type Character = {
  name: CharacterName;
  displayName: string;
  role: string;
  personality: string;
};

// ============================================
// UI STATE TYPES
// ============================================

export type OnboardingStep =
  | 'welcome'
  | 'name'
  | 'domain'
  | 'goal'
  | 'experience'
  | 'time'
  | 'style'
  | 'complete';

export type PageRoute =
  | 'onboarding'
  | 'dashboard'
  | 'learn'
  | 'progress'
  | 'achievements'
  | 'settings';

export type CoachPanelState = 'collapsed' | 'expanded' | 'fullscreen';

export type QuizState = {
  currentQuestionIndex: number;
  answers: Record<string, string | number>;
  showingFeedback: boolean;
  isComplete: boolean;
  score: number;
};

// ============================================
// API TYPES
// ============================================

export type CoachContext = {
  userName: string;
  currentCourse: string;
  currentModule: string;
  currentLesson: string;
  currentAtom: string;
  atomContent: string;
  recentPerformance: Performance;
  masteryLevel: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type PracticeEvaluation = {
  isCorrect: boolean;
  score: number;
  feedback: string;
  guidanceIfWrong?: string;
};

// ============================================
// INTERACTION LOGGING TYPES (for ML Training)
// ============================================

export type InteractionType =
  | 'quiz_answer'
  | 'practice_response'
  | 'content_view'
  | 'hint_request'
  | 'coach_interaction'
  | 'review_attempt';

export interface InteractionLog {
  id: string;
  userId: string;
  sessionId: string;

  // Learning Context
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: AtomType;

  // Skill Context (for BKT/DKT)
  skillId: string;
  skillName: string;
  questionId?: string;

  // Response Data
  interactionType: InteractionType;
  isCorrect?: boolean;
  selectedAnswer?: string;
  correctAnswer?: string;

  // Timing (for forgetting curve)
  timestamp: Date;
  responseTimeMs: number;
  timeGapFromLastAttempt?: number;

  // Attempt Context
  attemptNumber: number;
  consecutiveWrongOnSkill: number;
  hintsUsedBefore: number;

  // Difficulty Context (for Rasch model)
  questionDifficulty?: number;
  userAbilityEstimate?: number;

  // Current Mastery State (for model training)
  pMasteryBefore: number;
  pMasteryAfter: number;

  // Experiment Context
  experimentVariants: Record<string, string>;

  // Device Context (for personalization)
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface InteractionLogInput extends Omit<InteractionLog, 'id' | 'timestamp'> {
  timestamp?: Date;
}

// Device type detection utility
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// ============================================
// SOCRATIC COACH TYPES (Phase 12.2)
// ============================================

/**
 * Intervention levels for Socratic coaching
 * - Level 1: Leading questions ("What do you think happens when...?")
 * - Level 2: Hints with context ("Remember that X relates to Y...")
 * - Level 3: Worked example (only after 2 failed attempts)
 */
export type InterventionLevel = 1 | 2 | 3;

/**
 * Types of interventions
 * - question: Metacognitive or leading question
 * - hint: Contextual hint pointing to area of confusion
 * - worked_example: Step-by-step solution of similar problem
 */
export type InterventionType = 'question' | 'hint' | 'worked_example';

/**
 * Socratic coach response with intervention metadata
 */
export interface SocraticResponse {
  /** The coach's message content */
  message: string;

  /** Current intervention level (1-3) */
  interventionLevel: InterventionLevel;

  /** Type of intervention used */
  interventionType: InterventionType;

  /** Suggested follow-up questions for continued engagement */
  followUpQuestions: string[];

  /** Related concepts for transfer learning */
  relatedConcepts: string[];

  /** Optional confidence score (0-1) */
  confidence?: number;

  /** Optional reasoning explanation for the response */
  reasoning?: string;
}

/**
 * Context for Socratic coaching request
 */
export interface SocraticCoachRequest {
  /** Student's message or response */
  message: string;

  /** Current concept being studied */
  conceptId: string;
  conceptName: string;

  /** Question context (if applicable) */
  questionId?: string;
  questionText?: string;
  questionDifficulty?: number;

  /** Student's answer (if answering a question) */
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;

  /** Attempt tracking */
  attemptCount: number;
  consecutiveWrong: number;

  /** Mastery from BKT (0-1) */
  priorMastery: number;

  /** Conversation context */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;

  /** Related concepts for transfer prompts */
  relatedConcepts?: string[];
}

/**
 * Full Socratic coaching result including metadata
 */
export interface SocraticCoachResult {
  /** The response to send to the student */
  response: SocraticResponse;

  /** System prompt used for generation */
  systemPrompt: string;

  /** Current intervention state */
  interventionState: {
    currentLevel: InterventionLevel;
    level1Attempts: number;
    level2Attempts: number;
    level3Used: boolean;
    conceptId: string;
  };

  /** Detected struggle indicators */
  struggleIndicators: {
    isStruggling: boolean;
    severity: 'none' | 'mild' | 'moderate' | 'severe';
    indicators: string[];
  };

  /** Generation configuration used */
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
  };
}

/**
 * Socratic coach log entry for analytics
 */
export interface SocraticLogEntry {
  timestamp: Date;
  userId: string;
  conceptId: string;
  questionId?: string;
  interventionLevel: InterventionLevel;
  interventionType: InterventionType;
  attemptCount: number;
  priorMastery: number;
  struggleSeverity: string;
  usedWorkedExample: boolean;
}
