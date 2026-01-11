/**
 * Lazy Image Component
 * Phase 6.1: Performance - Optimized image loading with next/image
 *
 * Example implementation showing how to use next/image for optimization
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

type LazyImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
};

export function LazyImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <p className="text-sm text-gray-500">Image failed to load</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
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
        className={`${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 rounded`}
        quality={85}
        sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`}
      />

      {/* Fade-in animation */}
      {isLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 pointer-events-none"
        />
      )}
    </div>
  );
}

/**
 * Avatar Image with fallback
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallback,
}: {
  src: string | null;
  alt: string;
  size?: number;
  fallback?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    // Fallback to initials or default
    const initials = fallback || alt.substring(0, 2).toUpperCase();

    return (
      <div
        className="flex items-center justify-center bg-teal text-white font-semibold rounded-full"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
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
      className="rounded-full object-cover"
      quality={90}
    />
  );
}

/**
 * Responsive Image with automatic sizing
 */
export function ResponsiveImage({
  src,
  alt,
  aspectRatio = '16/9',
  className = '',
}: {
  src: string;
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '21/9';
  className?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  const aspectRatioClasses = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '21/9': 'aspect-[21/9]',
  };

  return (
    <div className={`relative ${aspectRatioClasses[aspectRatio]} ${className} overflow-hidden rounded-lg`}>
      {!isLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}

      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
        onLoad={() => setIsLoaded(true)}
        quality={85}
      />
    </div>
  );
}
