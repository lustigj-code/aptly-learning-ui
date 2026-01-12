/**
 * Performance Metrics Utilities
 * Phase 9.4: Performance Optimization
 *
 * Web Vitals tracking and performance monitoring
 */

'use client';

/**
 * Core Web Vitals metrics
 */
export type WebVitalMetric = {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
};

/**
 * Performance thresholds for Web Vitals
 * Based on Google's recommendations
 */
export const WEB_VITALS_THRESHOLDS = {
  // Cumulative Layout Shift
  CLS: { good: 0.1, poor: 0.25 },
  // First Contentful Paint (ms)
  FCP: { good: 1800, poor: 3000 },
  // First Input Delay (ms)
  FID: { good: 100, poor: 300 },
  // Interaction to Next Paint (ms)
  INP: { good: 200, poor: 500 },
  // Largest Contentful Paint (ms)
  LCP: { good: 2500, poor: 4000 },
  // Time to First Byte (ms)
  TTFB: { good: 800, poor: 1800 },
} as const;

/**
 * Get rating for a Web Vital metric
 */
export function getWebVitalRating(
  name: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks(
  callback: (entry: PerformanceEntry) => void
): PerformanceObserver | null {
  if (typeof window === 'undefined') return null;

  if (!('PerformanceObserver' in window)) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Performance observer for layout shifts
 */
export function observeLayoutShifts(
  callback: (entry: PerformanceEntry & { hadRecentInput?: boolean }) => void
): PerformanceObserver | null {
  if (typeof window === 'undefined') return null;

  if (!('PerformanceObserver' in window)) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry as PerformanceEntry & { hadRecentInput?: boolean });
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Measure navigation timing
 */
export function getNavigationTiming(): {
  dns: number;
  tcp: number;
  ttfb: number;
  download: number;
  domInteractive: number;
  domComplete: number;
  loadComplete: number;
} | null {
  if (typeof window === 'undefined') return null;

  const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (!timing) return null;

  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.requestStart,
    download: timing.responseEnd - timing.responseStart,
    domInteractive: timing.domInteractive - timing.fetchStart,
    domComplete: timing.domComplete - timing.fetchStart,
    loadComplete: timing.loadEventEnd - timing.fetchStart,
  };
}

/**
 * Measure resource loading performance
 */
export function getResourceTiming(): Array<{
  name: string;
  type: string;
  duration: number;
  transferSize: number;
  decodedSize: number;
}> {
  if (typeof window === 'undefined') return [];

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return resources.map((r) => ({
    name: r.name,
    type: r.initiatorType,
    duration: r.duration,
    transferSize: r.transferSize,
    decodedSize: r.decodedBodySize,
  }));
}

/**
 * Get memory usage (Chrome only)
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  if (typeof window === 'undefined') return null;

  const memory = (performance as unknown as { memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  }}).memory;

  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

/**
 * Mark a performance point
 */
export function markPerformance(name: string): void {
  if (typeof window === 'undefined') return;
  performance.mark(name);
}

/**
 * Measure between two marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined') return null;

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }

    const measures = performance.getEntriesByName(name, 'measure');
    return measures.length > 0 ? measures[measures.length - 1].duration : null;
  } catch {
    return null;
  }
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceEntries(name?: string): void {
  if (typeof window === 'undefined') return;

  if (name) {
    performance.clearMarks(name);
    performance.clearMeasures(name);
  } else {
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * Create a performance timer
 */
export function createTimer(name: string) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  return {
    start: () => markPerformance(startMark),
    end: () => {
      markPerformance(endMark);
      return measurePerformance(name, startMark, endMark);
    },
    clear: () => {
      clearPerformanceEntries(startMark);
      clearPerformanceEntries(endMark);
      clearPerformanceEntries(name);
    },
  };
}

/**
 * Performance budget checker
 */
export type PerformanceBudget = {
  lcp?: number;
  fcp?: number;
  ttfb?: number;
  cls?: number;
  bundleSize?: number;
  imageSize?: number;
};

const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,
  fcp: 1800,
  ttfb: 800,
  cls: 0.1,
  bundleSize: 200 * 1024, // 200KB
  imageSize: 100 * 1024, // 100KB
};

/**
 * Check if metrics are within budget
 */
export function checkBudget(
  metrics: Partial<PerformanceBudget>,
  budget: PerformanceBudget = DEFAULT_BUDGET
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.lcp !== undefined && budget.lcp !== undefined && metrics.lcp > budget.lcp) {
    violations.push(`LCP: ${metrics.lcp}ms exceeds budget of ${budget.lcp}ms`);
  }

  if (metrics.fcp !== undefined && budget.fcp !== undefined && metrics.fcp > budget.fcp) {
    violations.push(`FCP: ${metrics.fcp}ms exceeds budget of ${budget.fcp}ms`);
  }

  if (metrics.ttfb !== undefined && budget.ttfb !== undefined && metrics.ttfb > budget.ttfb) {
    violations.push(`TTFB: ${metrics.ttfb}ms exceeds budget of ${budget.ttfb}ms`);
  }

  if (metrics.cls !== undefined && budget.cls !== undefined && metrics.cls > budget.cls) {
    violations.push(`CLS: ${metrics.cls} exceeds budget of ${budget.cls}`);
  }

  if (metrics.bundleSize !== undefined && budget.bundleSize !== undefined && metrics.bundleSize > budget.bundleSize) {
    violations.push(`Bundle size: ${(metrics.bundleSize / 1024).toFixed(1)}KB exceeds budget of ${(budget.bundleSize / 1024).toFixed(1)}KB`);
  }

  if (metrics.imageSize !== undefined && budget.imageSize !== undefined && metrics.imageSize > budget.imageSize) {
    violations.push(`Image size: ${(metrics.imageSize / 1024).toFixed(1)}KB exceeds budget of ${(budget.imageSize / 1024).toFixed(1)}KB`);
  }

  return {
    pass: violations.length === 0,
    violations,
  };
}

/**
 * Report Web Vitals to analytics
 */
export function reportWebVital(
  metric: WebVitalMetric,
  reporter?: (metric: WebVitalMetric) => void
): void {
  // Add rating
  const rating = getWebVitalRating(
    metric.name as keyof typeof WEB_VITALS_THRESHOLDS,
    metric.value
  );
  const enrichedMetric = { ...metric, rating };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}: ${metric.value} (${rating})`);
  }

  // Call custom reporter
  if (reporter) {
    reporter(enrichedMetric);
  }
}

/**
 * Initialize Web Vitals reporting
 * Call this in your app's entry point
 */
export async function initWebVitals(
  reporter?: (metric: WebVitalMetric) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamic import to avoid SSR issues
    const { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } = await import('web-vitals');

    const report = (metric: WebVitalMetric) => reportWebVital(metric, reporter);

    onCLS(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
    onFCP(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
    onFID(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
    onINP(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
    onLCP(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
    onTTFB(report as (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => void);
  } catch {
    // web-vitals not installed - fail silently
    if (process.env.NODE_ENV === 'development') {
      console.warn('web-vitals library not available for performance monitoring');
    }
  }
}

/**
 * Frame rate monitor
 */
export function monitorFrameRate(
  callback: (fps: number) => void,
  sampleInterval = 1000
): () => void {
  if (typeof window === 'undefined') return () => {};

  let frameCount = 0;
  let lastTime = performance.now();
  let animationId: number;

  const countFrame = () => {
    frameCount++;
    const currentTime = performance.now();

    if (currentTime - lastTime >= sampleInterval) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      callback(fps);
      frameCount = 0;
      lastTime = currentTime;
    }

    animationId = requestAnimationFrame(countFrame);
  };

  animationId = requestAnimationFrame(countFrame);

  // Return cleanup function
  return () => cancelAnimationFrame(animationId);
}

/**
 * Detect if running on slow connection
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  }).connection;

  if (!connection) return false;

  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  );
}

/**
 * Get connection info
 */
export function getConnectionInfo(): {
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
} {
  if (typeof navigator === 'undefined') {
    return { effectiveType: null, downlink: null, rtt: null, saveData: false };
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  }).connection;

  if (!connection) {
    return { effectiveType: null, downlink: null, rtt: null, saveData: false };
  }

  return {
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false,
  };
}
