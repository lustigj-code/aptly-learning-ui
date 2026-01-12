/**
 * PWA Utilities Index
 * Centralized exports for Progressive Web App functionality
 */

// Service Worker
export {
  registerServiceWorker,
  unregisterServiceWorker,
  checkForUpdates,
  skipWaiting,
  onUpdateAvailable,
  sendMessage,
  cacheCourse,
  clearCache,
  getCacheStatus,
  requestBackgroundSync,
  getRegistration,
  type ServiceWorkerStatus,
  type CacheStatus,
} from './serviceWorker';

// Offline Support
export {
  isOnline,
  addConnectionListener,
  queueProgress,
  getQueuedProgress,
  removeQueuedProgress,
  clearQueuedProgress,
  syncQueuedProgress,
  getQueueCount,
  setLocalData,
  getLocalData,
  removeLocalData,
  checkStorageQuota,
  requestPersistentStorage,
  type QueuedProgress,
} from './offline';

// Install Prompt
export {
  initInstallPrompt,
  onInstallPromptAvailable,
  showInstallPrompt,
  isInstallPromptAvailable,
  getInstallState,
  checkIfInstalled,
  getPlatform,
  isIOSSafari,
  getIOSInstallInstructions,
  dismissInstallPrompt,
  wasInstallPromptDismissed,
  clearInstallDismissal,
  shouldPromptInstall,
  type BeforeInstallPromptEvent,
  type InstallState,
} from './install';
