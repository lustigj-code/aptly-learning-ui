/**
 * Store exports
 * Import stores from this file for consistent access
 *
 * The store has been split from a monolithic unifiedStore into
 * focused, single-responsibility stores for better maintainability.
 */

// ============================================
// AUTH STORE
// ============================================
export { useAuthStore, useAuth } from './authStore';
export type { AuthState, AuthUser } from './authStore';

// ============================================
// USER PROFILE STORE (now consolidated in unifiedStore)
// ============================================
export {
  useUnifiedStore as useUserProfileStore,
  useUser,
  useProgress,
  createNewUser,
} from './unifiedStore';

// ============================================
// UI STORE
// ============================================
export { useUIStore } from './uiStore';
export type { UIState, Theme } from './uiStore';

// ============================================
// SYNC STORE
// ============================================
export { useSyncStore, useSyncStatus, useOfflineSync } from './syncStore';
export type { SyncState, SyncStatus } from './syncStore';

// ============================================
// CELEBRATION STORE (unchanged)
// ============================================
export {
  useCelebrationStore,
  CELEBRATION_CONFIGS,
  XP_REWARDS,
  CELEBRATION_MESSAGES,
  getTierForEvent,
  getRandomMessage,
  createCelebrationEvent,
} from './celebrationStore';
export type { CelebrationQueueItem } from './celebrationStore';

// ============================================
// BACKWARDS COMPATIBILITY
// Keep these exports for gradual migration
// ============================================

/**
 * @deprecated Use useAuthStore from './authStore' instead
 * This export maintains backwards compatibility during migration
 */
export { useUnifiedStore, useAuthInitialize } from './unifiedStore';
