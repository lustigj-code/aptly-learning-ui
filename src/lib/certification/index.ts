/**
 * Certification Module
 *
 * Functions for exam mode scheduling and readiness calculation
 */

export {
  // Core functions
  calculateExamReadiness,
  calculateSkillReadiness,
  generateDailySchedule,
  estimateLearningRate,
  adjustScheduleForLearningRate,

  // Utility functions
  getDaysUntilExam,
  predictRetentionAtExam,
  estimateReviewsNeeded,
  getTrackingStatusInfo,
  formatDaysUntilExam,

  // Types
  type ExamScheduleConfig,
  type ExamReadinessResult,
  type SkillReadinessStatus,
  type DailySchedule,
  type LearningRateEstimate,
} from './examScheduler';
