'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SwipeableAtomViewProps = {
  children: React.ReactNode;
  onSwipeNext?: () => void;
  onSwipePrevious?: () => void;
  canSwipeNext?: boolean;
  canSwipePrevious?: boolean;
  currentIndex: number;
  totalCount: number;
  disabled?: boolean;
};

const SWIPE_THRESHOLD = 50; // Minimum distance in px to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 500; // Minimum velocity to trigger swipe

/**
 * SwipeableAtomView - Mobile-optimized wrapper for learning atoms
 *
 * Features:
 * - Horizontal swipe gestures using Framer Motion drag
 * - Visual feedback with edge glow when swiping
 * - Respects completion state (only swipe forward if content is complete)
 * - Smooth animations and haptic-like feedback
 * - Accessible keyboard navigation maintained
 */
export function SwipeableAtomView({
  children,
  onSwipeNext,
  onSwipePrevious,
  canSwipeNext = true,
  canSwipePrevious = true,
  currentIndex,
  totalCount,
  disabled = false,
}: SwipeableAtomViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Lazy initial state to check if hint should be shown
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeenHint = localStorage.getItem('aptly_swipe_hint_seen');
    return !hasSeenHint && window.innerWidth < 768;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for drag tracking
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  // Edge glow opacity transforms (must be at top level per React hooks rules)
  const leftGlowOpacity = useTransform(x, [0, 100], [0, canSwipePrevious ? 1 : 0]);
  const rightGlowOpacity = useTransform(x, [-100, 0], [canSwipeNext ? 1 : 0, 0]);

  // Auto-hide swipe hint after 3 seconds (if shown)
  useEffect(() => {
    if (!showSwipeHint) return;

    const timer = setTimeout(() => {
      setShowSwipeHint(false);
      localStorage.setItem('aptly_swipe_hint_seen', 'true');
    }, 3000);

    return () => clearTimeout(timer);
  }, [showSwipeHint]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    const { offset, velocity } = info;
    const swipeDistance = Math.abs(offset.x);
    const swipeVelocity = Math.abs(velocity.x);

    // Determine swipe direction and trigger action
    if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > SWIPE_VELOCITY_THRESHOLD) {
      if (offset.x > 0 && canSwipePrevious && onSwipePrevious) {
        // Swipe right - go to previous
        onSwipePrevious();
      } else if (offset.x < 0 && canSwipeNext && onSwipeNext) {
        // Swipe left - go to next
        onSwipeNext();
      }
    }

    // Reset position
    x.set(0);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Prevent swipe if disabled
  const dragConstraints = disabled
    ? { left: 0, right: 0 }
    : {
        left: canSwipeNext ? -100 : 0,
        right: canSwipePrevious ? 100 : 0
      };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Swipe Hint Overlay (Mobile only, first time) */}
      {showSwipeHint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-rich-black/80 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center space-y-4 px-6">
            <motion.div
              animate={{ x: [-20, 20, -20] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center justify-center gap-3"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
              <span className="text-white text-lg font-medium">Swipe to navigate</span>
              <ChevronRight className="w-8 h-8 text-white" />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Swipeable Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={dragConstraints}
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        className={cn(
          "h-full w-full",
          isDragging && "cursor-grabbing",
          !disabled && !isDragging && "cursor-grab"
        )}
      >
        {/* Edge Glow Indicators */}
        {isDragging && (
          <>
            {/* Left edge glow (previous) */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-teal/50 to-transparent pointer-events-none z-10"
              style={{
                opacity: leftGlowOpacity,
              }}
            />
            {/* Right edge glow (next) */}
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-teal/50 to-transparent pointer-events-none z-10"
              style={{
                opacity: rightGlowOpacity,
              }}
            />
          </>
        )}

        {/* Content */}
        {children}
      </motion.div>

      {/* Mobile Progress Dots */}
      {totalCount > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none md:hidden">
          {Array.from({ length: totalCount }).map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentIndex
                  ? "w-8 bg-teal"
                  : index < currentIndex
                  ? "w-2 bg-teal/50"
                  : "w-2 bg-grey/30"
              )}
              initial={{ scale: 0.8 }}
              animate={{
                scale: index === currentIndex ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      )}

      {/* Desktop Navigation Hints */}
      <div className="hidden md:flex absolute bottom-4 left-0 right-0 justify-between px-6 pointer-events-none">
        {canSwipePrevious && onSwipePrevious && (
          <button
            onClick={onSwipePrevious}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-sm text-navy font-medium transition-all hover:scale-105"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
        )}
        <div className="flex-1" />
        {canSwipeNext && onSwipeNext && (
          <button
            onClick={onSwipeNext}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-sm text-navy font-medium transition-all hover:scale-105"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default SwipeableAtomView;
