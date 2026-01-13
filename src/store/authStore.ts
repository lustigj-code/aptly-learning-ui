/**
 * Authentication state management
 * Handles Firebase auth, user session, and auth errors
 *
 * This is a focused store - split from the monolithic unifiedStore
 * for better separation of concerns and maintainability.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  User as FirebaseUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

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

export interface AuthState {
  // State
  firebaseUser: FirebaseUser | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  // Actions
  initializeAuth: () => () => void;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    firebaseUser: null,
    authUser: null,
    isAuthenticated: false,
    isAuthLoading: true,
    authError: null,

    // Actions
    initializeAuth: () => {
      if (!auth) {
        set({ isAuthLoading: false });
        return () => {};
      }

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
          });
        } else {
          set({
            firebaseUser: null,
            authUser: null,
            isAuthenticated: false,
            isAuthLoading: false,
            authError: null,
          });
        }
      });

      return unsubscribe;
    },

    setFirebaseUser: (user) =>
      set({
        firebaseUser: user,
        authUser: user
          ? {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
            }
          : null,
        isAuthenticated: !!user,
        isAuthLoading: false,
      }),

    setAuthLoading: (loading) => set({ isAuthLoading: loading }),

    setAuthError: (error) => set({ authError: error }),

    signOut: async () => {
      try {
        if (auth) {
          await firebaseSignOut(auth);
        }

        set({
          firebaseUser: null,
          authUser: null,
          isAuthenticated: false,
          isAuthLoading: false,
          authError: null,
        });
      } catch (error) {
        console.error('Sign out error:', error);
        set({
          authError: error instanceof Error ? error.message : 'Sign out failed',
        });
      }
    },

    clearAuthError: () => set({ authError: null }),
  }))
);

// ============================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================

/**
 * Hook to get basic auth state
 * Use this in most components that just need auth status
 */
export function useAuth() {
  const authUser = useAuthStore((state) => state.authUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isAuthLoading);
  const error = useAuthStore((state) => state.authError);
  const signOut = useAuthStore((state) => state.signOut);
  const clearError = useAuthStore((state) => state.clearAuthError);

  return {
    authUser,
    isAuthenticated,
    isLoading,
    error,
    signOut,
    clearError,
  };
}
