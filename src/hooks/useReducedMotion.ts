'use client'

import { useSyncExternalStore, useCallback } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Hook to detect user's motion preferences
 * Returns true if user prefers reduced motion
 * Uses useSyncExternalStore to properly sync with media query state
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mq = window.matchMedia(QUERY)
    mq.addEventListener('change', callback)
    return () => mq.removeEventListener('change', callback)
  }, [])

  const getSnapshot = useCallback(() => {
    return window.matchMedia(QUERY).matches
  }, [])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export default useReducedMotion
