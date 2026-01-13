/**
 * Data Layer Utilities
 *
 * Provides unified data access patterns for Firestore collections
 * with caching, fallback logic, and migration support.
 */

export {
  getUserProgress,
  getAtomsCompleted,
  batchGetUserProgress,
  invalidateProgressCache,
  clearProgressCache,
  getProgressCacheStats,
  checkMigrationNeeded,
  migrateUserProgress,
} from './userProgressLayer';

export type {
  UserProgress,
  UserStreak,
  FullUserData,
} from './userProgressLayer';
