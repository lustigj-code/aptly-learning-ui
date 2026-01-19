'use client'

import { useSyncExternalStore, useCallback } from 'react'

/**
 * Hook to match CSS media queries
 * Uses useSyncExternalStore to properly sync with media query state
 *
 * @param query - CSS media query string (e.g., "(max-width: 768px)")
 * @returns boolean indicating whether the query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 639px)')
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook to detect mobile viewports (max-width: 639px)
 * Matches Tailwind's sm breakpoint
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 639px)')
}

/**
 * Hook to detect tablet viewports (640px - 1023px)
 * Matches Tailwind's sm to lg breakpoint range
 */
export function useIsTablet() {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
}

/**
 * Hook to detect desktop viewports (min-width: 1024px)
 * Matches Tailwind's lg breakpoint and above
 */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
