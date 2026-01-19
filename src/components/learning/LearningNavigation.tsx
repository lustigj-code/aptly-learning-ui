'use client'

import { CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Module } from '@/types'

interface LearningNavigationProps {
  module: Module
  currentLessonIndex: number
  completedLessonIds: string[]
  onSelectLesson: (index: number) => void
}

/**
 * LearningNavigation - Sidebar showing lesson progress within a module
 *
 * Extracted from CoachLearningView's ProgressSidebar for reusability
 * and to reduce the god component's size.
 */
export function LearningNavigation({
  module,
  currentLessonIndex,
  completedLessonIds,
  onSelectLesson,
}: LearningNavigationProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <nav
      className="w-64 bg-white/80 backdrop-blur-xl border-r border-grey/20 p-4 hidden lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
      role="navigation"
      aria-label="Lesson navigation"
    >
      <motion.h3
        className="text-xs font-semibold text-grey uppercase tracking-wide mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {module.title}
      </motion.h3>
      <motion.ul
        className="space-y-2"
        role="list"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {module.lessons.map((lesson, index) => {
          const isComplete = completedLessonIds.includes(lesson.id)
          const isCurrent = index === currentLessonIndex

          return (
            <motion.li
              key={lesson.id}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <motion.button
                onClick={() => onSelectLesson(index)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${lesson.title}${isComplete ? ' (completed)' : ''}${isCurrent ? ' (current)' : ''}`}
                className={cn(
                  'relative w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-3',
                  'min-h-[44px]',
                  isCurrent && 'bg-teal/10 text-teal font-medium shadow-sm',
                  isComplete && !isCurrent && 'text-green-600 hover:bg-green-50',
                  !isCurrent && !isComplete && 'text-rich-black/70 hover:bg-light-grey/80'
                )}
                whileHover={!prefersReducedMotion ? { x: 4, scale: 1.01 } : undefined}
                whileTap={!prefersReducedMotion ? { scale: 0.99 } : undefined}
                initial={false}
              >
                {/* Active indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal rounded-r-full"
                    layoutId="learningActiveIndicator"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                  </motion.div>
                ) : (
                  <motion.span
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200',
                      isCurrent ? 'border-teal bg-teal/20' : 'border-grey/40'
                    )}
                    aria-hidden="true"
                    whileHover={!prefersReducedMotion ? { scale: 1.1 } : undefined}
                  />
                )}
                <span className="truncate flex-1">{lesson.title}</span>
              </motion.button>
            </motion.li>
          )
        })}
      </motion.ul>
    </nav>
  )
}

export default LearningNavigation
