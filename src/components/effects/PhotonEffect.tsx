'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASING } from '@/lib/motion/springs';
import { Z_INDEX, COLORS_RAW } from '@/lib/design-tokens';

export interface PhotonEffectProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete?: () => void;
  color?: string;
}

/**
 * PhotonEffect - Particle that flies from completed card to MasteryOrb
 *
 * Visual characteristics:
 * - Small glowing particle (8-12px)
 * - Teal color (#21A8B0) with glow effect
 * - Travels in arc path (not straight line)
 * - Shrinks as it approaches target (scale 1 -> 0.3)
 * - Fades out at end
 * - Duration: 0.8s with Apple easing
 */
export function PhotonEffect({ from, to, onComplete, color = COLORS_RAW.teal }: PhotonEffectProps) {
  // Initialize with lazy callback to avoid setState in effect
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Show animation only if not reducing motion
  const [isVisible, setIsVisible] = useState(() => !prefersReducedMotion);

  // Handle animation completion
  useEffect(() => {
    // If reduced motion, complete immediately without animation
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    // Otherwise complete after animation duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete, prefersReducedMotion]);

  // Calculate arc path control point
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 100; // Arc upward

  // Skip rendering if reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'pointer-events-none fixed',
            'w-3 h-3 rounded-full'
          )}
          style={{
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}99, 0 0 6px ${color}`,
            left: from.x,
            top: from.y,
            zIndex: Z_INDEX.particles,
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: [0, midX - from.x, to.x - from.x],
            y: [0, midY - from.y, to.y - from.y],
            scale: [1, 0.8, 0.3],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.8,
            ease: EASING.apple,
            times: [0, 0.5, 1],
          }}
          exit={{
            opacity: 0,
            scale: 0,
          }}
        />
      )}
    </AnimatePresence>
  );
}
