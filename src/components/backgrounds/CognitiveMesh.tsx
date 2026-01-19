'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const COGNITIVE_GRADIENTS = {
  calm: {
    colors: ['#0F172A', '#2DD4BF'], // Navy + Teal
    animation: 6000, // 6s breathing cycle
  },
  focused: {
    colors: ['#0A004A', '#21A8B0'], // Deep navy + Teal
    animation: 4000,
  },
  struggling: {
    colors: ['#0A004A', '#F97316'], // Navy + Orange pulses
    animation: 2000, // Faster pulse
  },
} as const;

export interface CognitiveMeshProps {
  cognitiveLoad: number; // 0-1 (from useCognitiveLoad hook)
  className?: string;
}

export function CognitiveMesh({ cognitiveLoad, className }: CognitiveMeshProps) {
  // Lazy initialization to respect prefers-reduced-motion
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const gradient = useMemo(() => {
    if (cognitiveLoad > 0.7) return COGNITIVE_GRADIENTS.struggling;
    if (cognitiveLoad > 0.4) return COGNITIVE_GRADIENTS.focused;
    return COGNITIVE_GRADIENTS.calm;
  }, [cognitiveLoad]);

  const breathingDuration = prefersReducedMotion ? 0 : gradient.animation / 1000;

  return (
    <motion.div
      className={cn('fixed inset-0 -z-10', className)}
      style={{
        willChange: 'background',
        backgroundSize: '200% 200%',
      }}
      animate={{
        background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})`,
        opacity: prefersReducedMotion ? 1 : [0.95, 1, 0.95],
      }}
      transition={{
        background: { duration: 2, ease: 'easeInOut' },
        opacity: {
          duration: breathingDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      aria-hidden="true"
    >
      {/* Subtle mesh overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
          `,
        }}
      />
    </motion.div>
  );
}
