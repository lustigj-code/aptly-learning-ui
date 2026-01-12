import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { useEffect, useMemo } from 'react';
import {
  User as FirebaseUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { updateDocData, getDocData } from '@/lib/firebase/firestore';
import type { User, UserPreferences, UserProgress, StreakData, Badge } from '@/types';
import { getDateString, isToday, isYesterday } from '@/lib/utils';
import { DEFAULT_COURSE_ID } from '@/data/courseRegistry';

// ============================================
// TYPES
// ============================================

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

type UnifiedState = {
  // Auth state
  firebaseUser: FirebaseUser | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;

  // User profile state
  user: User | null;

  // Loading states
  isAuthLoading: boolean;
  isUserLoading: boolean;
  isSyncing: boolean;

  // Sync status
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  pendingUpdates: Partial<User> | null;

  // Errors
  authError: string | null;
  userError: string | null;

  // UI state
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
};

type UnifiedActions = {
  // Auth actions
  initializeAuth: () => () => void;
  signOut: () => Promise<void>;
  clearAuthError: () => void;

  // User profile actions
  setUser: (user: User) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  updateProgress: (progress: Partial<UserProgress>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  checkAndUpdateStreak: () => Promise<void>;
  useStreakFreeze: () => Promise<boolean>;
  earnBadge: (badgeId: string) => Promise<void>;
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
  resetUser: () => void;

  // Sync actions
  syncToFirestore: (updates: Partial<User>) => Promise<void>;
  fetchUserFromFirestore: (uid: string) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
  clearUserError: () => void;

  // UI actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
};

type UnifiedStore = UnifiedState & UnifiedActions;

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
  currentCourseId: DEFAULT_COURSE_ID, // ai-at-work
  currentModuleId: 'ai-m1',
  currentLessonId: '1.1',
  currentAtomId: '1.1-intro',
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
// FIRESTORE LISTENER MANAGEMENT
// ============================================

let firestoreUnsubscribe: Unsubscribe | null = null;

function setupFirestoreListener(
  uid: string,
  onData: (user: User | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    onError(new Error('Firestore is not initialized'));
    return () => {};
  }

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
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
          progress: {
            ...data.progress,
            lastActiveAt:
              data.progress?.lastActiveAt?.toDate?.() ||
              new Date(data.progress?.lastActiveAt) ||
              new Date(),
            assessmentScores:
              data.progress?.assessmentScores?.map((score: { completedAt: { toDate?: () => Date } | string | Date }) => ({
                ...score,
                completedAt: typeof score.completedAt === 'object' && score.completedAt !== null && 'toDate' in score.completedAt
                  ? (score.completedAt as { toDate: () => Date }).toDate()
                  : new Date(score.completedAt as string | Date),
              })) || [],
          },
          badges:
            data.badges?.map((badge: Badge & { earnedAt?: { toDate?: () => Date } }) => ({
              ...badge,
              earnedAt: badge.earnedAt?.toDate?.() || (badge.earnedAt ? new Date(badge.earnedAt as unknown as string) : undefined),
            })) || [],
        } as User;
        onData(user);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error('Firestore listener error:', error);
      onError(error);
    }
  );
}

// ============================================
// DEBOUNCED SYNC
// ============================================

// Custom debounce for Firestore sync with proper typing
function createDebouncedSync(wait: number) {
  let timeout: NodeJS.Timeout | null = null;

  return (uid: string, updates: Partial<User>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(async () => {
      if (!db) return;
      try {
        const firestoreUpdates = prepareForFirestore(updates);
        await updateDocData('users', uid, firestoreUpdates);
      } catch (error) {
        console.error('Error syncing to Firestore:', error);
      }
    }, wait);
  };
}

const debouncedSyncToFirestore = createDebouncedSync(1000);

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

export const useUnifiedStore = create<UnifiedStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        firebaseUser: null,
        authUser: null,
        isAuthenticated: false,
        user: null,
        isAuthLoading: true,
        isUserLoading: false,
        isSyncing: false,
        syncStatus: 'idle',
        lastSyncedAt: null,
        pendingUpdates: null,
        authError: null,
        userError: null,
        sidebarCollapsed: false,
        mobileMenuOpen: false,

        // ============================================
        // AUTH ACTIONS
        // ============================================

        initializeAuth: () => {
          if (!auth) {
            set({ isAuthLoading: false });
            return () => {};
          }

          const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Cleanup previous Firestore listener
            if (firestoreUnsubscribe) {
              firestoreUnsubscribe();
              firestoreUnsubscribe = null;
            }

            if (firebaseUser) {
              const authUser: AuthUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
              };

              set({
                firebaseUser,
                authUser,
                isAuthenticated: true,
                isAuthLoading: false,
                authError: null,
                isUserLoading: true,
              });

              // Setup Firestore listener for user data
              firestoreUnsubscribe = setupFirestoreListener(
                firebaseUser.uid,
                (user) => {
                  if (user) {
                    set({
                      user,
                      isUserLoading: false,
                      syncStatus: 'synced',
                      lastSyncedAt: new Date(),
                      userError: null,
                    });
                  } else {
                    // User document doesn't exist, create it
                    const { authUser: currentAuthUser } = get();
                    if (currentAuthUser) {
                      const newUser = createNewUser(
                        currentAuthUser.displayName || 'User',
                        currentAuthUser.email || '',
                        currentAuthUser.uid
                      );
                      get().setUser(newUser);
                    }
                  }
                },
                (error) => {
                  // Check if offline
                  if (!navigator.onLine) {
                    set({
                      syncStatus: 'offline',
                      isUserLoading: false,
                    });
                    // Load from localStorage (already handled by persist)
                  } else {
                    set({
                      userError: error.message,
                      syncStatus: 'error',
                      isUserLoading: false,
                    });
                  }
                }
              );
            } else {
              set({
                firebaseUser: null,
                authUser: null,
                isAuthenticated: false,
                isAuthLoading: false,
                authError: null,
                user: null,
                isUserLoading: false,
                syncStatus: 'idle',
              });
            }
          });

          // Return cleanup function
          return () => {
            authUnsubscribe();
            if (firestoreUnsubscribe) {
              firestoreUnsubscribe();
              firestoreUnsubscribe = null;
            }
          };
        },

        signOut: async () => {
          try {
            // Cleanup Firestore listener
            if (firestoreUnsubscribe) {
              firestoreUnsubscribe();
              firestoreUnsubscribe = null;
            }

            if (auth) {
              await firebaseSignOut(auth);
            }

            set({
              firebaseUser: null,
              authUser: null,
              isAuthenticated: false,
              isAuthLoading: false,
              authError: null,
              user: null,
              isUserLoading: false,
              syncStatus: 'idle',
              lastSyncedAt: null,
              pendingUpdates: null,
            });
          } catch (error) {
            console.error('Sign out error:', error);
            set({
              authError: error instanceof Error ? error.message : 'Sign out failed',
            });
          }
        },

        clearAuthError: () => set({ authError: null }),

        // ============================================
        // USER PROFILE ACTIONS
        // ============================================

        setUser: (user) => {
          set({ user, isUserLoading: false, userError: null });
          // Sync to Firestore
          const { authUser } = get();
          if (authUser?.uid) {
            get().syncToFirestore(user);
          }
        },

        updatePreferences: async (prefs) => {
          const { user, authUser } = get();
          if (!user) return;

          const updatedPreferences = { ...user.preferences, ...prefs };
          const updatedUser = { ...user, preferences: updatedPreferences };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          if (authUser?.uid) {
            await get().syncToFirestore({ preferences: updatedPreferences });
          }
        },

        updateProgress: async (progress) => {
          const { user, authUser } = get();
          if (!user) return;

          const updatedProgress = { ...user.progress, ...progress };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        addXP: async (amount) => {
          const { user, authUser } = get();
          if (!user) return;

          const updatedProgress = {
            ...user.progress,
            xp: user.progress.xp + amount,
          };
          const updatedUser = { ...user, progress: updatedProgress };

          // Optimistic update
          set({ user: updatedUser });

          // Sync to Firestore
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        checkAndUpdateStreak: async () => {
          const { user, authUser } = get();
          if (!user) return;

          const today = getDateString();
          const { lastCompletedDate, currentStreak, longestStreak, freezesAvailable, streakHistory } =
            user.streak;

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
          if (authUser?.uid) {
            await get().syncToFirestore({ streak: updatedStreak });
          }
        },

        useStreakFreeze: async () => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ streak: updatedStreak });
          }

          return true;
        },

        earnBadge: async (badgeId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ badges: updatedBadges });
          }
        },

        completeAtom: async (atomId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeLesson: async (lessonId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeModule: async (moduleId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        completeCourse: async (courseId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        setCurrentPosition: async (courseId, moduleId, lessonId, atomId) => {
          const { user, authUser } = get();
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
          if (authUser?.uid) {
            await get().syncToFirestore({ progress: updatedProgress });
          }
        },

        resetUser: () => {
          set({ user: null, isUserLoading: false, userError: null, syncStatus: 'idle' });
        },

        // ============================================
        // SYNC ACTIONS
        // ============================================

        syncToFirestore: async (updates) => {
          const { authUser, isSyncing } = get();
          if (!authUser?.uid || !db) {
            // Store pending updates for when we're back online
            set((state) => ({
              pendingUpdates: { ...state.pendingUpdates, ...updates },
              syncStatus: 'offline',
            }));
            return;
          }

          if (!isSyncing) {
            set({ isSyncing: true, syncStatus: 'syncing' });
          }

          try {
            debouncedSyncToFirestore(authUser.uid, updates);
            set({
              isSyncing: false,
              syncStatus: 'synced',
              lastSyncedAt: new Date(),
              pendingUpdates: null,
            });
          } catch (error) {
            console.error('Sync error:', error);
            set({
              isSyncing: false,
              syncStatus: 'error',
              userError: error instanceof Error ? error.message : 'Sync failed',
              pendingUpdates: updates,
            });
          }
        },

        fetchUserFromFirestore: async (uid) => {
          if (!db) {
            set({ userError: 'Firestore is not initialized', isUserLoading: false });
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
              set({ user, isUserLoading: false, syncStatus: 'synced' });
            } else {
              set({ isUserLoading: false });
            }
          } catch (error) {
            console.error('Error fetching user:', error);
            set({
              userError: error instanceof Error ? error.message : 'Failed to fetch user',
              isUserLoading: false,
              syncStatus: 'error',
            });
          }
        },

        setSyncStatus: (status) => set({ syncStatus: status }),

        clearUserError: () => set({ userError: null }),

        // ============================================
        // UI ACTIONS
        // ============================================

        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

        toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
      }),
      {
        name: 'aptly-unified-store',
        partialize: (state) => ({
          user: state.user,
          lastSyncedAt: state.lastSyncedAt,
          pendingUpdates: state.pendingUpdates,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createNewUser(name: string, email: string = '', uid?: string): User {
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
// HOOKS
// ============================================

/**
 * Hook to initialize auth and Firestore sync on app load
 * Call once in root layout or _app
 */
export function useAuthInitialize(): boolean {
  const initializeAuth = useUnifiedStore((state) => state.initializeAuth);
  const isAuthLoading = useUnifiedStore((state) => state.isAuthLoading);

  useEffect(() => {
    const cleanup = initializeAuth();
    return () => cleanup?.();
  }, [initializeAuth]);

  return isAuthLoading;
}

/**
 * Hook to get current user data
 * Returns the full user object with preferences, progress, streak, and badges
 */
export function useUser() {
  const user = useUnifiedStore((state) => state.user);
  const isLoading = useUnifiedStore((state) => state.isUserLoading);
  const error = useUnifiedStore((state) => state.userError);
  const syncStatus = useUnifiedStore((state) => state.syncStatus);

  const updatePreferences = useUnifiedStore((state) => state.updatePreferences);
  const addXP = useUnifiedStore((state) => state.addXP);
  const checkAndUpdateStreak = useUnifiedStore((state) => state.checkAndUpdateStreak);
  const useStreakFreeze = useUnifiedStore((state) => state.useStreakFreeze);
  const earnBadge = useUnifiedStore((state) => state.earnBadge);
  const completeAtom = useUnifiedStore((state) => state.completeAtom);
  const completeLesson = useUnifiedStore((state) => state.completeLesson);
  const completeModule = useUnifiedStore((state) => state.completeModule);
  const completeCourse = useUnifiedStore((state) => state.completeCourse);
  const setCurrentPosition = useUnifiedStore((state) => state.setCurrentPosition);

  return {
    user,
    isLoading,
    error,
    syncStatus,
    updatePreferences,
    addXP,
    checkAndUpdateStreak,
    useStreakFreeze,
    earnBadge,
    completeAtom,
    completeLesson,
    completeModule,
    completeCourse,
    setCurrentPosition,
  };
}

/**
 * Hook to get authentication state
 * Returns auth user, authentication status, and auth actions
 */
export function useAuth() {
  const authUser = useUnifiedStore((state) => state.authUser);
  const isAuthenticated = useUnifiedStore((state) => state.isAuthenticated);
  const isLoading = useUnifiedStore((state) => state.isAuthLoading);
  const error = useUnifiedStore((state) => state.authError);
  const signOut = useUnifiedStore((state) => state.signOut);
  const clearError = useUnifiedStore((state) => state.clearAuthError);

  return {
    authUser,
    isAuthenticated,
    isLoading,
    error,
    signOut,
    clearError,
  };
}

/**
 * Hook to get user progress specifically
 * Memoized for performance when only progress data is needed
 */
export function useProgress() {
  const progress = useUnifiedStore((state) => state.user?.progress ?? null);
  const streak = useUnifiedStore((state) => state.user?.streak ?? null);
  const isLoading = useUnifiedStore((state) => state.isUserLoading);

  const updateProgress = useUnifiedStore((state) => state.updateProgress);
  const addXP = useUnifiedStore((state) => state.addXP);
  const checkAndUpdateStreak = useUnifiedStore((state) => state.checkAndUpdateStreak);
  const completeAtom = useUnifiedStore((state) => state.completeAtom);
  const completeLesson = useUnifiedStore((state) => state.completeLesson);
  const completeModule = useUnifiedStore((state) => state.completeModule);
  const completeCourse = useUnifiedStore((state) => state.completeCourse);
  const setCurrentPosition = useUnifiedStore((state) => state.setCurrentPosition);

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

/**
 * Hook for sync status monitoring
 */
export function useSyncStatus() {
  const syncStatus = useUnifiedStore((state) => state.syncStatus);
  const lastSyncedAt = useUnifiedStore((state) => state.lastSyncedAt);
  const isSyncing = useUnifiedStore((state) => state.isSyncing);
  const pendingUpdates = useUnifiedStore((state) => state.pendingUpdates);

  const isOnline = useMemo(() => syncStatus !== 'offline', [syncStatus]);
  const hasPendingUpdates = useMemo(() => pendingUpdates !== null, [pendingUpdates]);

  return {
    syncStatus,
    lastSyncedAt,
    isSyncing,
    isOnline,
    hasPendingUpdates,
    pendingUpdates,
  };
}

/**
 * Hook to sync pending updates when coming back online
 */
export function useOfflineSync() {
  const pendingUpdates = useUnifiedStore((state) => state.pendingUpdates);
  const syncToFirestore = useUnifiedStore((state) => state.syncToFirestore);
  const setSyncStatus = useUnifiedStore((state) => state.setSyncStatus);

  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      if (pendingUpdates) {
        try {
          await syncToFirestore(pendingUpdates);
        } catch (error) {
          console.error('Failed to sync pending updates:', error);
        }
      } else {
        setSyncStatus('synced');
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingUpdates, syncToFirestore, setSyncStatus]);
}

// ============================================
// BACKWARDS COMPATIBILITY EXPORTS
// ============================================

// For components still using the old store pattern
export const useAuthStore = useUnifiedStore;
export const useUserStore = useUnifiedStore;
