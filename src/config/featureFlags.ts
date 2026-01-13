/**
 * Feature flags configuration
 * Control experimental features via environment variables
 *
 * Phase 6: Configuration & Deployment
 * Enables gradual rollout and A/B testing of features
 */

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURES = {
  // AI Features
  /** Enable Socratic coaching mode */
  SOCRATIC_MODE: process.env.NEXT_PUBLIC_FEATURE_SOCRATIC !== 'false',
  /** Enable hybrid ML model */
  HYBRID_MODEL: process.env.NEXT_PUBLIC_FEATURE_HYBRID === 'true',
  /** Enable Sage character model */
  SAGE_MODEL: process.env.NEXT_PUBLIC_FEATURE_SAGE === 'true',
  /** Enable RAG grounding for AI responses */
  RAG_GROUNDING: process.env.NEXT_PUBLIC_FEATURE_RAG !== 'false',

  // UI Features
  /** Enable dark mode support */
  DARK_MODE: process.env.NEXT_PUBLIC_FEATURE_DARK_MODE !== 'false',
  /** Enable UI animations */
  ANIMATIONS: process.env.NEXT_PUBLIC_FEATURE_ANIMATIONS !== 'false',
  /** Enable celebration effects */
  CELEBRATIONS: process.env.NEXT_PUBLIC_FEATURE_CELEBRATIONS !== 'false',
  /** Enable sound effects */
  SOUND_EFFECTS: process.env.NEXT_PUBLIC_FEATURE_SOUNDS !== 'false',

  // Learning Features
  /** Enable mastery gates */
  MASTERY_GATES: process.env.NEXT_PUBLIC_FEATURE_MASTERY_GATES !== 'false',
  /** Enable adaptive difficulty */
  ADAPTIVE_DIFFICULTY: process.env.NEXT_PUBLIC_FEATURE_ADAPTIVE !== 'false',
  /** Enable spaced repetition reviews */
  SPACED_REPETITION: process.env.NEXT_PUBLIC_FEATURE_SPACED_REP !== 'false',
  /** Enable autopilot learning mode */
  AUTOPILOT_MODE: process.env.NEXT_PUBLIC_FEATURE_AUTOPILOT !== 'false',

  // Experimental
  /** Enable A/B testing framework */
  AB_TESTING: process.env.NEXT_PUBLIC_FEATURE_AB_TESTING === 'true',
  /** Enable offline mode / PWA */
  OFFLINE_MODE: process.env.NEXT_PUBLIC_FEATURE_OFFLINE !== 'false',
  /** Enable debug mode for development */
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  /** Enable verbose logging */
  VERBOSE_LOGGING: process.env.NEXT_PUBLIC_FEATURE_VERBOSE === 'true',

  // Analytics
  /** Enable interaction logging for ML training */
  INTERACTION_LOGGING: process.env.NEXT_PUBLIC_FEATURE_LOGGING !== 'false',
  /** Enable PostHog analytics */
  POSTHOG_ANALYTICS: process.env.NEXT_PUBLIC_POSTHOG_KEY !== undefined,
  /** Enable Sentry error tracking */
  SENTRY_TRACKING: process.env.NEXT_PUBLIC_SENTRY_DSN !== undefined,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type FeatureFlag = keyof typeof FEATURES;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a feature is enabled
 * @param flag - The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag] ?? false;
}

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[]).filter(
    (flag) => FEATURES[flag]
  );
}

/**
 * Get all disabled features
 * @returns Array of disabled feature names
 */
export function getDisabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[]).filter(
    (flag) => !FEATURES[flag]
  );
}

/**
 * Check if multiple features are enabled
 * @param flags - Array of feature flags to check
 * @returns boolean indicating if ALL features are enabled
 */
export function areAllFeaturesEnabled(flags: FeatureFlag[]): boolean {
  return flags.every((flag) => FEATURES[flag]);
}

/**
 * Check if any of the features are enabled
 * @param flags - Array of feature flags to check
 * @returns boolean indicating if ANY feature is enabled
 */
export function isAnyFeatureEnabled(flags: FeatureFlag[]): boolean {
  return flags.some((flag) => FEATURES[flag]);
}

// ============================================
// FEATURE GROUPS
// ============================================

/** AI-related features */
export const AI_FEATURES: FeatureFlag[] = [
  'SOCRATIC_MODE',
  'HYBRID_MODEL',
  'SAGE_MODEL',
  'RAG_GROUNDING',
];

/** UI-related features */
export const UI_FEATURES: FeatureFlag[] = [
  'DARK_MODE',
  'ANIMATIONS',
  'CELEBRATIONS',
  'SOUND_EFFECTS',
];

/** Learning-related features */
export const LEARNING_FEATURES: FeatureFlag[] = [
  'MASTERY_GATES',
  'ADAPTIVE_DIFFICULTY',
  'SPACED_REPETITION',
  'AUTOPILOT_MODE',
];

/** Analytics-related features */
export const ANALYTICS_FEATURES: FeatureFlag[] = [
  'INTERACTION_LOGGING',
  'POSTHOG_ANALYTICS',
  'SENTRY_TRACKING',
];
