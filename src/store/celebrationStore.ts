'use client';

import { create } from 'zustand';
import type { CelebrationEvent, CelebrationTier, Badge } from '@/types';

// ============================================
// TYPES
// ============================================

export type CelebrationQueueItem = {
  id: string;
  event: CelebrationEvent;
  badge?: Badge;
  timestamp: Date;
};

type CelebrationState = {
  queue: CelebrationQueueItem[];
  isShowingCelebration: boolean;
  currentCelebration: CelebrationQueueItem | null;
  soundEnabled: boolean;
  reducedMotion: boolean;
};

type CelebrationActions = {
  addCelebration: (event: CelebrationEvent, badge?: Badge) => void;
  showNextCelebration: () => void;
  dismissCelebration: () => void;
  clearQueue: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
};

type CelebrationStore = CelebrationState & CelebrationActions;

// ============================================
// CELEBRATION CONFIGS
// ============================================

export const CELEBRATION_CONFIGS: Record<CelebrationTier, {
  confettiCount: number;
  duration: number;
  soundEffect?: string;
  colors: string[];
}> = {
  1: {
    confettiCount: 30,
    duration: 2000,
    colors: ['#22B8B0', '#B8E8E4'], // teal colors
  },
  2: {
    confettiCount: 60,
    duration: 3000,
    colors: ['#22B8B0', '#FFD93D', '#B8E8E4'],
  },
  3: {
    confettiCount: 100,
    duration: 4000,
    soundEffect: 'success',
    colors: ['#22B8B0', '#FFD93D', '#8B5CF6', '#B8E8E4'],
  },
  4: {
    confettiCount: 150,
    duration: 5000,
    soundEffect: 'celebration',
    colors: ['#22B8B0', '#FFD93D', '#8B5CF6', '#F97316', '#EC4899'],
  },
  5: {
    confettiCount: 300,
    duration: 7000,
    soundEffect: 'fanfare',
    colors: ['#22B8B0', '#FFD93D', '#8B5CF6', '#F97316', '#EC4899', '#10B981'],
  },
};

// XP rewards per event type
export const XP_REWARDS: Record<CelebrationEvent['type'], number> = {
  'correct-answer': 10,
  'quiz-passed': 50,
  'atom-complete': 25,
  'lesson-complete': 100,
  'module-complete': 250,
  'course-complete': 500,
  'streak-milestone': 50,
  'badge-unlock': 75,
  'comeback': 25,
};

// Messages per event type
export const CELEBRATION_MESSAGES: Record<CelebrationEvent['type'], string[]> = {
  'correct-answer': [
    'Nailed it!',
    'You got it!',
    'Correct!',
    'Perfect!',
    'Spot on!',
  ],
  'quiz-passed': [
    'Quiz complete!',
    'Great job on the quiz!',
    'You crushed that quiz!',
    'Quiz mastered!',
  ],
  'atom-complete': [
    'Lesson chunk complete!',
    'Keep going!',
    'Nice progress!',
    'You\'re learning fast!',
  ],
  'lesson-complete': [
    'Lesson complete!',
    'You finished the lesson!',
    'Another lesson down!',
    'Knowledge unlocked!',
  ],
  'module-complete': [
    'Module mastered!',
    'Big achievement!',
    'Module complete!',
    'Incredible progress!',
  ],
  'course-complete': [
    'Course complete!',
    'You did it!',
    'Certification milestone!',
    'Course mastered!',
  ],
  'streak-milestone': [
    'Streak milestone!',
    'You\'re on fire!',
    'Consistency pays off!',
    'Keep the streak alive!',
  ],
  'badge-unlock': [
    'Badge earned!',
    'New achievement!',
    'Achievement unlocked!',
    'You earned a badge!',
  ],
  'comeback': [
    'Welcome back!',
    'Great to see you!',
    'Let\'s get learning!',
    'Ready to continue?',
  ],
};

// ============================================
// STORE
// ============================================

export const useCelebrationStore = create<CelebrationStore>((set, get) => ({
  // Initial state
  queue: [],
  isShowingCelebration: false,
  currentCelebration: null,
  soundEnabled: true,
  reducedMotion: false,

  // Actions
  addCelebration: (event, badge) => {
    const id = `celebration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: CelebrationQueueItem = {
      id,
      event,
      badge,
      timestamp: new Date(),
    };

    set((state) => ({
      queue: [...state.queue, item],
    }));

    // If not currently showing a celebration, show this one
    const { isShowingCelebration } = get();
    if (!isShowingCelebration) {
      get().showNextCelebration();
    }
  },

  showNextCelebration: () => {
    const { queue } = get();
    if (queue.length === 0) {
      set({ isShowingCelebration: false, currentCelebration: null });
      return;
    }

    const [next, ...rest] = queue;
    set({
      queue: rest,
      isShowingCelebration: true,
      currentCelebration: next,
    });
  },

  dismissCelebration: () => {
    set({ isShowingCelebration: false, currentCelebration: null });

    // Show next celebration after a brief delay
    setTimeout(() => {
      get().showNextCelebration();
    }, 300);
  },

  clearQueue: () => {
    set({ queue: [], isShowingCelebration: false, currentCelebration: null });
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
  },

  setReducedMotion: (enabled) => {
    set({ reducedMotion: enabled });
  },
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTierForEvent(type: CelebrationEvent['type']): CelebrationTier {
  switch (type) {
    case 'correct-answer':
      return 1;
    case 'quiz-passed':
    case 'atom-complete':
      return 2;
    case 'lesson-complete':
    case 'badge-unlock':
    case 'streak-milestone':
      return 3;
    case 'module-complete':
    case 'comeback':
      return 4;
    case 'course-complete':
      return 5;
    default:
      return 1;
  }
}

export function getRandomMessage(type: CelebrationEvent['type']): string {
  const messages = CELEBRATION_MESSAGES[type] || ['Great job!'];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function createCelebrationEvent(
  type: CelebrationEvent['type'],
  badgeId?: string
): CelebrationEvent {
  return {
    type,
    tier: getTierForEvent(type),
    xpEarned: XP_REWARDS[type] || 0,
    message: getRandomMessage(type),
    badgeId,
  };
}
