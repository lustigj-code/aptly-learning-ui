'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { SPRING } from '@/lib/motion/springs';
import type { Atom, AtomType } from '@/types';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ============================================
// TYPES
// ============================================

export type CardState = 'skeleton' | 'loading' | 'loaded' | 'error';

export type CardExitDirection = 'success' | 'discard';

export interface CardRendererProps {
  /** The atom to render - can be undefined for skeleton state */
  atom?: Atom;
  /** Loading state - shows skeleton + loading indicator */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when card content is fully loaded */
  onComplete?: () => void;
  /** Callback when card exits (with direction) */
  onExit?: (direction: CardExitDirection) => void;
  /** Custom className */
  className?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const cardVariants = {
  // Initial state - enters from right
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.95,
  },
  // Loaded state - centered
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  // Exit states - different based on direction
  exitSuccess: {
    opacity: 0,
    y: -100,
    scale: 0.9,
    transition: SPRING.gentle,
  },
  exitDiscard: {
    opacity: 0,
    x: -50,
    transition: SPRING.snappy,
  },
};

// ============================================
// SKELETON COMPONENT
// ============================================

/**
 * Skeleton placeholder for card content
 * Shows immediate feedback while content loads
 */
function CardSkeleton({ type }: { type?: AtomType }) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" width="30%" height={12} />
        <Skeleton variant="text" width="80%" height={24} />
      </div>

      {/* Content skeleton - varies by type */}
      {type === 'video' && (
        <>
          <Skeleton variant="rounded" className="w-full h-[280px]" />
          <SkeletonText lines={3} />
        </>
      )}

      {type === 'reading' && (
        <>
          <SkeletonText lines={8} gap={12} />
          <Skeleton variant="rounded" className="w-32 h-10" />
        </>
      )}

      {type === 'quiz' && (
        <>
          <SkeletonText lines={2} />
          <div className="space-y-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" className="w-full h-12" />
            ))}
          </div>
        </>
      )}

      {type === 'practice' && (
        <>
          <Skeleton variant="rounded" className="w-full h-[200px]" />
          <SkeletonText lines={3} />
          <Skeleton variant="rounded" className="w-full h-24" />
        </>
      )}

      {/* Default skeleton for unknown types */}
      {!type && (
        <>
          <Skeleton variant="rounded" className="w-full h-[200px]" />
          <SkeletonText lines={4} />
        </>
      )}
    </div>
  );
}

// ============================================
// LOADING INDICATOR
// ============================================

/**
 * Loading indicator shown on skeleton while content loads
 */
function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <div className="flex gap-1.5">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-teal"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-sm text-navy/60">Loading content...</span>
    </div>
  );
}

// ============================================
// ERROR STATE
// ============================================

/**
 * Error state with retry option
 */
function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-navy mb-2">
        Oops! Something went wrong
      </h3>
      <p className="text-sm text-navy/70 mb-6 max-w-sm">
        {error.message || 'We encountered an error loading this content.'}
      </p>
      {onRetry && (
        <motion.button
          className="px-6 py-2.5 bg-teal text-white font-medium rounded-xl hover:bg-teal-dark transition-colors"
          whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          onClick={onRetry}
        >
          Try Again
        </motion.button>
      )}
    </div>
  );
}

// ============================================
// CONTENT RENDERERS BY TYPE
// ============================================

/**
 * Renders content based on atom type
 * This is a placeholder - actual content renderers will be implemented separately
 */
function AtomContent({ atom }: { atom: Atom }) {
  // This is a placeholder that shows the structure
  // Real implementations will be in separate components
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-navy/50 uppercase tracking-wider">
          {atom.type}
        </span>
        <span className="text-xs text-navy/50">
          {atom.estimatedMinutes} min
        </span>
      </div>
      <h2 className="text-2xl font-semibold text-navy">{atom.title}</h2>

      {/* Placeholder for actual content */}
      <div className="bg-light-grey/30 rounded-xl p-8 text-center">
        <p className="text-navy/60">
          Content renderer for <span className="font-semibold">{atom.type}</span> atoms
          will be implemented here.
        </p>
        <p className="text-sm text-navy/40 mt-2">
          This card demonstrates the skeleton-first loading pattern.
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * CardRenderer - Skeleton-first learning card component
 *
 * Implements optimistic rendering pattern:
 * 1. Skeleton shown immediately (0ms)
 * 2. Content fills in when loaded
 * 3. Smooth transitions using Framer Motion
 * 4. Graceful error handling with retry
 *
 * Animation choreography:
 * - Entry: Slides from right with scale
 * - Exit (success): Flies up into Mastery Orb
 * - Exit (discard): Snaps left
 */
export function CardRenderer({
  atom,
  isLoading = false,
  error = null,
  onComplete,
  onExit,
  className,
}: CardRendererProps) {
  // Derive card state from props (avoid useState + useEffect pattern)
  const cardState: CardState = error ? 'error' : isLoading ? 'loading' : atom ? 'loaded' : 'skeleton';
  const [exitDirection, setExitDirection] = useState<CardExitDirection | null>(null);

  // Notify when loaded
  useEffect(() => {
    if (cardState === 'loaded') {
      // Small delay to ensure smooth transition
      const timeoutId = setTimeout(() => {
        onComplete?.();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [cardState, onComplete]);

  // Handle retry - calls onComplete to trigger parent re-fetch
  const handleRetry = () => {
    onComplete?.();
  };

  // Handle exit animations
  const handleExit = (direction: CardExitDirection) => {
    setExitDirection(direction);
    setTimeout(() => {
      onExit?.(direction);
    }, 400); // Wait for animation to complete
  };

  // Respect prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={cardState}
        variants={cardVariants}
        initial={prefersReducedMotion ? false : 'initial'}
        animate="animate"
        exit={
          exitDirection === 'success'
            ? 'exitSuccess'
            : exitDirection === 'discard'
            ? 'exitDiscard'
            : undefined
        }
        transition={SPRING.gentle}
        className={cn('w-full max-w-2xl mx-auto', className)}
      >
        <Card
          variant="glass"
          padding="lg"
          className="min-h-[400px] relative overflow-hidden"
        >
          {/* Skeleton State */}
          {cardState === 'skeleton' && (
            <CardSkeleton type={atom?.type} />
          )}

          {/* Loading State - Skeleton + Indicator */}
          {cardState === 'loading' && (
            <>
              <CardSkeleton type={atom?.type} />
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <LoadingIndicator />
              </div>
            </>
          )}

          {/* Error State */}
          {cardState === 'error' && error && (
            <ErrorState error={error} onRetry={handleRetry} />
          )}

          {/* Loaded State */}
          {cardState === 'loaded' && atom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AtomContent atom={atom} />
            </motion.div>
          )}

          {/* Required indicator */}
          {atom?.isRequired && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-light text-yellow-dark border border-yellow-dark/20">
                Required
              </span>
            </div>
          )}
        </Card>

        {/* Action buttons - shown when loaded (for testing exit animations) */}
        {cardState === 'loaded' && atom && (
          <div className="flex gap-4 mt-6 justify-center">
            <motion.button
              className="px-6 py-2.5 bg-light-grey text-navy font-medium rounded-xl hover:bg-grey/50 transition-colors"
              whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
              whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
              onClick={() => handleExit('discard')}
            >
              Skip
            </motion.button>
            <motion.button
              className="px-8 py-2.5 bg-teal text-white font-medium rounded-xl hover:bg-teal-dark transition-colors shadow-md hover:shadow-lg"
              whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
              whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
              onClick={() => handleExit('success')}
            >
              Complete
            </motion.button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default CardRenderer;
