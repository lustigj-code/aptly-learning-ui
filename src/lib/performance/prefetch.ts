'use client'

/**
 * Route Prefetching Utilities
 * Improves navigation performance by prefetching routes
 */

// Routes to prefetch on app load
const PREFETCH_ROUTES = [
  '/dashboard',
  '/learn',
  '/progress',
  '/achievements',
  '/settings',
]

/**
 * Prefetch critical routes on idle
 * Call this after initial page load
 */
export function prefetchCriticalRoutes() {
  if (typeof window === 'undefined') return

  const doPrefetch = () => {
    PREFETCH_ROUTES.forEach((route) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = route
      link.as = 'document'
      document.head.appendChild(link)
    })
  }

  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(doPrefetch)
  } else {
    setTimeout(doPrefetch, 1)
  }
}

/**
 * Prefetch a specific route
 */
export function prefetchRoute(route: string) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = route
  link.as = 'document'
  document.head.appendChild(link)
}

/**
 * Preconnect to external origins
 * Call this early to establish connections to third-party services
 */
export function preconnectExternalOrigins() {
  if (typeof window === 'undefined') return

  const origins = [
    'https://firestore.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://www.googleapis.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]

  origins.forEach((origin) => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

