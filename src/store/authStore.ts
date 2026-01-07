import { create } from 'zustand'
import { useEffect } from 'react'
import { User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

type AuthStore = {
  firebaseUser: FirebaseUser | null
  authUser: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Auth methods
  initializeAuth: () => (() => void)
  signOut: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  firebaseUser: null,
  authUser: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initializeAuth: () => {
    // Set up real-time listener for auth state
    if (!auth) {
      return () => {} // Return empty cleanup function if auth not initialized
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
        }

        set({
          firebaseUser: user,
          authUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          firebaseUser: null,
          authUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      }
    })

    // Return cleanup function
    return unsubscribe
  },

  signOut: async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth)
      }
      set({
        firebaseUser: null,
        authUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Sign out error:', error)
      set({ error: error instanceof Error ? error.message : 'Sign out failed' })
    }
  },

  clearError: () => set({ error: null }),

  setLoading: (loading) => set({ isLoading: loading }),
}))

/**
 * Hook to initialize auth on app load
 * Call once in root layout or _app
 */
export function useAuthInitialize() {
  const { initializeAuth, isLoading } = useAuthStore()

  // Initialize auth on mount
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => unsubscribe?.()
  }, [initializeAuth])

  return isLoading
}
