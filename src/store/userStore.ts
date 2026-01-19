/**
 * @deprecated This store is deprecated. Use unifiedStore instead.
 * All user state management has been consolidated into src/store/unifiedStore.ts
 * This file is kept for reference only and will be removed in a future version.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserPreferences, UserProgress, StreakData } from '@/types';
import { getDateString, isToday, isYesterday } from '@/lib/utils';

type UserStore = {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  updateProgress: (progress: Partial<UserProgress>) => void;
  addXP: (amount: number) => void;
  checkAndUpdateStreak: () => void;
  useStreakFreeze: () => boolean;
  earnBadge: (badgeId: string) => void;
  completeAtom: (atomId: string) => void;
  completeLesson: (lessonId: string) => void;
  completeModule: (moduleId: string) => void;
  completeCourse: (courseId: string) => void;
  setCurrentPosition: (courseId: string, moduleId?: string, lessonId?: string, atomId?: string) => void;
  resetUser: () => void;
};

const defaultPreferences: UserPreferences = {
  learningPace: 'moderate',
  dailyGoalMinutes: 15,
  preferredLearningTime: 'morning',
  voiceEnabled: false,
  soundEffectsEnabled: true,
  reducedMotion: false,
};

const defaultProgress: UserProgress = {
  currentCourseId: 'course-1',
  currentModuleId: 'c1-m1',
  currentLessonId: 'c1-m1-l1',
  currentAtomId: 'c1-m1-l1-a1',
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
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
    freezesAvailable: 2,
    freezesUsed: [],
    streakHistory: [],
  },
};

const defaultStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: '',
  freezesAvailable: 2,
  freezesUsed: [],
  streakHistory: [],
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isLoading: false, error: null }),

      updatePreferences: (prefs) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                preferences: { ...state.user.preferences, ...prefs },
              }
            : null,
        })),

      updateProgress: (progress) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                progress: { ...state.user.progress, ...progress },
              }
            : null,
        })),

      addXP: (amount) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                progress: {
                  ...state.user.progress,
                  xp: state.user.progress.xp + amount,
                },
              }
            : null,
        })),

      checkAndUpdateStreak: () => {
        const { user } = get();
        if (!user) return;

        const today = getDateString();
        const { lastCompletedDate, currentStreak, longestStreak, freezesAvailable, streakHistory } = user.streak;

        // If already completed today, do nothing
        if (lastCompletedDate === today) return;

        let newStreak = currentStreak;
        let newFreezes = freezesAvailable;

        if (isYesterday(lastCompletedDate)) {
          // Streak continues
          newStreak = currentStreak + 1;
        } else if (lastCompletedDate && !isToday(lastCompletedDate) && !isYesterday(lastCompletedDate)) {
          // Streak broken, check for freeze
          if (freezesAvailable > 0) {
            // Use a freeze automatically
            newFreezes = freezesAvailable - 1;
            newStreak = currentStreak + 1;
          } else {
            // Reset streak
            newStreak = 1;
          }
        } else {
          // First day or continuing
          newStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        }

        const newStreakHistory = [
          ...streakHistory,
          { date: today, completed: true, minutesStudied: 0, lessonsCompleted: 0 },
        ].slice(-30); // Keep last 30 days

        set({
          user: {
            ...user,
            streak: {
              ...user.streak,
              currentStreak: newStreak,
              longestStreak: Math.max(longestStreak, newStreak),
              lastCompletedDate: today,
              freezesAvailable: newFreezes,
              streakHistory: newStreakHistory,
            },
          },
        });
      },

      useStreakFreeze: () => {
        const { user } = get();
        if (!user || user.streak.freezesAvailable <= 0) return false;

        const today = getDateString();

        set({
          user: {
            ...user,
            streak: {
              ...user.streak,
              freezesAvailable: user.streak.freezesAvailable - 1,
              freezesUsed: [...user.streak.freezesUsed, today],
            },
          },
        });

        return true;
      },

      earnBadge: (badgeId) =>
        set((state) => {
          if (!state.user) return state;
          const existingBadge = state.user.badges.find((b) => b.id === badgeId);
          if (existingBadge?.earnedAt) return state; // Already earned

          return {
            user: {
              ...state.user,
              badges: state.user.badges.map((b) =>
                b.id === badgeId ? { ...b, earnedAt: new Date() } : b
              ),
            },
          };
        }),

      completeAtom: (atomId) =>
        set((state) => {
          if (!state.user) return state;
          if (state.user.progress.atomsCompleted.includes(atomId)) return state;

          return {
            user: {
              ...state.user,
              progress: {
                ...state.user.progress,
                atomsCompleted: [...state.user.progress.atomsCompleted, atomId],
              },
            },
          };
        }),

      completeLesson: (lessonId) =>
        set((state) => {
          if (!state.user) return state;
          if (state.user.progress.lessonsCompleted.includes(lessonId)) return state;

          return {
            user: {
              ...state.user,
              progress: {
                ...state.user.progress,
                lessonsCompleted: [...state.user.progress.lessonsCompleted, lessonId],
              },
            },
          };
        }),

      completeModule: (moduleId) =>
        set((state) => {
          if (!state.user) return state;
          if (state.user.progress.modulesCompleted.includes(moduleId)) return state;

          return {
            user: {
              ...state.user,
              progress: {
                ...state.user.progress,
                modulesCompleted: [...state.user.progress.modulesCompleted, moduleId],
              },
            },
          };
        }),

      completeCourse: (courseId) =>
        set((state) => {
          if (!state.user) return state;
          if (state.user.progress.coursesCompleted.includes(courseId)) return state;

          return {
            user: {
              ...state.user,
              progress: {
                ...state.user.progress,
                coursesCompleted: [...state.user.progress.coursesCompleted, courseId],
              },
            },
          };
        }),

      setCurrentPosition: (courseId, moduleId, lessonId, atomId) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                progress: {
                  ...state.user.progress,
                  currentCourseId: courseId,
                  currentModuleId: moduleId || state.user.progress.currentModuleId,
                  currentLessonId: lessonId || state.user.progress.currentLessonId,
                  currentAtomId: atomId || state.user.progress.currentAtomId,
                  lastActiveAt: new Date(),
                },
              }
            : null,
        })),

      resetUser: () => set({ user: null, isLoading: false, error: null }),
    }),
    {
      name: 'aptly-user-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Helper function to create a new user
export function createNewUser(name: string, email: string = ''): User {
  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    email,
    createdAt: new Date(),
    preferences: defaultPreferences,
    progress: defaultProgress,
    streak: defaultStreak,
    badges: [],
  };
}
