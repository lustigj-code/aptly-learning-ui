/**
 * Optimized Image Components
 * Phase 9.4: Performance Optimization
 *
 * Comprehensive image components with lazy loading, error handling,
 * and performance optimizations using next/image
 */

'use client';

import Image from 'next/image';
import { useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_BLUR_DATA_URL,
  IMAGE_QUALITY,
  SIZE_PRESETS,
  type ImageLoadingState,
} from '@/lib/performance/imageOptimizer';

/**
 * Props for LazyImage component
 */
type LazyImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
};

/**
 * LazyImage - Optimized image with lazy loading and skeleton
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  containerClassName = '',
  quality = IMAGE_QUALITY.DEFAULT,
  sizes,
  onLoad,
  onError,
  fallback,
  showSkeleton = true,
}: LazyImageProps) {
  const [loadingState, setLoadingState] = useState<ImageLoadingState>(
    priority ? 'loading' : 'idle'
  );

  const handleLoad = useCallback(() => {
    setLoadingState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoadingState('error');
    onError?.();
  }, [onError]);

  // Error state - show fallback or default error UI
  if (loadingState === 'error') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-grey/20 text-rich-black/40 rounded',
          containerClassName
        )}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  const isLoaded = loadingState === 'loaded';
  const defaultSizes = sizes || `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`;

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ width, height }}
    >
      {/* Loading skeleton */}
      {showSkeleton && !isLoaded && (
        <div className="absolute inset-0 bg-grey/30 animate-pulse rounded" />
      )}

      {/* Optimized image with next/image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300 rounded',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        quality={quality}
        sizes={defaultSizes}
        placeholder="blur"
        blurDataURL={DEFAULT_BLUR_DATA_URL}
      />
    </div>
  );
});

/**
 * Avatar - Profile image with initials fallback
 */
export const Avatar = memo(function Avatar({
  src,
  alt,
  size = 40,
  fallback,
  className,
}: {
  src: string | null;
  alt: string;
  size?: number;
  fallback?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  // Fallback to initials
  if (!src || hasError) {
    const initials = fallback || alt.substring(0, 2).toUpperCase();

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-teal to-purple text-white font-semibold rounded-full',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        role="img"
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', className)}
      quality={IMAGE_QUALITY.HIGH}
      priority={size >= 64} // Prioritize larger avatars
    />
  );
});

/**
 * ResponsiveImage - Fill container with aspect ratio
 */
export const ResponsiveImage = memo(function ResponsiveImage({
  src,
  alt,
  aspectRatio = '16/9',
  className = '',
  containerClassName = '',
  priority = false,
  quality = IMAGE_QUALITY.DEFAULT,
  sizes = SIZE_PRESETS.card,
  onLoad,
}: {
  src: string;
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '21/9' | '3/2';
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  const aspectRatioClasses: Record<string, string> = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '21/9': 'aspect-[21/9]',
    '3/2': 'aspect-[3/2]',
  };

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-grey/30 animate-pulse" />
      )}

      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn(
          'object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        quality={quality}
        priority={priority}
        placeholder="blur"
        blurDataURL={DEFAULT_BLUR_DATA_URL}
      />
    </div>
  );
});

/**
 * HeroImage - Full-width hero images with priority loading
 */
export const HeroImage = memo(function HeroImage({
  src,
  alt,
  className,
  containerClassName,
  overlay = false,
  overlayClassName,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  overlay?: boolean;
  overlayClassName?: string;
  children?: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative w-full', containerClassName)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-grey/30 animate-pulse" />
      )}

      <Image
        src={src}
        alt={alt}
        fill
        sizes={SIZE_PRESETS.hero}
        className={cn(
          'object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={() => setIsLoaded(true)}
        quality={IMAGE_QUALITY.HIGH}
        priority // Hero images should always load first
        placeholder="blur"
        blurDataURL={DEFAULT_BLUR_DATA_URL}
      />

      {/* Optional overlay for text readability */}
      {overlay && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-rich-black/60 to-transparent',
            overlayClassName
          )}
        />
      )}

      {/* Content overlay */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
});

/**
 * ThumbnailImage - Small preview images
 */
export const ThumbnailImage = memo(function ThumbnailImage({
  src,
  alt,
  size = 64,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-grey/20 rounded',
          className
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-rich-black/40">Error</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-teal',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      style={{ width: size, height: size }}
      disabled={!onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-grey/30 animate-pulse" />
      )}

      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn(
          'object-cover transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        quality={IMAGE_QUALITY.THUMBNAIL}
        sizes={SIZE_PRESETS.thumbnail}
      />
    </button>
  );
});

/**
 * BackgroundImage - CSS background with image optimization
 */
export function BackgroundImage({
  src,
  alt,
  className,
  children,
  overlay = true,
  overlayOpacity = 0.5,
}: {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover -z-10"
        quality={IMAGE_QUALITY.DEFAULT}
        sizes="100vw"
        placeholder="blur"
        blurDataURL={DEFAULT_BLUR_DATA_URL}
      />

      {overlay && (
        <div
          className="absolute inset-0 bg-rich-black -z-10"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {children}
    </div>
  );
}
