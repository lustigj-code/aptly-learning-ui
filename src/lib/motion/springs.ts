/**
 * Standardized Spring Constants for Framer Motion
 * Following Apple's Human Interface Guidelines for motion design
 *
 * Usage:
 * import { SPRING, EASING } from '@/lib/motion/springs'
 * <motion.div transition={SPRING.gentle} />
 */

import type { TargetAndTransition, Transition } from 'framer-motion'

/**
 * Apple-like easing curves
 * Based on Apple's design principles and Core Animation curves
 */
export const EASING = {
  // Standard easing - most common, feels natural
  standard: [0.4, 0.0, 0.2, 1] as const,

  // Emphasized easing - for important actions
  emphasized: [0.4, 0.0, 0.0, 1] as const,

  // Deceleration - elements entering (ease-out)
  decelerate: [0.0, 0.0, 0.2, 1] as const,

  // Acceleration - elements exiting (ease-in)
  accelerate: [0.4, 0.0, 1, 1] as const,

  // Sharp - quick, decisive movements
  sharp: [0.4, 0.0, 0.6, 1] as const,

  // Apple's signature easing (used in iOS)
  apple: [0.32, 0.72, 0, 1] as const,
} as const

export const SPRING = {
  // ============================================
  // APPLE-SPEC PRIMARY SPRINGS (Cognitive OS)
  // ============================================

  // Primary card motion - Apple spec (320/32/1)
  card: { type: 'spring' as const, stiffness: 320, damping: 32, mass: 1 },

  // Exit animations - slightly softer
  exit: { type: 'spring' as const, stiffness: 280, damping: 28, mass: 1 },

  // Quick snaps (discard, dismiss)
  snap: { type: 'spring' as const, stiffness: 400, damping: 40, mass: 0.8 },

  // Celebrations (slight bounce)
  celebrate: { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.8 },

  // ============================================
  // EXISTING SPRINGS (backward compatibility)
  // ============================================

  // For micro-interactions (buttons hover, toggles) - 150ms equivalent
  micro: { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.5 },

  // For UI elements (buttons press, cards) - 200ms equivalent
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 },

  // For content transitions - 250ms equivalent, smooth and gentle
  gentle: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 },

  // For modals/overlays - 300ms equivalent, smooth entrance
  smooth: { type: 'spring' as const, stiffness: 200, damping: 25, mass: 1 },

  // For celebrations/achievements - bouncy but controlled
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15, mass: 0.8 },

  // For page transitions - 200ms with Apple easing
  page: { type: 'tween' as const, duration: 0.2, ease: EASING.apple },

  // For modals - 300ms with emphasized easing
  modal: { type: 'tween' as const, duration: 0.3, ease: EASING.apple },

  // For toasts - 250ms with standard easing
  toast: { type: 'spring' as const, stiffness: 350, damping: 25, mass: 0.8 },

  // For progress bars - smooth fill animation
  progress: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 },

  // No motion (for reduced motion preference)
  none: { type: 'tween' as const, duration: 0 },
} as const

/**
 * Card Animation Variants
 * Standardized choreography for learning cards
 */
export const CARD_VARIANTS = {
  // Entry (from right)
  initial: { opacity: 0, x: 100, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },

  // Exit - Success (flies into Mastery Orb)
  exitSuccess: { opacity: 0, y: -100, scale: 0.9 },

  // Exit - Discard (snaps left)
  exitDiscard: { opacity: 0, x: -50 },
} as const

/**
 * Get motion-safe transition based on user preference
 */
export function getMotionSafeTransition(
  transition: Transition,
  prefersReducedMotion: boolean
): Transition {
  return prefersReducedMotion ? SPRING.none : transition
}

/**
 * Motion-safe initial state
 * Returns false (no animation) if reduced motion preferred
 */
export function getMotionSafeInitial<T extends TargetAndTransition>(
  initial: T,
  prefersReducedMotion: boolean
): T | false {
  return prefersReducedMotion ? false : initial
}

/**
 * Motion-safe exit state
 * Returns undefined (no exit animation) if reduced motion preferred
 */
export function getMotionSafeExit<T extends TargetAndTransition>(
  exit: T,
  prefersReducedMotion: boolean
): T | undefined {
  return prefersReducedMotion ? undefined : exit
}

export default SPRING
