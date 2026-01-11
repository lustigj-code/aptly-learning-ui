'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPosthog, trackPageView } from '@/lib/monitoring/posthog'
import { initSentry } from '@/lib/monitoring/sentry'

// Inner component that uses useSearchParams (requires Suspense boundary)
function MonitoringInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize monitoring on mount
  useEffect(() => {
    initPosthog()
    initSentry()
  }, [])

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname)
    }
  }, [pathname, searchParams])

  return <>{children}</>
}

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <MonitoringInner>{children}</MonitoringInner>
    </Suspense>
  )
}
