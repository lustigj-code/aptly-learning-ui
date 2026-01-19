/**
 * User profile and progress state management
 * Handles user data, XP, badges, streak, and Firestore sync
 *
 * This is a focused store - split from the monolithic unifiedStore
 * for better separation of concerns and maintainability.
 */
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { updateDocData, getDocData } from '@/lib/firebase/firestore';
import type { User, UserPreferences, UserProgress, StreakData, Badge } from '@/types';
import { getDateString, isToday, isYesterday } from '@/lib/utils';
import { DEFAULT_COURSE_ID } from '@/data/courseRegistry';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export interface UserProfileState {
  // State
  user: User | null;
  isUserLoading: boolean;
  userError: string | null;

  // Actions - User Profile
  setUser: (user: User) => void;
  updateProfile: (updates: Partial<User>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  clearUser: () => void;

  // Actions - Progress
  updateProgress: (progress: Partial<UserProgress>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  completeAtom: (atomId: string) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  completeModule: (moduleId: string) => Promise<void>;
  completeCourse: (courseId: string) => Promise<void>;
  setCurrentPosition: (
    courseId: string,
    moduleId?: string,
    lessonId?: string,
    atomId?: string
  ) => Promise<void>;

  // Actions - Streak
  checkAndUpdateStreak: () => Promise<void>;
  useStreakFreeze: () => Promise<boolean>;
  purchaseStreakFreeze: (xpCost: number) => Promise<boolean>;
  updateStreak: (streak: Partial<StreakData>) => Promise<void>;

  // Actions - Badges
  earnBadge: (badgeId: string) => Promise<void>;

  // Actions - Loading/Error
  setUserLoading: (loading: boolean) => void;
  setUserError: (error: string | null) => void;
  resetUser: () => void;

  // Actions - Firestore
  syncToFirestore: (updates: Partial<User>) => Promise<void>;
  setupFirestoreListener: (uid: string) => Unsubscribe;
  fetchUserFromFirestore: (uid: string) => Promise<void>;
}

// ============================================
// DEFAULTS
// ============================================

const defaultPreferences: UserPreferences = {
  learningPace: 'moderate',
  dailyGoalMinutes: 15,
  preferredLearningTime: 'morning',
  voiceEnabled: false,
  soundEffectsEnabled: true,
  reducedMotion: false,
};

const defaultProgress: UserProgress = {
  currentCourseId: DEFAULT_COURSE_ID,
  currentModuleId: 'fsm-m1',
  currentLessonId: 'fsm-l1',
  currentAtomId: 'fsm-l1-video',
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

// ============================================
// DEBOUNCED SYNC
// ============================================

let syncTimeout: NodeJS.Timeout | null = null;

function debouncedSyncToFirestore(uid: string, updates: Partial<User>) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    if (!db) return;
    try {
      const firestoreUpdates = prepareForFirestore(updates);
      await updateDocData('users', uid, firestoreUpdates);
    } catch (error) {
      console.error('Error syncing to Firestore:', error);
    }
  }, 1000);
}

function prepareForFirestore(data: Partial<User>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item instanceof Date
          ? item.toISOString()
          : typeof item === 'object' && item !== null
          ? prepareForFirestore(item as Partial<User>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = prepareForFirestore(value as Partial<User>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================
// STORE
// ============================================

export const useUserProfileStore = create<UserProfileState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isUserLoading: false,
        userError: null,

        // ============================================
        // USER PROFILE ACTIONS
        // ============================================

        setUser: (user) => {
          set({ user, isUserLoading: false, userError: null });
          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            get().syncToFirestore(user);
          }
        },

        updateProfile: (updates) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),

        updatePreferences: async (prefs) => {
          const { user } = get();
          if (!user) return;

          const updatedPreferences = { ...user.preferences, ...prefs };
          const updatedUser = { ...user, preferences: updatedPreferences };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ preferences: updatedPreferences });
          }
        },

        clearUser: () => set({ user: null, userError: null }),

        // ============================================
        // PROGRESS ACTIONS
        // ============================================

        updateProgress: async (progress) => {
          const { user } = get();
          if (!user) return;

          const updatedProgress = { ...user.progress, ...progress };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        addXP: async (amount) => {
          const { user } = get();
          if (!user) return;

          const updatedProgress = {
            ...user.progress,
            xp: user.progress.xp + amount,
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeAtom: async (atomId) => {
          const { user } = get();
          if (!user) return;
          if (user.progress.atomsCompleted.includes(atomId)) return;

          const updatedProgress = {
            ...user.progress,
            atomsCompleted: [...user.progress.atomsCompleted, atomId],
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeLesson: async (lessonId) => {
          const { user } = get();
          if (!user) return;
          if (user.progress.lessonsCompleted.includes(lessonId)) return;

          const updatedProgress = {
            ...user.progress,
            lessonsCompleted: [...user.progress.lessonsCompleted, lessonId],
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeModule: async (moduleId) => {
          const { user } = get();
          if (!user) return;
          if (user.progress.modulesCompleted.includes(moduleId)) return;

          const updatedProgress = {
            ...user.progress,
            modulesCompleted: [...user.progress.modulesCompleted, moduleId],
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeCourse: async (courseId) => {
          const { user } = get();
          if (!user) return;
          if (user.progress.coursesCompleted.includes(courseId)) return;

          const updatedProgress = {
            ...user.progress,
            coursesCompleted: [...user.progress.coursesCompleted, courseId],
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        setCurrentPosition: async (courseId, moduleId, lessonId, atomId) => {
          const { user } = get();
          if (!user) return;

          const updatedProgress = {
            ...user.progress,
            currentCourseId: courseId,
            currentModuleId: moduleId || user.progress.currentModuleId,
            currentLessonId: lessonId || user.progress.currentLessonId,
            currentAtomId: atomId || user.progress.currentAtomId,
            lastActiveAt: new Date(),
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        // ============================================
        // STREAK ACTIONS
        // ============================================

        checkAndUpdateStreak: async () => {
          const { user } = get();
          if (!user) return;

          const today = getDateString();
          const {
            lastCompletedDate,
            currentStreak,
            longestStreak,
            freezesAvailable,
            streakHistory,
          } = user.streak;

          // If already completed today, do nothing
          if (lastCompletedDate === today) return;

          let newStreak = currentStreak;
          let newFreezes = freezesAvailable;

          if (isYesterday(lastCompletedDate)) {
            // Streak continues
            newStreak = currentStreak + 1;
          } else if (
            lastCompletedDate &&
            !isToday(lastCompletedDate) &&
            !isYesterday(lastCompletedDate)
          ) {
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
          ].slice(-30);

          const updatedStreak: StreakData = {
            ...user.streak,
            currentStreak: newStreak,
            longestStreak: Math.max(longestStreak, newStreak),
            lastCompletedDate: today,
            freezesAvailable: newFreezes,
            streakHistory: newStreakHistory,
          };

          const updatedUser = { ...user, streak: updatedStreak };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ streak: updatedStreak });
          }
        },

        useStreakFreeze: async () => {
          const { user } = get();
          if (!user || user.streak.freezesAvailable <= 0) return false;

          const today = getDateString();

          const updatedStreak: StreakData = {
            ...user.streak,
            freezesAvailable: user.streak.freezesAvailable - 1,
            freezesUsed: [...user.streak.freezesUsed, today],
          };

          const updatedUser = { ...user, streak: updatedStreak };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ streak: updatedStreak });
          }

          return true;
        },

        purchaseStreakFreeze: async (xpCost) => {
          const { user } = get();
          if (!user) return false;

          // Check if user has enough XP
          if (user.progress.xp < xpCost) return false;

          const updatedProgress = {
            ...user.progress,
            xp: user.progress.xp - xpCost,
          };

          const updatedStreak: StreakData = {
            ...user.streak,
            freezesAvailable: user.streak.freezesAvailable + 1,
          };

          const updatedUser = {
            ...user,
            progress: updatedProgress,
            streak: updatedStreak,
          };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({
              progress: updatedProgress,
              streak: updatedStreak,
            });
          }

          return true;
        },

        updateStreak: async (streak) => {
          const { user } = get();
          if (!user) return;

          const updatedStreak = { ...user.streak, ...streak };
          const updatedUser = { ...user, streak: updatedStreak };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ streak: updatedStreak });
          }
        },

        // ============================================
        // BADGE ACTIONS
        // ============================================

        earnBadge: async (badgeId) => {
          const { user } = get();
          if (!user) return;

          const existingBadge = user.badges.find((b) => b.id === badgeId);
          if (existingBadge?.earnedAt) return; // Already earned

          const updatedBadges = user.badges.map((b) =>
            b.id === badgeId ? { ...b, earnedAt: new Date() } : b
          );

          const updatedUser = { ...user, badges: updatedBadges };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          const authUser = useAuthStore.getState().authUser;
          if (authUser?.uid) {
            await get().syncToFirestore({ badges: updatedBadges });
          }
        },

        // ============================================
        // LOADING/ERROR ACTIONS
        // ============================================

        setUserLoading: (loading) => set({ isUserLoading: loading }),

        setUserError: (error) => set({ userError: error }),

        resetUser: () =>
          set({ user: null, isUserLoading: false, userError: null }),

        // ============================================
        // FIRESTORE ACTIONS
        // ============================================

        syncToFirestore: async (updates) => {
          const authUser = useAuthStore.getState().authUser;
          if (!authUser?.uid || !db) {
            return;
          }

          try {
            debouncedSyncToFirestore(authUser.uid, updates);
          } catch (error) {
            console.error('Sync error:', error);
            set({
              userError: error instanceof Error ? error.message : 'Sync failed',
            });
          }
        },

        setupFirestoreListener: (uid) => {
          if (!db) {
            set({ userError: 'Firestore is not initialized', isUserLoading: false });
            return () => {};
          }

          set({ isUserLoading: true });

          const userDocRef = doc(db, 'users', uid);

          return onSnapshot(
            userDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data();
                // Convert Firestore timestamps to Date objects
                const user: User = {
                  ...data,
                  id: snapshot.id,
                  createdAt:
                    data.createdAt?.toDate?.() ||
                    new Date(data.createdAt) ||
                    new Date(),
                  progress: {
                    ...data.progress,
                    lastActiveAt:
                      data.progress?.lastActiveAt?.toDate?.() ||
                      new Date(data.progress?.lastActiveAt) ||
                      new Date(),
                    assessmentScores:
                      data.progress?.assessmentScores?.map(
                        (score: {
                          completedAt: { toDate?: () => Date } | string | Date;
                        }) => ({
                          ...score,
                          completedAt:
                            typeof score.completedAt === 'object' &&
                            score.completedAt !== null &&
                            'toDate' in score.completedAt
                              ? (
                                  score.completedAt as { toDate: () => Date }
                                ).toDate()
                              : new Date(score.completedAt as string | Date),
                        })
                      ) || [],
                  },
                  badges:
                    data.badges?.map(
                      (badge: Badge & { earnedAt?: { toDate?: () => Date } }) => ({
                        ...badge,
                        earnedAt:
                          badge.earnedAt?.toDate?.() ||
                          (badge.earnedAt
                            ? new Date(badge.earnedAt as unknown as string)
                            : undefined),
                      })
                    ) || [],
                } as User;
                set({
                  user,
                  isUserLoading: false,
                  userError: null,
                });
              } else {
                // User doc doesn't exist - create default user
                const authState = useAuthStore.getState();
                if (authState.authUser) {
                  const newUser = createNewUser(
                    authState.authUser.displayName || 'User',
                    authState.authUser.email || '',
                    authState.authUser.uid
                  );
                  set({ user: newUser, isUserLoading: false, userError: null });
                } else {
                  set({ isUserLoading: false });
                }
              }
            },
            (error) => {
              console.error('Firestore listener error:', error);
              // Check if offline
              if (!navigator.onLine) {
                set({ isUserLoading: false });
              } else {
                set({
                  userError: error.message,
                  isUserLoading: false,
                });
              }
            }
          );
        },

        fetchUserFromFirestore: async (uid) => {
          if (!db) {
            set({
              userError: 'Firestore is not initialized',
              isUserLoading: false,
            });
            return;
          }

          set({ isUserLoading: true });

          try {
            const userData = await getDocData<User>('users', uid);
            if (userData) {
              // Convert dates
              const user: User = {
                ...userData,
                createdAt: new Date(userData.createdAt),
                progress: {
                  ...userData.progress,
                  lastActiveAt: new Date(userData.progress.lastActiveAt),
                },
              };
              set({ user, isUserLoading: false });
            } else {
              set({ isUserLoading: false });
            }
          } catch (error) {
            console.error('Error fetching user:', error);
            set({
              userError:
                error instanceof Error ? error.message : 'Failed to fetch user',
              isUserLoading: false,
            });
          }
        },
      }),
      {
        name: 'aptly-user-profile-store',
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
);

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createNewUser(
  name: string,
  email: string = '',
  uid?: string
): User {
  return {
    id: uid || Math.random().toString(36).substring(2, 9),
    name,
    email,
    createdAt: new Date(),
    preferences: defaultPreferences,
    progress: defaultProgress,
    streak: defaultStreak,
    badges: [],
  };
}

// ============================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================

/**
 * Hook to get current user data
 * Returns the full user object with preferences, progress, streak, and badges
 */
export function useUser() {
  const user = useUserProfileStore((state) => state.user);
  const isLoading = useUserProfileStore((state) => state.isUserLoading);
  const error = useUserProfileStore((state) => state.userError);

  const updatePreferences = useUserProfileStore((state) => state.updatePreferences);
  const addXP = useUserProfileStore((state) => state.addXP);
  const checkAndUpdateStreak = useUserProfileStore(
    (state) => state.checkAndUpdateStreak
  );
  const useStreakFreeze = useUserProfileStore((state) => state.useStreakFreeze);
  const purchaseStreakFreeze = useUserProfileStore(
    (state) => state.purchaseStreakFreeze
  );
  const earnBadge = useUserProfileStore((state) => state.earnBadge);
  const completeAtom = useUserProfileStore((state) => state.completeAtom);
  const completeLesson = useUserProfileStore((state) => state.completeLesson);
  const completeModule = useUserProfileStore((state) => state.completeModule);
  const completeCourse = useUserProfileStore((state) => state.completeCourse);
  const setCurrentPosition = useUserProfileStore(
    (state) => state.setCurrentPosition
  );

  return {
    user,
    isLoading,
    error,
    updatePreferences,
    addXP,
    checkAndUpdateStreak,
    useStreakFreeze,
    purchaseStreakFreeze,
    earnBadge,
    completeAtom,
    completeLesson,
    completeModule,
    completeCourse,
    setCurrentPosition,
  };
}

/**
 * Hook to get user progress specifically
 * Memoized for performance when only progress data is needed
 */
export function useProgress() {
  const progress = useUserProfileStore((state) => state.user?.progress ?? null);
  const streak = useUserProfileStore((state) => state.user?.streak ?? null);
  const isLoading = useUserProfileStore((state) => state.isUserLoading);

  const updateProgress = useUserProfileStore((state) => state.updateProgress);
  const addXP = useUserProfileStore((state) => state.addXP);
  const checkAndUpdateStreak = useUserProfileStore(
    (state) => state.checkAndUpdateStreak
  );
  const completeAtom = useUserProfileStore((state) => state.completeAtom);
  const completeLesson = useUserProfileStore((state) => state.completeLesson);
  const completeModule = useUserProfileStore((state) => state.completeModule);
  const completeCourse = useUserProfileStore((state) => state.completeCourse);
  const setCurrentPosition = useUserProfileStore(
    (state) => state.setCurrentPosition
  );

  return {
    progress,
    streak,
    isLoading,
    xp: progress?.xp ?? 0,
    currentCourseId: progress?.currentCourseId ?? null,
    currentModuleId: progress?.currentModuleId ?? null,
    currentLessonId: progress?.currentLessonId ?? null,
    currentAtomId: progress?.currentAtomId ?? null,
    atomsCompleted: progress?.atomsCompleted ?? [],
    lessonsCompleted: progress?.lessonsCompleted ?? [],
    modulesCompleted: progress?.modulesCompleted ?? [],
    coursesCompleted: progress?.coursesCompleted ?? [],
    overallPercentage: progress?.overallPercentage ?? 0,
    updateProgress,
    addXP,
    checkAndUpdateStreak,
    completeAtom,
    completeLesson,
    completeModule,
    completeCourse,
    setCurrentPosition,
  };
}
