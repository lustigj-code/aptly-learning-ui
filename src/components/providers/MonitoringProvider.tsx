'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPosthog, trackPageView } from '@/lib/monitoring/posthog'
import { initSentry } from '@/lib/monitoring/sentry'

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
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
