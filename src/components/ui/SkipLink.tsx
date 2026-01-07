'use client'

/**
 * Skip Link Component
 * Provides keyboard-accessible skip navigation for screen readers
 * WCAG 2.1 Level A requirement
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-navy focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow focus:ring-offset-2 transition-all"
    >
      Skip to main content
    </a>
  )
}

/**
 * Main Content Wrapper
 * Provides the target for skip link navigation
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      {children}
    </main>
  )
}
