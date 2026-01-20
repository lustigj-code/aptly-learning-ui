'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Star,
  Zap,
  BookOpen,
  Target,
  Award,
  PartyPopper,
  X,
} from 'lucide-react';
import {
  useCelebrationStore,
  CELEBRATION_CONFIGS,
  XP_REWARDS,
  getTierForEvent,
  getRandomMessage,
  type CelebrationQueueItem,
} from '@/store/celebrationStore';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { CelebrationEvent, Badge } from '@/types';
import { Z_INDEX } from '@/lib/design-tokens';

// ============================================
// CONFETTI HELPERS
// ============================================

function fireConfetti(tier: number, colors: string[], reducedMotion: boolean) {
  if (reducedMotion) return;

  const config = CELEBRATION_CONFIGS[tier as 1 | 2 | 3 | 4 | 5];
  const count = config.confettiCount;

  // Basic burst
  confetti({
    particleCount: count,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    disableForReducedMotion: true,
  });

  // For higher tiers, add more effects
  if (tier >= 3) {
    setTimeout(() => {
      confetti({
        particleCount: count / 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: count / 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 400);
  }

  // For tier 5 (epic celebrations), add fireworks effect
  if (tier >= 5) {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() - 0.2 },
        colors,
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() - 0.2 },
        colors,
      });
    }, 250);
  }
}

// ============================================
// ICON MAPPING
// ============================================

const eventIcons: Record<CelebrationEvent['type'], React.ReactNode> = {
  'correct-answer': <Zap className="w-8 h-8" />,
  'quiz-passed': <Target className="w-8 h-8" />,
  'atom-complete': <BookOpen className="w-8 h-8" />,
  'lesson-complete': <BookOpen className="w-8 h-8" />,
  'module-complete': <Award className="w-8 h-8" />,
  'course-complete': <Trophy className="w-8 h-8" />,
  'streak-milestone': <Flame className="w-8 h-8" />,
  'badge-unlock': <Trophy className="w-8 h-8" />,
  'comeback': <PartyPopper className="w-8 h-8" />,
};

const tierGradients: Record<number, string> = {
  1: 'from-teal to-muted-teal',
  2: 'from-teal to-yellow',
  3: 'from-yellow to-orange-400',
  4: 'from-orange-400 to-purple',
  5: 'from-purple via-pink-500 to-yellow',
};

// ============================================
// CELEBRATION OVERLAY
// ============================================

function CelebrationOverlay({ item }: { item: CelebrationQueueItem }) {
  const { dismissCelebration, reducedMotion } = useCelebrationStore();
  const hasPlayedRef = useRef(false);

  const { event, badge } = item;
  const config = CELEBRATION_CONFIGS[event.tier];
  const gradient = tierGradients[event.tier];

  // Play confetti on mount
  useEffect(() => {
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      fireConfetti(event.tier, config.colors, reducedMotion);
    }
  }, [event.tier, config.colors, reducedMotion]);

  // Auto-dismiss after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      dismissCelebration();
    }, config.duration);

    return () => clearTimeout(timeout);
  }, [config.duration, dismissCelebration]);

  // Show minimal overlay for tier 1-2, full modal for tier 3+
  if (event.tier <= 2) {
    return null; // Toast only for small celebrations
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-navy/60 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.celebrationModal }}
      onClick={dismissCelebration}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 opacity-10 bg-gradient-to-br',
            gradient
          )}
        />

        {/* Close button */}
        <button
          onClick={dismissCelebration}
          className="absolute top-4 right-4 text-rich-black/40 hover:text-rich-black transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white bg-gradient-to-br',
              gradient
            )}
          >
            {badge ? (
              <Trophy className="w-10 h-10" />
            ) : (
              eventIcons[event.type]
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-navy mb-2"
          >
            {badge ? badge.title : event.message}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-rich-black/60 mb-4"
          >
            {badge ? badge.description : getSubtitle(event.type)}
          </motion.p>

          {/* XP earned */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow/20 rounded-full"
          >
            <Zap className="w-5 h-5 text-yellow-dark" />
            <span className="font-bold text-yellow-dark">+{event.xpEarned} XP</span>
          </motion.div>

          {/* Dismiss button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={dismissCelebration}
            className={cn(
              'w-full mt-6 py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r transition-all hover:shadow-lg',
              gradient
            )}
          >
            {event.tier >= 4 ? 'Continue Learning' : 'Awesome!'}
          </motion.button>
        </div>

        {/* Stars decoration */}
        {event.tier >= 4 && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute top-8 left-8"
            >
              <Star className="w-6 h-6 text-yellow fill-yellow" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-12 right-8"
            >
              <Star className="w-4 h-4 text-yellow fill-yellow" />
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function getSubtitle(type: CelebrationEvent['type']): string {
  switch (type) {
    case 'lesson-complete':
      return 'You\'ve completed another lesson. Keep up the momentum!';
    case 'module-complete':
      return 'A whole module done! You\'re making incredible progress.';
    case 'course-complete':
      return 'Congratulations on completing the course! Time to celebrate!';
    case 'streak-milestone':
      return 'Your consistency is paying off. Keep the streak alive!';
    case 'badge-unlock':
      return 'You\'ve earned a new achievement badge!';
    default:
      return 'Great work! Keep learning!';
  }
}

// ============================================
// MAIN PROVIDER
// ============================================

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const {
    currentCelebration,
    isShowingCelebration,
    reducedMotion,
    dismissCelebration,
  } = useCelebrationStore();

  const toast = useToast();
  const lastToastIdRef = useRef<string | null>(null);

  // Show toast for all celebrations
  useEffect(() => {
    if (currentCelebration && currentCelebration.id !== lastToastIdRef.current) {
      lastToastIdRef.current = currentCelebration.id;
      const { event, badge } = currentCelebration;

      // For lower tier celebrations, use toast only
      if (event.tier <= 2) {
        switch (event.type) {
          case 'correct-answer':
          case 'atom-complete':
            toast.success(event.message || 'Great job!', `+${event.xpEarned} XP`);
            break;
          case 'quiz-passed':
            toast.success(event.message || 'Quiz passed!', `+${event.xpEarned} XP`);
            break;
          default:
            toast.success(event.message || 'Achievement!', `+${event.xpEarned} XP`);
        }

        // Small confetti for tier 2
        if (event.tier === 2 && !reducedMotion) {
          fireConfetti(2, CELEBRATION_CONFIGS[2].colors, reducedMotion);
        }

        // Auto dismiss immediately for low tier
        dismissCelebration();
      } else {
        // For badge unlocks specifically
        if (event.type === 'badge-unlock' && badge) {
          toast.badge(badge.title, badge.description);
        }
      }
    }
  }, [currentCelebration, toast, reducedMotion, dismissCelebration]);

  return (
    <>
      {children}

      {/* Celebration overlay for tier 3+ */}
      <AnimatePresence>
        {isShowingCelebration && currentCelebration && currentCelebration.event.tier >= 3 && (
          <CelebrationOverlay item={currentCelebration} />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// HOOK FOR TRIGGERING CELEBRATIONS
// ============================================

export function useCelebration() {
  const addCelebration = useCelebrationStore((state) => state.addCelebration);
  const toast = useToast();

  const celebrate = useCallback(
    (type: CelebrationEvent['type'], xpOverride?: number, badge?: Badge) => {
      // Import at module level to avoid dynamic require
      const tier = getTierForEvent(type);
      const xp = xpOverride ?? XP_REWARDS[type] ?? 0;
      const message = getRandomMessage(type);

      const event: CelebrationEvent = {
        type,
        tier,
        xpEarned: xp,
        message,
        badgeId: badge?.id,
      };

      addCelebration(event, badge);
    },
    [addCelebration]
  );

  const celebrateBadge = useCallback(
    (badge: Badge) => {
      celebrate('badge-unlock', 75, badge);
    },
    [celebrate]
  );

  const celebrateStreak = useCallback(
    (streakCount: number) => {
      // Calculate bonus XP for streak milestones
      let bonusXp = 50;
      if (streakCount >= 100) bonusXp = 500;
      else if (streakCount >= 30) bonusXp = 200;
      else if (streakCount >= 7) bonusXp = 100;

      const event: CelebrationEvent = {
        type: 'streak-milestone',
        tier: streakCount >= 30 ? 4 : streakCount >= 7 ? 3 : 2,
        xpEarned: bonusXp,
        message: `${streakCount} Day Streak!`,
      };

      addCelebration(event);
      toast.streak(streakCount);
    },
    [addCelebration, toast]
  );

  const celebrateXp = useCallback(
    (amount: number) => {
      toast.xp(amount);
    },
    [toast]
  );

  const celebrateCorrectAnswer = useCallback(() => {
    celebrate('correct-answer');
  }, [celebrate]);

  const celebrateQuizPassed = useCallback(
    (score: number) => {
      const bonusXp = score === 100 ? 100 : 50;
      celebrate('quiz-passed', bonusXp);
    },
    [celebrate]
  );

  const celebrateLessonComplete = useCallback(() => {
    celebrate('lesson-complete');
  }, [celebrate]);

  const celebrateModuleComplete = useCallback(() => {
    celebrate('module-complete');
  }, [celebrate]);

  const celebrateCourseComplete = useCallback(() => {
    celebrate('course-complete');
  }, [celebrate]);

  return {
    celebrate,
    celebrateBadge,
    celebrateStreak,
    celebrateXp,
    celebrateCorrectAnswer,
    celebrateQuizPassed,
    celebrateLessonComplete,
    celebrateModuleComplete,
    celebrateCourseComplete,
  };
}
