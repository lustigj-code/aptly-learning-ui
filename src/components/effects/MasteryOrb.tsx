'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion/springs';

export interface MasteryOrbProps {
  masteryLevel: number; // 0-100
  isReceiving?: boolean; // True when photon is arriving
  className?: string;
}

/**
 * MasteryOrb - 3D-style sphere positioned in header during learning
 *
 * Visual characteristics:
 * - 48px sphere using CSS radial gradients (no 3D libraries)
 * - Teal glow (#21A8B0) with navy shadow
 * - Subtle pulse animation (2s breathing cycle)
 * - When receiving photon: ripple effect expands outward
 * - Progress ring around orb shows overall mastery %
 * - Inner glow intensifies as mastery increases
 */
export function MasteryOrb({ masteryLevel, isReceiving = false, className }: MasteryOrbProps) {
  // Initialize with lazy callback to avoid setState in effect
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Subscribe to changes only
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Clamp mastery between 0-100
  const clampedMastery = Math.max(0, Math.min(100, masteryLevel));

  // Calculate glow intensity based on mastery
  const glowIntensity = 0.3 + (clampedMastery / 100) * 0.7; // 0.3 to 1.0

  // Calculate stroke dash offset for progress ring
  const circumference = 2 * Math.PI * 24; // radius 24px
  const strokeDashoffset = circumference - (clampedMastery / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Progress Ring */}
      <svg className="absolute inset-0 w-12 h-12 -rotate-90" aria-hidden="true">
        {/* Background ring */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="rgba(10, 0, 74, 0.1)"
          strokeWidth="2"
        />
        {/* Progress ring */}
        <motion.circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#21A8B0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          initial={false}
          animate={{
            strokeDashoffset,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : SPRING.smooth}
        />
      </svg>

      {/* Main Orb */}
      <motion.div
        className="relative w-12 h-12 rounded-full"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), transparent 30%),
            radial-gradient(circle at 50% 50%, #21A8B0, #0A004A 70%)
          `,
          boxShadow: `
            0 0 ${20 * glowIntensity}px rgba(33, 168, 176, ${0.4 * glowIntensity}),
            0 0 ${10 * glowIntensity}px rgba(33, 168, 176, ${0.3 * glowIntensity}),
            0 4px 8px rgba(10, 0, 74, 0.2)
          `,
        }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.05, 1],
                boxShadow: [
                  `0 0 ${20 * glowIntensity}px rgba(33, 168, 176, ${0.4 * glowIntensity}), 0 0 ${10 * glowIntensity}px rgba(33, 168, 176, ${0.3 * glowIntensity}), 0 4px 8px rgba(10, 0, 74, 0.2)`,
                  `0 0 ${24 * glowIntensity}px rgba(33, 168, 176, ${0.5 * glowIntensity}), 0 0 ${12 * glowIntensity}px rgba(33, 168, 176, ${0.4 * glowIntensity}), 0 4px 8px rgba(10, 0, 74, 0.2)`,
                  `0 0 ${20 * glowIntensity}px rgba(33, 168, 176, ${0.4 * glowIntensity}), 0 0 ${10 * glowIntensity}px rgba(33, 168, 176, ${0.3 * glowIntensity}), 0 4px 8px rgba(10, 0, 74, 0.2)`,
                ],
              }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, ${0.6 * glowIntensity}), transparent 50%)`,
          }}
        />
      </motion.div>

      {/* Ripple effect when receiving photon */}
      <AnimatePresence>
        {isReceiving && !prefersReducedMotion && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-teal"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-teal"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: 'easeOut',
                delay: 0.1,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Accessibility: Screen reader text */}
      <span className="sr-only">
        Mastery level: {clampedMastery}%
      </span>
    </div>
  );
}
