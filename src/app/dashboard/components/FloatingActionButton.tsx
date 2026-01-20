/**
 * Floating Action Button
 *
 * Fixed-position primary CTA for continuing learning.
 * Shows pulse animation when idle to draw attention.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Z_INDEX } from '@/lib/design-tokens';

interface FloatingActionButtonProps {
  label: string;
  onClick: () => void;
  isNewUser?: boolean;
  className?: string;
}

export function FloatingActionButton({
  label,
  onClick,
  isNewUser = false,
  className,
}: FloatingActionButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Start pulse animation after 3 seconds of inactivity
  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = setTimeout(() => {
      setShowPulse(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  // Stop pulse on hover (handled in onMouseEnter callback instead of effect)

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      className={cn(
        'fixed bottom-6 right-6',
        'md:bottom-8 md:right-8',
        className
      )}
      style={{ zIndex: Z_INDEX.fixed }}
    >
      {/* Pulse rings */}
      <AnimatePresence>
        {showPulse && !isHovered && (
          <>
            <motion.div
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-teal"
            />
            <motion.div
              initial={{ opacity: 0.4, scale: 1 }}
              animate={{ opacity: 0, scale: 2.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-teal"
            />
          </>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={onClick}
        onMouseEnter={() => {
          setIsHovered(true);
          setShowPulse(false);
        }}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        className={cn(
          'relative flex items-center gap-3',
          'px-6 py-4 rounded-full',
          'font-semibold text-white',
          // Gradient background
          'bg-gradient-to-r from-teal to-teal-dark',
          // Shadow with glow
          'shadow-[0_8px_24px_rgba(33,168,176,0.4)]',
          // Hover state
          'hover:shadow-[0_12px_32px_rgba(33,168,176,0.5)]',
          'transition-shadow duration-300'
        )}
      >
        {/* Icon */}
        <motion.div
          animate={isHovered && !prefersReducedMotion ? { rotate: 360 } : {}}
          transition={{ duration: 0.5 }}
        >
          {isNewUser ? (
            <Sparkles size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </motion.div>

        {/* Label */}
        <span className="whitespace-nowrap">{label}</span>

        {/* Arrow */}
        <motion.div
          animate={isHovered && !prefersReducedMotion ? { x: 4 } : { x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight size={18} />
        </motion.div>
      </motion.button>
    </motion.div>
  );
}

export default FloatingActionButton;
