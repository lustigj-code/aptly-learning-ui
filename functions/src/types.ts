// Re-export types from main src for use in functions
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

export type Badge = {
  id: string;
  type: 'skill' | 'milestone' | 'streak' | 'special';
  title: string;
  description: string;
  icon: string;
  earnedAt?: Date;
  criteria: {
    type: 'completion' | 'streak' | 'score' | 'time' | 'custom';
    threshold?: number;
    relatedEntityId?: string;
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
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
};
