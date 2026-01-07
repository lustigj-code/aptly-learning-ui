/**
 * Firestore Schema Type Definitions
 * These types match the exact structure of documents stored in Firestore
 * Used by all service functions for type safety and compile-time validation
 */

// ============================================
// USER TYPES
// ============================================

export type LearningPace = 'relaxed' | 'moderate' | 'intensive';
export type LearningTime = 'morning' | 'afternoon' | 'evening';
export type Performance = 'struggling' | 'progressing' | 'excelling';

export type UserPreferences = {
  learningPace: LearningPace;
  dailyGoalMinutes: number;
  preferredLearningTime: LearningTime;
  voiceEnabled: boolean;
  soundEffectsEnabled: boolean;
  reducedMotion: boolean;
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
  lastActivityDate?: string;
  lastCompletedDate?: string;
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
  userId?: string;
  currentCourseId: string | null;
  currentModuleId: string | null;
  currentLessonId: string | null;
  currentAtomId: string | null;
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
  streak?: StreakData;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  preferences: UserPreferences;
  progress: UserProgress;
  streak: StreakData;
  badges: Badge[];
  goal?: string;
  experienceLevel?: number;
  role?: 'student' | 'admin' | 'instructor';
  status?: 'active' | 'inactive';
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
  relatedResources: Resource[];
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
  allowRetakes: boolean;
  maxAttempts: number;
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
  content:
    | VideoContent
    | ReadingContent
    | PracticeContent
    | QuizContent
    | ProjectContent;
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

export type Conversation = {
  id: string;
  userId: string;
  lessonId?: string;
  messages: CoachMessage[];
  createdAt: Date;
  updatedAt: Date;
  sessionGoal?: string;
};

// ============================================
// GAMIFICATION TYPES
// ============================================

export type BadgeType = 'skill' | 'milestone' | 'streak' | 'special';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type BadgeCriteriaType = 'completion' | 'streak' | 'score' | 'time' | 'custom';

export type BadgeCriteria = {
  type: BadgeCriteriaType;
  threshold: number;
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

export type BadgeProgress = {
  badgeId: string;
  currentProgress: number;
  target: number;
  completed: boolean;
  percentComplete: number;
};

export type CelebrationTier = 1 | 2 | 3 | 4 | 5;

export type CelebrationEvent = {
  type:
    | 'correct-answer'
    | 'quiz-passed'
    | 'atom-complete'
    | 'lesson-complete'
    | 'module-complete'
    | 'course-complete'
    | 'streak-milestone'
    | 'badge-unlock'
    | 'comeback';
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
