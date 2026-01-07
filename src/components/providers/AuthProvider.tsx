'use client'

import { useEffect } from 'react'
import { useUnifiedStore } from '@/store/unifiedStore'

/**
 * AuthProvider
 * Initializes Firebase authentication and syncs with Zustand store
 * Must be placed at the root of the app
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useUnifiedStore((state) => state.initializeAuth)

  // Initialize Firebase auth on mount
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => unsubscribe?.()
  }, [initializeAuth])

  return <>{children}</>
}
