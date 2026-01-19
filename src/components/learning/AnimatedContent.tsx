'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SPRING, getMotionSafeInitial, getMotionSafeExit } from '@/lib/motion/springs'
import type { ReactNode } from 'react'

interface AnimatedContentProps {
  /** Unique key for the content (e.g., atom.id) */
  contentKey: string
  children: ReactNode
  className?: string
  /** Direction of transition: 'forward' slides right-to-left, 'backward' slides left-to-right */
  direction?: 'forward' | 'backward'
}

/**
 * Wrapper component for smooth content transitions between atoms
 */
export function AnimatedContent({
  contentKey,
  children,
  className,
  direction = 'forward',
}: AnimatedContentProps) {
  const prefersReducedMotion = useReducedMotion()

  const xOffset = direction === 'forward' ? 40 : -40
  const exitOffset = direction === 'forward' ? -40 : 40

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={contentKey}
        initial={getMotionSafeInitial({ opacity: 0, x: xOffset, scale: 0.98 }, prefersReducedMotion)}
        animate={{
          opacity: 1,
          x: 0,
          scale: 1,
          transition: {
            ...SPRING.gentle,
            opacity: { duration: 0.2 },
            scale: { type: 'spring', stiffness: 350, damping: 30 }
          }
        }}
        exit={getMotionSafeExit({ opacity: 0, x: exitOffset, scale: 0.98 }, prefersReducedMotion)}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default AnimatedContent
