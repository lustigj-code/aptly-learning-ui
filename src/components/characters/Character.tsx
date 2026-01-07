'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CharacterName, CharacterMood } from '@/types';

type CharacterSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type CharacterProps = {
  character: CharacterName;
  mood?: CharacterMood;
  size?: CharacterSize;
  animate?: boolean;
  className?: string;
};

const sizeMap: Record<CharacterSize, number> = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 120,
  xl: 160,
};

// Placeholder SVG character components
// These will be replaced with actual Aptly animal illustrations

const OwlPlaceholder = ({ size, mood }: { size: number; mood: CharacterMood }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {/* Body */}
    <ellipse cx="50" cy="55" rx="35" ry="40" fill="#69BCC1" />
    {/* Inner body */}
    <ellipse cx="50" cy="60" rx="25" ry="28" fill="#DEF2F2" />
    {/* Eyes */}
    <circle cx="35" cy="40" r="15" fill="white" />
    <circle cx="65" cy="40" r="15" fill="white" />
    <circle
      cx={mood === 'thinking' ? 33 : 35}
      cy={mood === 'encouraging' ? 38 : 40}
      r="8"
      fill="#0A004A"
    />
    <circle
      cx={mood === 'thinking' ? 63 : 65}
      cy={mood === 'encouraging' ? 38 : 40}
      r="8"
      fill="#0A004A"
    />
    {/* Eye shine */}
    <circle cx="32" cy="37" r="3" fill="white" />
    <circle cx="62" cy="37" r="3" fill="white" />
    {/* Beak */}
    <path d="M 45 52 L 50 62 L 55 52 Z" fill="#FFDE00" />
    {/* Eyebrows based on mood */}
    {mood === 'celebrating' && (
      <>
        <path d="M 22 28 Q 35 24, 42 30" stroke="#0A004A" strokeWidth="2" fill="none" />
        <path d="M 78 28 Q 65 24, 58 30" stroke="#0A004A" strokeWidth="2" fill="none" />
      </>
    )}
    {mood === 'concerned' && (
      <>
        <path d="M 22 32 Q 35 28, 42 34" stroke="#0A004A" strokeWidth="2" fill="none" />
        <path d="M 78 32 Q 65 28, 58 34" stroke="#0A004A" strokeWidth="2" fill="none" />
      </>
    )}
    {/* Graduation cap for proud */}
    {mood === 'proud' && (
      <>
        <rect x="25" y="15" width="50" height="8" fill="#0A004A" />
        <polygon points="50,5 75,18 50,25 25,18" fill="#0A004A" />
        <circle cx="75" cy="18" r="3" fill="#FFDE00" />
        <line x1="75" y1="18" x2="80" y2="30" stroke="#FFDE00" strokeWidth="2" />
      </>
    )}
  </svg>
);

const CatPlaceholder = ({ size, mood }: { size: number; mood: CharacterMood }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {/* Ears */}
    <polygon points="20,25 30,5 40,25" fill="#3B336E" />
    <polygon points="60,25 70,5 80,25" fill="#3B336E" />
    <polygon points="24,25 30,12 36,25" fill="#DEF2F2" />
    <polygon points="64,25 70,12 76,25" fill="#DEF2F2" />
    {/* Head */}
    <circle cx="50" cy="50" r="35" fill="#3B336E" />
    {/* Face */}
    <ellipse cx="50" cy="55" rx="25" ry="22" fill="#DEF2F2" />
    {/* Eyes */}
    <ellipse
      cx="38"
      cy="45"
      rx={mood === 'celebrating' ? 4 : 6}
      ry={mood === 'celebrating' ? 2 : 8}
      fill="#0A004A"
    />
    <ellipse
      cx="62"
      cy="45"
      rx={mood === 'celebrating' ? 4 : 6}
      ry={mood === 'celebrating' ? 2 : 8}
      fill="#0A004A"
    />
    {/* Nose */}
    <ellipse cx="50" cy="58" rx="4" ry="3" fill="#EC6726" />
    {/* Mouth */}
    <path d="M 42 65 Q 50 70, 58 65" stroke="#0A004A" strokeWidth="2" fill="none" />
    {/* Whiskers */}
    <line x1="22" y1="55" x2="35" y2="58" stroke="#0A004A" strokeWidth="1" />
    <line x1="22" y1="60" x2="35" y2="60" stroke="#0A004A" strokeWidth="1" />
    <line x1="22" y1="65" x2="35" y2="62" stroke="#0A004A" strokeWidth="1" />
    <line x1="78" y1="55" x2="65" y2="58" stroke="#0A004A" strokeWidth="1" />
    <line x1="78" y1="60" x2="65" y2="60" stroke="#0A004A" strokeWidth="1" />
    <line x1="78" y1="65" x2="65" y2="62" stroke="#0A004A" strokeWidth="1" />
    {/* Sunglasses for celebrating */}
    {mood === 'impressed' && (
      <>
        <rect x="28" y="40" width="18" height="12" rx="3" fill="#0A004A" opacity="0.9" />
        <rect x="54" y="40" width="18" height="12" rx="3" fill="#0A004A" opacity="0.9" />
        <line x1="46" y1="46" x2="54" y2="46" stroke="#0A004A" strokeWidth="2" />
      </>
    )}
  </svg>
);

const DogPlaceholder = ({ size, mood }: { size: number; mood: CharacterMood }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {/* Ears */}
    <ellipse cx="25" cy="30" rx="12" ry="20" fill="#EC6726" />
    <ellipse cx="75" cy="30" rx="12" ry="20" fill="#EC6726" />
    {/* Head */}
    <circle cx="50" cy="50" r="35" fill="#EC6726" />
    {/* Snout */}
    <ellipse cx="50" cy="62" rx="18" ry="15" fill="#DEF2F2" />
    {/* Eyes */}
    <circle cx="38" cy="42" r="8" fill="white" />
    <circle cx="62" cy="42" r="8" fill="white" />
    <circle
      cx={mood === 'excited' ? 40 : 38}
      cy={mood === 'encouraging' ? 40 : 42}
      r="5"
      fill="#0A004A"
    />
    <circle
      cx={mood === 'excited' ? 64 : 62}
      cy={mood === 'encouraging' ? 40 : 42}
      r="5"
      fill="#0A004A"
    />
    <circle cx="36" cy="40" r="2" fill="white" />
    <circle cx="60" cy="40" r="2" fill="white" />
    {/* Nose */}
    <ellipse cx="50" cy="58" rx="6" ry="5" fill="#0A004A" />
    {/* Mouth */}
    <path
      d={mood === 'encouraging' || mood === 'celebrating' || mood === 'excited'
        ? "M 40 68 Q 50 78, 60 68"
        : "M 42 70 Q 50 74, 58 70"
      }
      stroke="#0A004A"
      strokeWidth="2"
      fill="none"
    />
    {/* Tongue for excited */}
    {(mood === 'excited' || mood === 'celebrating') && (
      <ellipse cx="50" cy="78" rx="6" ry="8" fill="#E84133" />
    )}
    {/* Party hat for celebrating */}
    {mood === 'celebrating' && (
      <>
        <polygon points="50,0 35,30 65,30" fill="#FFDE00" />
        <circle cx="50" cy="0" r="5" fill="#21A8B0" />
      </>
    )}
  </svg>
);

const SquirrelPlaceholder = ({ size, mood }: { size: number; mood: CharacterMood }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {/* Tail */}
    <path
      d="M 80 50 Q 95 30, 85 15 Q 70 10, 75 30 Q 78 45, 75 55"
      fill="#88B644"
      stroke="#88B644"
      strokeWidth="8"
    />
    {/* Body */}
    <ellipse cx="45" cy="60" rx="25" ry="30" fill="#88B644" />
    {/* Belly */}
    <ellipse cx="45" cy="65" rx="15" ry="18" fill="#DEF2F2" />
    {/* Head */}
    <circle cx="45" cy="32" r="22" fill="#88B644" />
    {/* Ears */}
    <ellipse cx="28" cy="18" rx="6" ry="10" fill="#88B644" />
    <ellipse cx="62" cy="18" rx="6" ry="10" fill="#88B644" />
    <ellipse cx="28" cy="20" rx="3" ry="6" fill="#DEF2F2" />
    <ellipse cx="62" cy="20" rx="3" ry="6" fill="#DEF2F2" />
    {/* Eyes */}
    <circle cx="36" cy="30" r="7" fill="white" />
    <circle cx="54" cy="30" r="7" fill="white" />
    <circle cx="36" cy="30" r="4" fill="#0A004A" />
    <circle cx="54" cy="30" r="4" fill="#0A004A" />
    <circle cx="34" cy="28" r="2" fill="white" />
    <circle cx="52" cy="28" r="2" fill="white" />
    {/* Nose */}
    <circle cx="45" cy="38" r="4" fill="#0A004A" />
    {/* Cheeks */}
    <ellipse cx="30" cy="38" rx="5" ry="4" fill="#FFDE00" opacity="0.3" />
    <ellipse cx="60" cy="38" rx="5" ry="4" fill="#FFDE00" opacity="0.3" />
    {/* Acorn for hoarding (celebrating) */}
    {(mood === 'celebrating' || mood === 'excited') && (
      <>
        <ellipse cx="20" cy="70" rx="8" ry="10" fill="#EC6726" />
        <rect x="14" y="62" width="12" height="6" rx="2" fill="#88B644" />
      </>
    )}
  </svg>
);

const JellyfishPlaceholder = ({ size, mood }: { size: number; mood: CharacterMood }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {/* Bell */}
    <ellipse cx="50" cy="35" rx="35" ry="28" fill="#69BCC1" opacity="0.8" />
    <ellipse cx="50" cy="35" rx="28" ry="22" fill="#DEF2F2" opacity="0.5" />
    {/* Eyes */}
    <circle cx="38" cy="32" r="6" fill="white" />
    <circle cx="62" cy="32" r="6" fill="white" />
    <circle cx="38" cy="32" r="3" fill="#0A004A" />
    <circle cx="62" cy="32" r="3" fill="#0A004A" />
    {/* Smile */}
    <path d="M 42 42 Q 50 48, 58 42" stroke="#0A004A" strokeWidth="2" fill="none" />
    {/* Tentacles */}
    <path d="M 25 55 Q 22 70, 28 85" stroke="#69BCC1" strokeWidth="4" fill="none" opacity="0.8" />
    <path d="M 38 58 Q 35 75, 40 90" stroke="#69BCC1" strokeWidth="4" fill="none" opacity="0.8" />
    <path d="M 50 60 Q 50 78, 50 95" stroke="#69BCC1" strokeWidth="4" fill="none" opacity="0.8" />
    <path d="M 62 58 Q 65 75, 60 90" stroke="#69BCC1" strokeWidth="4" fill="none" opacity="0.8" />
    <path d="M 75 55 Q 78 70, 72 85" stroke="#69BCC1" strokeWidth="4" fill="none" opacity="0.8" />
    {/* Sparkles for celebrating */}
    {mood === 'celebrating' && (
      <>
        <polygon points="15,20 17,25 22,25 18,28 20,33 15,30 10,33 12,28 8,25 13,25" fill="#FFDE00" />
        <polygon points="85,25 87,30 92,30 88,33 90,38 85,35 80,38 82,33 78,30 83,30" fill="#FFDE00" />
      </>
    )}
    {/* Rainbow colors for celebrating */}
    {mood === 'celebrating' && (
      <ellipse cx="50" cy="35" rx="35" ry="28" fill="url(#rainbow)" opacity="0.3" />
    )}
    <defs>
      <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#E84133" />
        <stop offset="25%" stopColor="#FFDE00" />
        <stop offset="50%" stopColor="#88B644" />
        <stop offset="75%" stopColor="#21A8B0" />
        <stop offset="100%" stopColor="#3B336E" />
      </linearGradient>
    </defs>
  </svg>
);

const characterComponents: Record<CharacterName, typeof OwlPlaceholder> = {
  owl: OwlPlaceholder,
  cat: CatPlaceholder,
  dog: DogPlaceholder,
  squirrel: SquirrelPlaceholder,
  jellyfish: JellyfishPlaceholder,
};

const moodAnimations: Record<CharacterMood, object> = {
  idle: {
    y: [0, -5, 0],
    transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
  },
  celebrating: {
    scale: [1, 1.1, 1],
    rotate: [-5, 5, -5],
    transition: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' },
  },
  encouraging: {
    y: [0, -8, 0],
    transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
  },
  thinking: {
    rotate: [0, -10, 0],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
  },
  proud: {
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
  },
  concerned: {
    x: [0, -3, 3, -3, 0],
    transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
  },
  excited: {
    y: [0, -10, 0],
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' },
  },
  impressed: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function Character({
  character,
  mood = 'idle',
  size = 'md',
  animate = true,
  className,
}: CharacterProps) {
  const CharacterComponent = characterComponents[character];
  const pixelSize = sizeMap[size];

  return (
    <motion.div
      className={cn('inline-flex items-center justify-center', className)}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, ...(animate ? moodAnimations[mood] : {}) }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <CharacterComponent size={pixelSize} mood={mood} />
    </motion.div>
  );
}

// Character info for context
export const characterInfo: Record<CharacterName, { displayName: string; role: string; personality: string }> = {
  owl: {
    displayName: 'Coach Owl',
    role: 'Your wise coach',
    personality: 'Patient and wise, always ready with helpful guidance',
  },
  cat: {
    displayName: 'Celebration Cat',
    role: 'Celebration specialist',
    personality: 'Cool and collected, impressed by your achievements',
  },
  dog: {
    displayName: 'Buddy Dog',
    role: 'Your encourager',
    personality: 'Loyal and supportive, always cheering you on',
  },
  squirrel: {
    displayName: 'Streak Squirrel',
    role: 'Streak keeper',
    personality: 'Excitable and energetic, hoards your streak days like acorns',
  },
  jellyfish: {
    displayName: 'Zen Jelly',
    role: 'Relaxation guide',
    personality: 'Calm and chill, appears during breaks and lighter moments',
  },
};
