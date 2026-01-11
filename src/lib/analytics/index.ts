/**
 * Analytics Module
 * Central export for all analytics functionality
 */

// Efficacy Metrics
export {
  calculateMetrics,
  calculateUserMetrics,
  compareMetrics,
  calculateSignificance,
  storeCohortMetrics,
  getCohortMetrics,
  type EfficacyMetrics,
  type MetricsComparison,
  type DateRange,
  type CohortMetricsResult,
} from './efficacy';

// Event Tracking
export {
  trackEvent,
  trackEvents,
  queryEvents,
  getEventCounts,
  generateSessionId,
  // Convenience functions
  trackSessionStart,
  trackSessionEnd,
  trackAtomComplete,
  trackQuizAnswer,
  trackQuizComplete,
  trackSkillMastered,
  trackStruggleDetected,
  trackInterventionShown,
  trackInterventionAccepted,
  trackPretestComplete,
  trackContentSkipped,
  trackCoachMessageSent,
  trackPathModified,
  trackReviewComplete,
  trackRetentionTest,
  // Aggregations
  getDailyActiveUsers,
  getWeeklyActiveUsers,
  getMonthlyActiveUsers,
  getEventSummary,
  // Types
  type EventType,
  type AnalyticsEvent,
  type SessionStartProperties,
  type SessionEndProperties,
  type AtomCompleteProperties,
  type QuizAnswerProperties,
  type QuizCompleteProperties,
  type SkillMasteredProperties,
  type StruggleDetectedProperties,
  type InterventionProperties,
  type PretestCompleteProperties,
  type ContentSkippedProperties,
  type CoachMessageProperties,
  type PathModifiedProperties,
  type ReviewCompleteProperties,
  type RetentionTestProperties,
} from './events';
