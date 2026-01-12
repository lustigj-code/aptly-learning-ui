/**
 * Image Optimizer Utilities
 * Phase 9.4: Performance Optimization
 *
 * Wrapper utilities for next/image with lazy loading and optimization
 */

// Default blur placeholder (tiny base64 image)
export const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

// Themed blur placeholders
export const BLUR_PLACEHOLDERS = {
  light: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  dark: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PC9zdmc+',
  brand: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTRiOGE2Ii8+PC9zdmc+',
} as const;

/**
 * Image quality presets
 */
export const IMAGE_QUALITY = {
  /** High quality for hero images - 90% */
  HIGH: 90,
  /** Default quality - 85% */
  DEFAULT: 85,
  /** Lower quality for thumbnails - 75% */
  THUMBNAIL: 75,
  /** Low quality for placeholders - 60% */
  LOW: 60,
} as const;

/**
 * Common aspect ratios
 */
export const ASPECT_RATIOS = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:2': 3 / 2,
  '21:9': 21 / 9,
  '9:16': 9 / 16,
} as const;

/**
 * Generate responsive sizes attribute for next/image
 */
export function generateSizes(options: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  default?: string;
}): string {
  const parts: string[] = [];

  if (options.mobile) {
    parts.push(`(max-width: 640px) ${options.mobile}`);
  }

  if (options.tablet) {
    parts.push(`(max-width: 1024px) ${options.tablet}`);
  }

  if (options.desktop) {
    parts.push(`(max-width: 1536px) ${options.desktop}`);
  }

  parts.push(options.default || '100vw');

  return parts.join(', ');
}

/**
 * Preset sizes configurations
 */
export const SIZE_PRESETS = {
  /** Full width on all screens */
  fullWidth: generateSizes({ default: '100vw' }),

  /** Half width on desktop, full on mobile */
  halfWidth: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    default: '50vw',
  }),

  /** Third width on desktop */
  thirdWidth: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    default: '33vw',
  }),

  /** Quarter width on desktop */
  quarterWidth: generateSizes({
    mobile: '50vw',
    tablet: '33vw',
    default: '25vw',
  }),

  /** Card image (responsive) */
  card: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    default: '25vw',
  }),

  /** Thumbnail */
  thumbnail: generateSizes({
    mobile: '25vw',
    default: '100px',
  }),

  /** Avatar */
  avatar: '48px',

  /** Hero image */
  hero: generateSizes({
    mobile: '100vw',
    default: '100vw',
  }),
} as const;

/**
 * Calculate dimensions while maintaining aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  if (targetWidth && targetHeight) {
    return { width: targetWidth, height: targetHeight };
  }

  if (targetWidth) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio),
    };
  }

  if (targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight,
    };
  }

  return { width: originalWidth, height: originalHeight };
}

/**
 * Check if URL is from an allowed domain for optimization
 */
export function isOptimizableUrl(url: string): boolean {
  if (!url) return false;

  // Local images are always optimizable
  if (url.startsWith('/') || url.startsWith('./')) {
    return true;
  }

  // Check against allowed domains
  const allowedDomains = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'lh3.googleusercontent.com',
    'images.unsplash.com',
  ];

  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Get optimized image URL parameters
 */
export function getOptimizedImageParams(options: {
  width?: number;
  quality?: number;
}): Record<string, string> {
  const params: Record<string, string> = {};

  if (options.width) {
    params.w = options.width.toString();
  }

  if (options.quality) {
    params.q = options.quality.toString();
  }

  return params;
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Create a link preload element for an image
 */
export function createImagePreloadLink(src: string, options?: {
  as?: 'image';
  type?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = src;
  link.as = options?.as || 'image';

  if (options?.type) {
    link.type = options.type;
  }

  if (options?.fetchPriority) {
    link.setAttribute('fetchpriority', options.fetchPriority);
  }

  return link;
}

/**
 * Add preload link to document head
 */
export function addImagePreload(src: string, priority: 'high' | 'low' | 'auto' = 'auto'): void {
  if (typeof document === 'undefined') return;

  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${src}"]`);
  if (existing) return;

  const link = createImagePreloadLink(src, { fetchPriority: priority });
  if (link) {
    document.head.appendChild(link);
  }
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseSrc: string,
  widths: number[],
  quality: number = IMAGE_QUALITY.DEFAULT
): string {
  return widths
    .map(w => `${baseSrc}?w=${w}&q=${quality} ${w}w`)
    .join(', ');
}

/**
 * Check if native lazy loading is supported
 */
export function supportsNativeLazyLoading(): boolean {
  if (typeof window === 'undefined') return false;
  return 'loading' in HTMLImageElement.prototype;
}

/**
 * Check if IntersectionObserver is supported (for fallback lazy loading)
 */
export function supportsIntersectionObserver(): boolean {
  if (typeof window === 'undefined') return false;
  return 'IntersectionObserver' in window;
}

/**
 * Create an intersection observer for lazy loading
 */
export function createLazyLoadObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (!supportsIntersectionObserver()) return null;

  return new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    },
    {
      rootMargin: '50px 0px',
      threshold: 0.01,
      ...options,
    }
  );
}

/**
 * Image loading states
 */
export type ImageLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Image error types
 */
export type ImageErrorType = 'network' | 'decode' | 'not-found' | 'unknown';

/**
 * Determine error type from error event
 */
export function getImageErrorType(event: Event): ImageErrorType {
  const target = event.target as HTMLImageElement;

  if (!target.src) return 'not-found';

  // Check if it's a network error
  if (!navigator.onLine) return 'network';

  return 'unknown';
}
