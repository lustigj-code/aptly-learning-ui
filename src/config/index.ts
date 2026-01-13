/**
 * Config exports
 *
 * Phase 6: Configuration & Deployment
 * Central export point for all configuration
 */

// Constants (magic numbers)
export {
  QUIZ,
  INTERACTION,
  MASTERY,
  URGENCY,
  STREAK,
  XP,
  CONTENT,
  TIMING,
  PAGINATION,
  EMBEDDING,
  RATE_LIMITS,
  DAILY_GOALS,
  CELEBRATION,
  AI,
  SCORE_THRESHOLDS,
} from './constants';

// Feature flags
export {
  FEATURES,
  isFeatureEnabled,
  getEnabledFeatures,
  getDisabledFeatures,
  areAllFeaturesEnabled,
  isAnyFeatureEnabled,
  AI_FEATURES,
  UI_FEATURES,
  LEARNING_FEATURES,
  ANALYTICS_FEATURES,
  type FeatureFlag,
} from './featureFlags';

// Messages
export {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COACH_PROMPTS,
  LOADING_MESSAGES,
  EMPTY_STATES,
  CONFIRMATIONS,
  BUTTON_LABELS,
  A11Y_LABELS,
} from './messages';
