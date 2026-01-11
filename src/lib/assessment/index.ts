/**
 * Assessment Module
 * Central export for retention testing functionality
 */

export {
  // Scheduling
  scheduleRetentionTest,
  scheduleRetentionTestsForMastery,
  getUserRetentionTests,
  getAvailableTests,
  expireOldTests,
  // Test Execution
  generateRetentionQuestions,
  startRetentionTest,
  submitRetentionAnswer,
  completeRetentionTest,
  runRetentionTest,
  // Notifications
  getPendingTestNotifications,
  notifyPendingTests,
  // Analytics
  getUserRetentionAnalytics,
  getPlatformRetentionAnalytics,
  // Types
  type RetentionTest,
  type RetentionResult,
  type RetentionQuestion,
  type RetentionTestSession,
} from './retentionTest';
