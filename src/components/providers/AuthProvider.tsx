'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUserProfileStore } from '@/store/userProfileStore'
import { createNewUser } from '@/store/userProfileStore'

/**
 * AuthProvider
 * Initializes Firebase authentication and syncs with Zustand store
 * Must be placed at the root of the app
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const authUser = useAuthStore((state) => state.authUser)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setupFirestoreListener = useUserProfileStore((state) => state.setupFirestoreListener)
  const setUser = useUserProfileStore((state) => state.setUser)
  const user = useUserProfileStore((state) => state.user)

  // Initialize Firebase auth on mount
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => unsubscribe?.()
  }, [initializeAuth])

  // Setup Firestore listener when authenticated
  useEffect(() => {
    if (!isAuthenticated || !authUser?.uid) return

    const unsubscribe = setupFirestoreListener(authUser.uid)

    return () => unsubscribe?.()
  }, [isAuthenticated, authUser?.uid, setupFirestoreListener])

  // Create new user if authenticated but no user data exists
  useEffect(() => {
    if (isAuthenticated && authUser && !user) {
      // Wait a bit for Firestore listener to potentially load existing user
      const timeout = setTimeout(() => {
        const currentUser = useUserProfileStore.getState().user
        if (!currentUser) {
          const newUser = createNewUser(
            authUser.displayName || 'User',
            authUser.email || '',
            authUser.uid
          )
          setUser(newUser)
        }
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [isAuthenticated, authUser, user, setUser])

  return <>{children}</>
}
