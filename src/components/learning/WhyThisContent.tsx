'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * WhyThisContent - Shows explanation for why content was selected
 *
 * Displays a lightbulb icon with reasoning text from the session builder.
 * Shows skill connection info and can be expanded for more details.
 *
 * Part of Phase 3-2: Intelligent Learn Page
 */

export interface WhyThisContentProps {
  /** Main reasoning text explaining why this content was selected */
  reason: string;
  /** Skill name that this content relates to */
  skillName?: string;
  /** Skill ID for linking */
  skillId?: string;
  /** Prerequisites skills that led to this selection */
  prerequisites?: string[];
  /** Current mastery level for this skill (0-100) */
  currentMastery?: number;
  /** Target mastery level */
  targetMastery?: number;
  /** Whether the component is expandable */
  expandable?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export function WhyThisContent({
  reason,
  skillName,
  skillId: _skillId,
  prerequisites = [],
  currentMastery,
  targetMastery = 85,
  expandable = true,
  size = 'md',
  className,
}: WhyThisContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = skillName || prerequisites.length > 0 || currentMastery !== undefined;

  const sizeClasses = {
    sm: {
      container: 'px-3 py-2 text-xs',
      icon: 'w-4 h-4',
      gap: 'gap-2',
    },
    md: {
      container: 'px-4 py-3 text-sm',
      icon: 'w-5 h-5',
      gap: 'gap-3',
    },
  };

  const styles = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200/50',
        styles.container,
        className
      )}
    >
      {/* Main row */}
      <div className={cn('flex items-start', styles.gap)}>
        {/* Lightbulb icon with subtle animation */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          }}
          className="flex-shrink-0 mt-0.5"
        >
          <Lightbulb className={cn(styles.icon, 'text-amber-500 fill-amber-200')} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-amber-800 leading-relaxed">{reason}</p>

          {/* Skill connection badge */}
          {skillName && (
            <div className="mt-2 flex items-center gap-1.5 text-amber-700/80">
              <Link2 className="w-3.5 h-3.5" />
              <span className="font-medium">Building:</span>
              <span className="text-amber-900">{skillName}</span>
            </div>
          )}
        </div>

        {/* Expand button */}
        {expandable && hasDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex-shrink-0 p-1 rounded hover:bg-amber-200/50 transition-colors',
              'text-amber-600 hover:text-amber-800'
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Show less details' : 'Show more details'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-amber-200/50 space-y-2">
              {/* Mastery progress */}
              {currentMastery !== undefined && (
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-xs uppercase tracking-wide font-medium">
                    Mastery Progress:
                  </span>
                  <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(currentMastery, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {currentMastery}% / {targetMastery}%
                  </span>
                </div>
              )}

              {/* Prerequisites */}
              {prerequisites.length > 0 && (
                <div className="text-xs text-amber-700">
                  <span className="uppercase tracking-wide font-medium">
                    Building on:
                  </span>
                  <span className="ml-1.5">
                    {prerequisites.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Compact version for inline use
 */
export function WhyThisContentInline({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 text-xs',
      'bg-amber-50 text-amber-700 rounded border border-amber-200/50',
      className
    )}>
      <Lightbulb className="w-3 h-3 text-amber-500 fill-amber-200" />
      <span className="truncate max-w-[200px]">{reason}</span>
    </div>
  );
}

export default WhyThisContent;
