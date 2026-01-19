'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type AtomType = 'video' | 'reading' | 'quiz' | 'practice'

interface ContentSkeletonProps {
  type?: AtomType
  className?: string
}

/**
 * Shimmer effect for skeleton loading - iOS-style with subtle shine
 */
const shimmerClass = 'bg-light-grey relative overflow-hidden shimmer-enhanced'

/**
 * Content-aware loading skeleton that matches the shape of actual content
 */
export function ContentSkeleton({ type = 'reading', className }: ContentSkeletonProps) {
  switch (type) {
    case 'video':
      return (
        <motion.div
          className={cn('overflow-hidden', className)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Video aspect ratio container */}
          <div className={cn('aspect-video rounded-xl mb-4', shimmerClass)} />
          {/* Title skeleton */}
          <div className={cn('h-6 rounded w-3/4 mb-2', shimmerClass)} />
          {/* Duration skeleton */}
          <div className={cn('h-4 rounded w-24', shimmerClass)} />
        </motion.div>
      )

    case 'reading':
      return (
        <motion.div
          className={cn('max-w-3xl mx-auto overflow-hidden', className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="bg-grey/10 rounded-xl p-6 mb-6">
            <div className={cn('h-4 rounded w-20 mb-3', shimmerClass)} />
            <div className={cn('h-8 rounded w-2/3', shimmerClass)} />
          </div>
          {/* Content paragraphs with stagger */}
          <div className="space-y-4 px-6">
            {[100, 92, 80, 100, 75].map((width, i) => (
              <motion.div
                key={i}
                className={cn('h-4 rounded', shimmerClass)}
                style={{ width: `${width}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              />
            ))}
          </div>
        </motion.div>
      )

    case 'quiz':
      return (
        <motion.div
          className={cn('overflow-hidden', className)}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Progress indicator */}
          <div className="flex justify-between mb-6">
            <div className={cn('h-4 rounded w-32', shimmerClass)} />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className={cn('w-3 h-3 rounded-full', shimmerClass)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                />
              ))}
            </div>
          </div>
          {/* Question */}
          <div className={cn('h-6 rounded w-4/5 mb-6', shimmerClass)} />
          {/* Options with stagger */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={cn('h-14 rounded-lg', shimmerClass)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
        </motion.div>
      )

    case 'practice':
      return (
        <motion.div
          className={cn('flex flex-col items-center justify-center h-64 overflow-hidden', className)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={cn('w-16 h-16 rounded-full mb-4', shimmerClass)} />
          <div className={cn('h-6 rounded w-48 mb-2', shimmerClass)} />
          <div className={cn('h-4 rounded w-64', shimmerClass)} />
        </motion.div>
      )

    default:
      return (
        <div className={cn('animate-pulse', className)}>
          <div className="h-8 bg-grey/20 rounded w-3/4 mb-4" />
          <div className="h-4 bg-grey/20 rounded w-full mb-2" />
          <div className="h-4 bg-grey/20 rounded w-5/6" />
        </div>
      )
  }
}

export default ContentSkeleton
