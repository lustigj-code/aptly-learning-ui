import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { UserProgress, UserPreferences, StreakData } from '../types';

const DEFAULT_PREFERENCES: UserPreferences = {
  learningPace: 'moderate',
  dailyGoalMinutes: 30,
  preferredLearningTime: 'morning',
  voiceEnabled: true,
  soundEffectsEnabled: true,
  reducedMotion: false,
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: '',
  freezesAvailable: 2,
  freezesUsed: [],
  streakHistory: [],
};

const DEFAULT_PROGRESS: UserProgress = {
  currentCourseId: '',
  currentModuleId: '',
  currentLessonId: '',
  currentAtomId: '',
  overallPercentage: 0,
  coursesCompleted: [],
  modulesCompleted: [],
  lessonsCompleted: [],
  atomsCompleted: [],
  assessmentScores: [],
  masteryLevels: [],
  totalTimeSpentMinutes: 0,
  lastActiveAt: new Date(),
  xp: 0,
  streak: DEFAULT_STREAK,
};

export const onUserCreate = functions
  .auth.user()
  .onCreate(async (user) => {
    const db = admin.firestore();
    const userId = user.uid;

    try {
      functions.logger.info(`Processing new user creation: ${userId}`);

      // Check if userProgress already exists
      const existingProgress = await db
        .collection('userProgress')
        .doc(userId)
        .get();

      if (existingProgress.exists) {
        functions.logger.info(
          `UserProgress document already exists for ${userId}, skipping creation`
        );
        return {
          success: true,
          message: 'User progress document already exists',
          skipped: true,
        };
      }

      // Create userProgress document with initialized fields
      const userProgressData: UserProgress = {
        ...DEFAULT_PROGRESS,
        lastActiveAt: new Date(),
      };

      await db.collection('userProgress').doc(userId).set(userProgressData);

      functions.logger.info(`Created userProgress document for user ${userId}`);

      // Create preferences subcollection
      await db
        .collection('userProgress')
        .doc(userId)
        .collection('preferences')
        .doc('default')
        .set(DEFAULT_PREFERENCES);

      functions.logger.info(
        `Created preferences subcollection for user ${userId}`
      );

      return {
        success: true,
        userId,
        message: 'User progress initialized successfully',
        progressData: userProgressData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      functions.logger.error(`Failed to initialize user progress for ${userId}:`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw to trigger retry mechanism
      throw error;
    }
  });
