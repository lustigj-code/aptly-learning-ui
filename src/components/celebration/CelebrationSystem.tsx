'use client';

import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, Trophy, Sparkles, Zap, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING, getMotionSafeTransition } from '@/lib/motion/springs';
import { Z_INDEX } from '@/lib/design-tokens';
import type { CelebrationTier, CharacterMood, CharacterName, Badge } from '@/types';

// Celebration configuration for each tier
type CelebrationConfig = {
  confetti: {
    particleCount: number;
    spread: number;
    startVelocity?: number;
    decay?: number;
    scalar?: number;
    shapes?: confetti.Shape[];
    colors?: string[];
    origin?: { x: number; y: number };
  } | null;
  xpRange: [number, number];
  duration: number;
  sound?: string;
  showOverlay: boolean;
  character?: {
    name: CharacterName;
    mood: CharacterMood;
  };
  title?: string;
  subtitle?: string;
};

const CELEBRATION_CONFIGS: Record<CelebrationTier, CelebrationConfig> = {
  1: {
    // Correct answer - subtle
    confetti: null,
    xpRange: [5, 10],
    duration: 1500,
    showOverlay: false,
  },
  2: {
    // Quiz passed - moderate
    confetti: {
      particleCount: 50,
      spread: 60,
      startVelocity: 30,
      colors: ['#21A8B0', '#FFDE00', '#88B644'],
    },
    xpRange: [25, 50],
    duration: 2500,
    showOverlay: true,
    character: { name: 'squirrel', mood: 'celebrating' },
    title: 'Quiz Passed!',
    subtitle: 'Great job on that quiz!',
  },
  3: {
    // Lesson complete - larger
    confetti: {
      particleCount: 80,
      spread: 100,
      startVelocity: 40,
      colors: ['#21A8B0', '#FFDE00', '#88B644', '#3B336E'],
    },
    xpRange: [50, 100],
    duration: 3000,
    showOverlay: true,
    character: { name: 'cat', mood: 'proud' },
    title: 'Lesson Complete!',
    subtitle: 'You\'re making great progress!',
  },
  4: {
    // Module complete - major
    confetti: {
      particleCount: 150,
      spread: 180,
      startVelocity: 45,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#21A8B0', '#FFDE00', '#88B644', '#3B336E', '#0A004A'],
    },
    xpRange: [150, 200],
    duration: 4000,
    showOverlay: true,
    character: { name: 'dog', mood: 'excited' },
    title: 'Module Complete!',
    subtitle: 'Amazing achievement!',
  },
  5: {
    // Course complete - epic
    confetti: {
      particleCount: 300,
      spread: 360,
      startVelocity: 55,
      decay: 0.95,
      scalar: 1.5,
      shapes: ['circle', 'square'],
      colors: ['#21A8B0', '#FFDE00', '#88B644', '#3B336E', '#0A004A', '#FFFFFF'],
    },
    xpRange: [400, 500],
    duration: 6000,
    showOverlay: true,
    character: { name: 'owl', mood: 'impressed' },
    title: 'Course Complete!',
    subtitle: 'You\'ve earned your certification badge!',
  },
};

type CelebrationEvent = {
  id: string;
  tier: CelebrationTier;
  xp: number;
  message?: string;
  badgeId?: string;
  badge?: Badge;
  type?: 'achievement' | 'streak' | 'xp' | 'lesson' | 'module' | 'course';
};

type CelebrationContextValue = {
  celebrate: (tier: CelebrationTier, customMessage?: string, badgeId?: string) => void;
  celebrateBadge: (badge: Badge, xp?: number) => void;
  celebrateStreak: (days: number) => void;
  celebrateXP: (amount: number) => void;
  isActive: boolean;
};

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}

type CelebrationProviderProps = {
  children: React.ReactNode;
};

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [activeEvent, setActiveEvent] = useState<CelebrationEvent | null>(null);
  const [floatingXPs, setFloatingXPs] = useState<{ id: string; xp: number; x: number; y: number }[]>([]);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const addFloatingXP = useCallback((xp: number) => {
    const xpId = `xp-${Date.now()}`;
    setFloatingXPs((prev) => [
      ...prev,
      {
        id: xpId,
        xp,
        x: Math.random() * 60 + 20, // 20-80% from left
        y: 40 + Math.random() * 20, // 40-60% from top
      },
    ]);

    // Remove floating XP after animation
    setTimeout(() => {
      setFloatingXPs((prev) => prev.filter((f) => f.id !== xpId));
    }, 1500);
  }, []);

  const celebrate = useCallback((tier: CelebrationTier, customMessage?: string, badgeId?: string) => {
    const config = CELEBRATION_CONFIGS[tier];
    const xp = Math.floor(Math.random() * (config.xpRange[1] - config.xpRange[0] + 1)) + config.xpRange[0];

    const event: CelebrationEvent = {
      id: `celebration-${Date.now()}`,
      tier,
      xp,
      message: customMessage,
      badgeId,
    };

    // Fire confetti if configured (skip for reduced motion)
    if (config.confetti && !prefersReducedMotion) {
      fireConfetti(config.confetti, tier);
    }

    // Add floating XP (skip for reduced motion)
    if (!prefersReducedMotion) {
      addFloatingXP(xp);
    }

    // Show overlay for tier 2+
    if (config.showOverlay) {
      setActiveEvent(event);

      // Auto-dismiss after duration
      setTimeout(() => {
        setActiveEvent(null);
      }, config.duration);
    }
  }, [addFloatingXP, prefersReducedMotion]);

  // Badge celebration with specific badge info
  const celebrateBadge = useCallback((badge: Badge, xp: number = 75) => {
    const event: CelebrationEvent = {
      id: `badge-${Date.now()}`,
      tier: 3, // Badges are tier 3 celebrations
      xp,
      message: `Badge Earned: ${badge.title}`,
      badgeId: badge.id,
      badge,
      type: 'achievement',
    };

    // Fire confetti (skip for reduced motion)
    if (!prefersReducedMotion) {
      fireConfetti(CELEBRATION_CONFIGS[3].confetti, 3);
    }

    // Add floating XP (skip for reduced motion)
    if (!prefersReducedMotion) {
      addFloatingXP(xp);
    }

    // Show overlay
    setActiveEvent(event);

    // Auto-dismiss after duration
    setTimeout(() => {
      setActiveEvent(null);
    }, 4000);
  }, [addFloatingXP, prefersReducedMotion]);

  // Streak celebration
  const celebrateStreak = useCallback((days: number) => {
    setStreakDays(days);
    setShowStreakCelebration(true);

    // Fire confetti (positioned to content area) - skip for reduced motion
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: getContentCenterX(), y: 0.6 },
        colors: ['#FFDE00', '#21A8B0', '#88B644'],
        zIndex: Z_INDEX.celebration,
      });
    }
  }, [prefersReducedMotion]);

  // Simple XP celebration (no overlay)
  const celebrateXP = useCallback((amount: number) => {
    // Skip floating XP for reduced motion
    if (!prefersReducedMotion) {
      addFloatingXP(amount);
    }

    // Small confetti burst for larger XP gains - skip for reduced motion
    if (amount >= 50 && !prefersReducedMotion) {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { x: getContentCenterX(), y: 0.7 },
        colors: ['#21A8B0', '#FFDE00'],
        zIndex: Z_INDEX.celebration,
      });
    }
  }, [addFloatingXP, prefersReducedMotion]);

  const isActive = !!activeEvent || showStreakCelebration;

  return (
    <CelebrationContext.Provider value={{ celebrate, celebrateBadge, celebrateStreak, celebrateXP, isActive }}>
      {children}

      {/* Floating XP indicators */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: Z_INDEX.celebration }}>
        <AnimatePresence>
          {floatingXPs.map((floatingXP) => (
            <motion.div
              key={floatingXP.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -50 }}
              transition={getMotionSafeTransition(SPRING.gentle, prefersReducedMotion)}
              className="absolute text-teal font-bold text-2xl"
              style={{
                left: `${floatingXP.x}%`,
                top: `${floatingXP.y}%`,
              }}
            >
              +{floatingXP.xp} XP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {activeEvent && (
          <CelebrationOverlay
            event={activeEvent}
            onDismiss={() => setActiveEvent(null)}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
      </AnimatePresence>

      {/* Streak celebration */}
      <StreakCelebration
        show={showStreakCelebration}
        days={streakDays}
        onDismiss={() => setShowStreakCelebration(false)}
        prefersReducedMotion={prefersReducedMotion}
      />
    </CelebrationContext.Provider>
  );
}

// Get the current sidebar width from the DOM or use default
function getSidebarWidth(): number {
  if (typeof window === 'undefined') return 280;
  // Check if sidebar is collapsed by looking at its actual width
  const sidebar = document.querySelector('aside');
  if (sidebar) {
    const rect = sidebar.getBoundingClientRect();
    return rect.width;
  }
  return 280; // Default expanded width
}

// Calculate confetti origin X to account for sidebar
function getContentCenterX(): number {
  if (typeof window === 'undefined') return 0.5;
  const sidebarWidth = getSidebarWidth();
  const viewportWidth = window.innerWidth;
  const contentWidth = viewportWidth - sidebarWidth;
  const contentCenterX = sidebarWidth + contentWidth / 2;
  return contentCenterX / viewportWidth;
}

// Get random X position within content area
function getRandomContentX(): number {
  if (typeof window === 'undefined') return Math.random();
  const sidebarWidth = getSidebarWidth();
  const viewportWidth = window.innerWidth;
  const minX = sidebarWidth / viewportWidth;
  const maxX = 1;
  return minX + Math.random() * (maxX - minX);
}

function fireConfetti(config: CelebrationConfig['confetti'], tier: CelebrationTier) {
  if (!config) return;

  const contentCenterX = getContentCenterX();

  const defaults = {
    origin: { x: contentCenterX, y: 0.7 },
    zIndex: Z_INDEX.celebration,
    ...config,
  };

  if (tier >= 4) {
    // For major celebrations, fire multiple bursts (reduced count)
    const count = tier === 5 ? 2 : 2;
    const interval = 300;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        confetti({
          ...defaults,
          origin: { x: getRandomContentX(), y: Math.random() * 0.4 + 0.3 },
        });
      }, i * interval);
    }
  } else {
    // Single burst for smaller celebrations
    confetti(defaults);
  }
}

type CelebrationOverlayProps = {
  event: CelebrationEvent;
  onDismiss: () => void;
  prefersReducedMotion: boolean;
};

function CelebrationOverlay({ event, onDismiss, prefersReducedMotion }: CelebrationOverlayProps) {
  const config = CELEBRATION_CONFIGS[event.tier];
  const isBadgeCelebration = event.type === 'achievement' && event.badge;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getMotionSafeTransition(SPRING.modal, prefersReducedMotion)}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.celebration }}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={getMotionSafeTransition(SPRING.modal, prefersReducedMotion)}
        className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
      />

      {/* Content */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
        transition={getMotionSafeTransition(SPRING.bouncy, prefersReducedMotion)}
        className="relative bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge Icon for badge celebrations */}
        {isBadgeCelebration ? (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={getMotionSafeTransition(
              { delay: 0.1, type: 'spring', bounce: 0.4, damping: 25 },
              prefersReducedMotion
            )}
            className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow to-teal flex items-center justify-center"
          >
            <Trophy size={48} className="text-white" />
          </motion.div>
        ) : (
          /* Icon for non-badge celebrations */
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={getMotionSafeTransition(
              { delay: 0.1, type: 'spring', bounce: 0.4, damping: 25 },
              prefersReducedMotion
            )}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal to-purple flex items-center justify-center"
          >
            <Sparkles size={40} className="text-white" />
          </motion.div>
        )}

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionSafeTransition({ delay: 0.15 }, prefersReducedMotion)}
          className="h2 text-navy mb-2"
        >
          {isBadgeCelebration ? 'Badge Earned!' : (event.message || config.title)}
        </motion.h2>

        {/* Badge specific subtitle */}
        {isBadgeCelebration && event.badge ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={getMotionSafeTransition({ delay: 0.2 }, prefersReducedMotion)}
            className="mb-6"
          >
            <p className="text-xl font-semibold text-teal mb-1">{event.badge.title}</p>
            <p className="text-rich-black/60">{event.badge.description}</p>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={getMotionSafeTransition({ delay: 0.2 }, prefersReducedMotion)}
            className="text-rich-black/60 mb-6"
          >
            {config.subtitle}
          </motion.p>
        )}

        {/* XP earned */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={getMotionSafeTransition(
            { delay: 0.25, type: 'spring', bounce: 0.3, damping: 25 },
            prefersReducedMotion
          )}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xl',
            event.tier >= 4 || isBadgeCelebration
              ? 'bg-gradient-to-r from-yellow to-teal text-white'
              : 'bg-teal/20 text-teal'
          )}
        >
          <Sparkles size={24} />
          +{event.xp} XP
        </motion.div>

        {/* Achievement badge display for tier 5 (non-badge celebrations) */}
        {event.tier === 5 && event.badgeId && !isBadgeCelebration && (
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getMotionSafeTransition({ delay: 0.3 }, prefersReducedMotion)}
            className="mt-6 p-4 bg-gradient-to-r from-purple/10 to-navy/10 rounded-2xl"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow to-teal flex items-center justify-center">
                <Trophy size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm text-rich-black/60">Badge Unlocked!</p>
                <p className="font-semibold text-navy">Course Completion Badge</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={getMotionSafeTransition({ delay: 0.35 }, prefersReducedMotion)}
          onClick={onDismiss}
          className="mt-6 w-full py-3 px-6 bg-navy text-white font-medium rounded-xl hover:bg-navy-light transition-colors"
        >
          {isBadgeCelebration ? 'Awesome!' : 'Continue Learning'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// Quick celebration component for inline use (tier 1)
type QuickCelebrationProps = {
  show: boolean;
  isCorrect: boolean;
  xp?: number;
  className?: string;
};

export function QuickCelebration({ show, isCorrect, xp = 10, className }: QuickCelebrationProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -10 }}
          transition={getMotionSafeTransition(SPRING.snappy, prefersReducedMotion)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full font-medium',
            isCorrect ? 'bg-success/20 text-success' : 'bg-error/20 text-error',
            className
          )}
        >
          {isCorrect ? (
            <>
              <Star size={16} className="fill-current" />
              <span>Correct! +{xp} XP</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>Not quite, try again!</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Streak celebration component
type StreakCelebrationProps = {
  show: boolean;
  days: number;
  onDismiss: () => void;
  prefersReducedMotion: boolean;
};

export function StreakCelebration({ show, days, onDismiss, prefersReducedMotion }: StreakCelebrationProps) {
  useEffect(() => {
    // Skip confetti for reduced motion
    if (show && !prefersReducedMotion) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFDE00', '#21A8B0', '#88B644'],
      });
    }
  }, [show, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getMotionSafeTransition(SPRING.modal, prefersReducedMotion)}
          className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.celebration }}
          onClick={onDismiss}
        >
          <motion.div
            className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
          />

          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            transition={getMotionSafeTransition(SPRING.bouncy, prefersReducedMotion)}
            className="relative bg-gradient-to-br from-yellow to-teal rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
              transition={prefersReducedMotion ? {} : { repeat: 2, duration: 0.5 }}
              className="w-16 h-16 mx-auto mb-4 bg-yellow rounded-2xl flex items-center justify-center"
            >
              <Flame size={32} className="text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              {days} Day Streak!
            </h2>

            <p className="text-white/80 mb-6">
              {days % 7 === 0
                ? "Wow! A full week of learning!"
                : "Keep it going, you're on fire!"}
            </p>

            <button
              onClick={onDismiss}
              className="w-full py-3 px-6 bg-white text-navy font-medium rounded-xl hover:bg-white/90 transition-colors"
            >
              Keep Going!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
