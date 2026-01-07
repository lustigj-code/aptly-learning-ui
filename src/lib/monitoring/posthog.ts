'use client'

import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function initPosthog() {
  if (typeof window === 'undefined') return
  if (initialized) return
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured. Analytics disabled.')
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,

    // Respect Do Not Track
    respect_dnt: true,

    // Capture pageviews automatically
    capture_pageview: true,
    capture_pageleave: true,

    // Session recording (production only)
    disable_session_recording: process.env.NODE_ENV !== 'production',

    // Performance
    autocapture: {
      dom_event_allowlist: ['click', 'submit'],
      element_allowlist: ['button', 'a', 'form'],
    },

    // Privacy
    mask_all_text: false,
    mask_all_element_attributes: false,

    // Persistence
    persistence: 'localStorage+cookie',

    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        // Disable in development unless explicitly enabled
        posthog.opt_out_capturing()
      }
    },
  })

  initialized = true
}

// Identify user for analytics
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return

  posthog.identify(userId, properties)
}

// Reset user on logout
export function resetUser() {
  if (!initialized) return

  posthog.reset()
}

// Track custom event
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!initialized) return

  posthog.capture(eventName, properties)
}

// Track page view manually (if needed)
export function trackPageView(pageName?: string) {
  if (!initialized) return

  posthog.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
  })
}

// Feature flags
export function isFeatureEnabled(flagKey: string): boolean {
  if (!initialized) return false

  return posthog.isFeatureEnabled(flagKey) ?? false
}

export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!initialized) return undefined

  return posthog.getFeatureFlag(flagKey)
}

// Learning-specific analytics events
export const LearningEvents = {
  lessonStarted: (lessonId: string, lessonTitle: string) => {
    trackEvent('lesson_started', { lesson_id: lessonId, lesson_title: lessonTitle })
  },

  lessonCompleted: (lessonId: string, timeSpentMinutes: number) => {
    trackEvent('lesson_completed', { lesson_id: lessonId, time_spent_minutes: timeSpentMinutes })
  },

  quizAttempted: (quizId: string, score: number) => {
    trackEvent('quiz_attempted', { quiz_id: quizId, score })
  },

  badgeEarned: (badgeId: string, badgeTitle: string) => {
    trackEvent('badge_earned', { badge_id: badgeId, badge_title: badgeTitle })
  },

  streakUpdated: (currentStreak: number) => {
    trackEvent('streak_updated', { current_streak: currentStreak })
  },

  coachMessageSent: (context: string) => {
    trackEvent('coach_message_sent', { context })
  },

  onboardingCompleted: (goal: string, experienceLevel: string) => {
    trackEvent('onboarding_completed', { goal, experience_level: experienceLevel })
  },
}

export { posthog }
