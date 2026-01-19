/**
 * Accessibility Components Index
 *
 * Central export point for all accessibility components and utilities.
 * Makes it easy to import accessibility features throughout the app.
 *
 * @example
 * ```tsx
 * import { Announcer, useAnnouncer, KeyboardShortcutsModal } from '@/components/accessibility'
 * ```
 */

// Announcer components and hooks
export {
  Announcer,
  useAnnouncer,
  RouteAnnouncer,
  LoadingAnnouncer,
} from './Announcer'

// Keyboard shortcuts
export {
  KeyboardShortcutsModal,
  useGlobalKeyboardShortcuts,
} from './KeyboardShortcuts'
