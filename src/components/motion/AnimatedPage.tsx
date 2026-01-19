'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SPRING, getMotionSafeTransition, getMotionSafeInitial, getMotionSafeExit } from '@/lib/motion/springs'

interface AnimatedPageProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={getMotionSafeInitial({ opacity: 0, y: 10 }, prefersReducedMotion)}
      animate={{ opacity: 1, y: 0 }}
      exit={getMotionSafeExit({ opacity: 0, y: -10 }, prefersReducedMotion)}
      transition={getMotionSafeTransition(SPRING.page, prefersReducedMotion)}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedPage
