/**
 * Performance Utilities Index
 * Phase 9.4: Performance Optimization
 *
 * Exports all performance-related utilities
 */

// Route prefetching
export {
  prefetchCriticalRoutes,
  prefetchRoute,
  preconnectExternalOrigins,
} from './prefetch';

// Caching strategies
export {
  CACHE_DURATIONS,
  SWR_DURATIONS,
  getCacheControl,
  dataCache,
  apiCache,
  cachedFetch,
  deduplicatedFetch,
  preloadData,
  getOrCompute,
  invalidatePattern,
  localStorageCache,
  sessionStorageCache,
} from './cacheStrategy';

// Image optimization
export {
  DEFAULT_BLUR_DATA_URL,
  BLUR_PLACEHOLDERS,
  IMAGE_QUALITY,
  ASPECT_RATIOS,
  SIZE_PRESETS,
  generateSizes,
  calculateDimensions,
  isOptimizableUrl,
  getOptimizedImageParams,
  preloadImage,
  preloadImages,
  addImagePreload,
  generateSrcSet,
  supportsNativeLazyLoading,
  supportsIntersectionObserver,
  createLazyLoadObserver,
  type ImageLoadingState,
  type ImageErrorType,
} from './imageOptimizer';

// Performance metrics
export {
  WEB_VITALS_THRESHOLDS,
  getWebVitalRating,
  observeLongTasks,
  observeLayoutShifts,
  getNavigationTiming,
  getResourceTiming,
  getMemoryUsage,
  markPerformance,
  measurePerformance,
  clearPerformanceEntries,
  createTimer,
  checkBudget,
  reportWebVital,
  initWebVitals,
  monitorFrameRate,
  isSlowConnection,
  getConnectionInfo,
  type WebVitalMetric,
  type PerformanceBudget,
} from './metrics';
