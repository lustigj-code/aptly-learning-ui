'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SPRING } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Lightbulb,
  BookOpen,
  X,
  Minimize2,
  Sparkles,
} from 'lucide-react';

export type SageHUDState = 'pulse' | 'thought' | 'intervention' | 'consciousness';

export interface SageHUDProps {
  state: SageHUDState;
  onStateChange?: (state: SageHUDState) => void;
  interventionMessage?: string;
  interventionType?: 'hint' | 'explanation';
  onInterventionAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const stateVariants = {
  pulse: {
    width: 40,
    height: 40,
    borderRadius: 9999,
  },
  thought: {
    width: 120,
    height: 40,
    borderRadius: 9999,
  },
  intervention: {
    width: 280,
    height: 64,
    borderRadius: 9999,
  },
  consciousness: {
    width: 400,
    height: 600,
    borderRadius: 24,
  },
};

export function SageHUD({
  state,
  onStateChange,
  interventionMessage = 'Need a hint?',
  interventionType = 'hint',
  onInterventionAction,
  children,
  className,
}: SageHUDProps) {
  // Initialize with lazy callback to avoid setState in effect
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Subscribe to changes only
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const transition = prefersReducedMotion ? SPRING.none : SPRING.card;

  return (
    <motion.div
      layoutId="sage-container"
      className={cn(
        'sage-hud fixed z-50',
        'backdrop-blur-[24px] saturate-[180%]',
        'bg-white/75 dark:bg-gray-900/75',
        'border border-white/15 dark:border-gray-700/15',
        'shadow-[0px_20px_40px_rgba(0,0,0,0.25)]',
        // Positioning
        'bottom-6 right-6',
        'md:bottom-8 md:right-8',
        // Mobile center positioning for larger states
        state === 'consciousness' && 'max-md:left-1/2 max-md:-translate-x-1/2',
        className
      )}
      animate={stateVariants[state]}
      transition={transition}
    >
      <AnimatePresence mode="wait">
        {state === 'pulse' && (
          <PulseContent
            key="pulse"
            onClick={() => onStateChange?.('consciousness')}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
        {state === 'thought' && (
          <ThoughtContent key="thought" prefersReducedMotion={prefersReducedMotion} />
        )}
        {state === 'intervention' && (
          <InterventionContent
            key="intervention"
            message={interventionMessage}
            type={interventionType}
            onAction={onInterventionAction}
            onDismiss={() => onStateChange?.('pulse')}
          />
        )}
        {state === 'consciousness' && (
          <ConsciousnessContent
            key="consciousness"
            onMinimize={() => onStateChange?.('pulse')}
          >
            {children}
          </ConsciousnessContent>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// PULSE CONTENT (40px breathing circle)
// ============================================

interface PulseContentProps {
  onClick: () => void;
  prefersReducedMotion: boolean;
}

function PulseContent({ onClick, prefersReducedMotion }: PulseContentProps) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full h-full flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 rounded-full"
      animate={
        prefersReducedMotion
          ? {}
          : {
              scale: [1, 1.05, 1],
            }
      }
      transition={
        prefersReducedMotion
          ? SPRING.none
          : {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
      whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
      aria-label="Open Sage coach"
    >
      <Sparkles className="w-5 h-5 text-teal dark:text-teal-light" />
    </motion.button>
  );
}

// ============================================
// THOUGHT CONTENT (120px pill with waveform)
// ============================================

interface ThoughtContentProps {
  prefersReducedMotion: boolean;
}

function ThoughtContent({ prefersReducedMotion }: ThoughtContentProps) {
  const bars = [0.4, 0.6, 0.8, 0.6, 0.4];

  return (
    <div className="w-full h-full flex items-center justify-center gap-1 px-4">
      {bars.map((baseHeight, index) => (
        <motion.div
          key={index}
          className="w-1 bg-teal dark:bg-blue-400 rounded-full"
          animate={
            prefersReducedMotion
              ? { height: `${baseHeight * 100}%` }
              : {
                  height: [
                    `${baseHeight * 50}%`,
                    `${baseHeight * 100}%`,
                    `${baseHeight * 50}%`,
                  ],
                }
          }
          transition={
            prefersReducedMotion
              ? SPRING.none
              : {
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.1,
                }
          }
        />
      ))}
      <span className="ml-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
        Sage is thinking...
      </span>
    </div>
  );
}

// ============================================
// INTERVENTION CONTENT (280x64 pill)
// ============================================

interface InterventionContentProps {
  message: string;
  type: 'hint' | 'explanation';
  onAction?: () => void;
  onDismiss: () => void;
}

function InterventionContent({
  message,
  type,
  onAction,
  onDismiss,
}: InterventionContentProps) {
  const Icon = type === 'hint' ? Lightbulb : BookOpen;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-between px-4 gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {message}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onAction && (
          <button
            onClick={onAction}
            className="px-3 py-1 text-xs font-medium text-teal dark:text-teal-light hover:bg-light-teal dark:hover:bg-teal/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {type === 'hint' ? 'Show hint' : 'Explain'}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Dismiss intervention"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// CONSCIOUSNESS CONTENT (400x600 panel)
// ============================================

interface ConsciousnessContentProps {
  onMinimize: () => void;
  children?: React.ReactNode;
}

function ConsciousnessContent({ onMinimize, children }: ConsciousnessContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal dark:text-teal-light" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Sage Coach
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal"
            aria-label="Minimize coach"
          >
            <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children || (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <div className="space-y-3">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hi! I&apos;m Sage, your learning coach.
                <br />
                How can I help you today?
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
