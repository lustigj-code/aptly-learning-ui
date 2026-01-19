'use client'

import { cn } from '@/lib/utils'

type VisuallyHiddenProps = {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'div' | 'label'
}

/**
 * Visually Hidden Component
 * Hides content visually but keeps it accessible to screen readers
 * Use for accessible labels, announcements, and skip links
 */
export function VisuallyHidden({ children, className, as: Component = 'span' }: VisuallyHiddenProps) {
  return (
    <Component
      className={cn(
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        '[clip:rect(0,0,0,0)]',
        className
      )}
    >
      {children}
    </Component>
  )
}

/**
 * Live Region for Announcements
 * Announces dynamic content changes to screen readers
 */
export function LiveRegion({
  children,
  politeness = 'polite',
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  )
}

/**
 * Accessible Description
 * Provides accessible descriptions for complex UI elements
 * Use with aria-describedby
 */
export function AccessibleDescription({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <VisuallyHidden as="div" className="sr-only">
      <div id={id}>{children}</div>
    </VisuallyHidden>
  )
}

/**
 * Accessible Label
 * Provides accessible labels for form elements
 * Use when a visual label isn't desired
 */
export function AccessibleLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <VisuallyHidden as="label">
      <label htmlFor={htmlFor}>{children}</label>
    </VisuallyHidden>
  )
}
