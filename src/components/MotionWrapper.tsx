'use client';

import dynamic from 'next/dynamic';
import { ComponentProps, ReactNode } from 'react';

// Dynamically import framer-motion components with SSR disabled
// This prevents useContext errors during prerendering
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

const MotionSection = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.section),
  { ssr: false }
);

const MotionSpan = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.span),
  { ssr: false }
);

const MotionButton = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.button),
  { ssr: false }
);

const MotionAside = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.aside),
  { ssr: false }
);

export { MotionDiv, MotionSection, MotionSpan, MotionButton, MotionAside };

// Re-export AnimatePresence with SSR disabled
export const AnimatePresenceWrapper = dynamic(
  () => import('framer-motion').then((mod) => {
    const AP = mod.AnimatePresence;
    return function AnimatePresenceComponent({ children, ...props }: { children: ReactNode; mode?: 'sync' | 'wait' | 'popLayout' }) {
      return <AP {...props}>{children}</AP>;
    };
  }),
  { ssr: false }
);
