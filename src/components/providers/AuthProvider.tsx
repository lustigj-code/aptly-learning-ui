'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUnifiedStore, createNewUser } from '@/store/unifiedStore'
import { auth } from '@/lib/firebase/config'

/**
 * AuthProvider
 * Initializes Firebase authentication and syncs with Zustand store
 * Must be placed at the root of the app
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const authUser = useAuthStore((state) => state.authUser)
  const firebaseUser = useAuthStore((state) => state.firebaseUser)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setupFirestoreListener = useUnifiedStore((state) => state.fetchUserFromFirestore)
  const setUser = useUnifiedStore((state) => state.setUser)
  const user = useUnifiedStore((state) => state.user)
  const sessionRefreshed = useRef(false)

  /**
   * Refresh session cookie when Firebase auth is valid
   * This ensures API routes work even after the 24h session cookie expires
   */
  const refreshSessionCookie = useCallback(async () => {
    if (!firebaseUser || sessionRefreshed.current) return

    try {
      const idToken = await firebaseUser.getIdToken(true) // Force refresh
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        sessionRefreshed.current = true
        console.debug('[AuthProvider] Session cookie refreshed')
      }
    } catch (error) {
      console.warn('[AuthProvider] Session cookie refresh failed:', error)
    }
  }, [firebaseUser])

  // Initialize Firebase auth on mount
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => unsubscribe?.()
  }, [initializeAuth])

  // Refresh session cookie when authenticated
  useEffect(() => {
    if (isAuthenticated && firebaseUser && auth) {
      refreshSessionCookie()
    }
  }, [isAuthenticated, firebaseUser, refreshSessionCookie])

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
        const currentUser = useUnifiedStore.getState().user
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
