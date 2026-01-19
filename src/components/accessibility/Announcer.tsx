'use client'

import { useEffect, useRef, useState } from 'react'

type AnnouncementPriority = 'polite' | 'assertive'

type AnnouncerProps = {
  message: string
  priority?: AnnouncementPriority
  clearAfter?: number
}

/**
 * Screen Reader Announcer Component
 * Announces dynamic content changes to screen readers
 *
 * Use this for:
 * - Form validation messages
 * - Loading states
 * - Success/error notifications
 * - Navigation changes
 *
 * @example
 * ```tsx
 * <Announcer
 *   message="Quiz submitted successfully"
 *   priority="polite"
 *   clearAfter={3000}
 * />
 * ```
 */
export function Announcer({ message, priority = 'polite', clearAfter }: AnnouncerProps) {
  const [announcement, setAnnouncement] = useState(message)

  // Sync announcement state with incoming message prop
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAnnouncement(message)

    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setAnnouncement('')
      }, clearAfter)

      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!announcement) return null

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

/**
 * Hook for programmatic announcements
 * Returns a function to announce messages to screen readers
 *
 * @example
 * ```tsx
 * const announce = useAnnouncer()
 *
 * const handleSubmit = () => {
 *   // ... submit logic
 *   announce('Form submitted successfully')
 * }
 * ```
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create announcer div if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div')
      announcer.setAttribute('role', 'status')
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      document.body.appendChild(announcer)
      announcerRef.current = announcer
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current)
        announcerRef.current = null
      }
    }
  }, [])

  const announce = (message: string, priority: AnnouncementPriority = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority)
      announcerRef.current.textContent = message

      // Clear after 3 seconds
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = ''
        }
      }, 3000)
    }
  }

  return announce
}

/**
 * Route Change Announcer
 * Announces page navigation to screen readers
 * Essential for SPAs to inform screen reader users of navigation
 */
export function RouteAnnouncer({ route }: { route: string }) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    // Extract page title from route
    const pageTitle = route
      .split('/')
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' - ') || 'Home'

    // Announce navigation for screen readers
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnouncement(`Navigated to ${pageTitle}`)

    // Clear announcement after 2 seconds
    const timer = setTimeout(() => setAnnouncement(''), 2000)
    return () => clearTimeout(timer)
  }, [route])

  if (!announcement) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

/**
 * Loading Announcer
 * Announces loading states to screen readers
 */
export function LoadingAnnouncer({
  isLoading,
  loadingMessage = 'Loading',
  completeMessage = 'Content loaded'
}: {
  isLoading: boolean
  loadingMessage?: string
  completeMessage?: string
}) {
  const [message, setMessage] = useState('')

  // Sync loading message state with loading status
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLoading) {
      setMessage(loadingMessage)
    } else {
      setMessage(completeMessage)
      // Clear complete message after 2 seconds
      const timer = setTimeout(() => setMessage(''), 2000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, loadingMessage, completeMessage])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={isLoading}
      className="sr-only"
    >
      {message}
    </div>
  )
}
