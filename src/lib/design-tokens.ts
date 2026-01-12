/**
 * Aptly Design Tokens
 *
 * Single source of truth for design system values.
 * These constants reference CSS variables defined in globals.css
 * for type safety and IDE autocomplete.
 *
 * Part of Phase 16: Design Tokens Foundation
 */

// ===========================================
// COLORS
// ===========================================
// CSS variable references for use in TypeScript/JSX
export const COLORS = {
  // Primary Palette
  navy: 'var(--navy)',
  navyLight: 'var(--navy-light)',
  teal: 'var(--teal)',
  tealDark: 'var(--teal-dark)',
  tealLight: 'var(--teal-light)',
  yellow: 'var(--yellow)',
  yellowDark: 'var(--yellow-dark)',
  purple: 'var(--purple)',
  mutedTeal: 'var(--muted-teal)',
  lightTeal: 'var(--light-teal)',

  // Neutrals
  white: 'var(--white)',
  lightGrey: 'var(--light-grey)',
  grey: 'var(--grey)',
  richBlack: 'var(--rich-black)',

  // Semantic
  success: 'var(--success)',
  successLight: 'var(--success-light)',
  error: 'var(--error)',
  errorLight: 'var(--error-light)',
  warning: 'var(--warning)',
  warningLight: 'var(--warning-light)',
} as const;

// Raw hex values for SVG/Canvas contexts where CSS variables don't work
export const COLORS_RAW = {
  navy: '#0A004A',
  navyLight: '#1a1060',
  teal: '#21A8B0',
  tealDark: '#1a8a91',
  tealLight: '#2bc4cd',
  yellow: '#FFDE00',
  yellowDark: '#e6c800',
  purple: '#3B336E',
  mutedTeal: '#69BCC1',
  lightTeal: '#DEF2F2',

  white: '#FFFFFF',
  lightGrey: '#E6E6E6',
  grey: '#CCCCCC',
  richBlack: '#333333',

  success: '#88B644',
  successLight: '#e8f5d4',
  error: '#E84133',
  errorLight: '#fde8e6',
  warning: '#EC6726',
  warningLight: '#fef3eb',
} as const;

// ===========================================
// ANIMATION TIMING
// ===========================================
// Three-tier animation system (in milliseconds)
export const TIMING = {
  instant: 100, // Micro-feedback, toggles
  standard: 200, // Most transitions
  elaborate: 400, // Page transitions, celebrations
} as const;

// CSS transition durations
export const TRANSITIONS = {
  instant: '100ms',
  standard: '200ms',
  elaborate: '400ms',
} as const;

// ===========================================
// FRAMER MOTION SPRINGS
// ===========================================
// Standardized spring configurations
export const SPRING = {
  // Gentle - for cards, overlays
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
  // Snappy - for buttons, toggles
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 17,
  },
  // Bouncy - for celebrations, XP animations
  bouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 15,
  },
  // Progress - for progress bars
  progress: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 20,
    mass: 1,
  },
} as const;

// ===========================================
// TOUCH TARGETS
// ===========================================
// Minimum touch target sizes (WCAG 2.1 AA compliance)
export const TOUCH_TARGET = {
  min: 44, // Minimum for all interactive elements
  minClass: 'min-h-[44px] min-w-[44px]',
  primary: 48, // Primary actions (buttons, CTAs)
  primaryClass: 'min-h-[48px] min-w-[48px]',
} as const;

// ===========================================
// Z-INDEX
// ===========================================
// Layering system for overlapping elements
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
  confetti: 100,
} as const;

// ===========================================
// SHADOWS
// ===========================================
// Shadow references
export const SHADOWS = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
  focus: 'var(--shadow-focus)',
  glow: 'var(--shadow-glow)',
  celebration: 'var(--shadow-celebration)',
  hover: 'var(--shadow-hover)',
  active: 'var(--shadow-active)',
} as const;

// Raw shadow values for inline styles
export const SHADOWS_RAW = {
  tealGlow: '0 0 8px rgba(33, 168, 176, 0.5)',
  tealHover: '0 8px 24px rgba(33, 168, 176, 0.15)',
  yellowGlow: '0 0 20px rgba(255, 222, 0, 0.4)',
} as const;

// ===========================================
// SPACING
// ===========================================
// 4px base grid
export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ===========================================
// RADIUS
// ===========================================
export const RADIUS = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  full: 'var(--radius-full)',
} as const;

// ===========================================
// STATUS COLORS (for skill/mastery nodes)
// ===========================================
// Status-based color palettes for mastery visualization
export type SkillStatus = 'locked' | 'available' | 'active' | 'mastered' | 'decaying';

export const STATUS_COLORS: Record<
  SkillStatus,
  {
    bg: string;
    ring: string;
    progress: string;
    icon: string;
    glow: string;
  }
> = {
  locked: {
    bg: '#f3f4f6',
    ring: '#d1d5db',
    progress: '#9ca3af',
    icon: '#6b7280',
    glow: 'transparent',
  },
  available: {
    bg: '#ccfbf1',
    ring: COLORS_RAW.teal,
    progress: COLORS_RAW.teal,
    icon: '#0d9488',
    glow: 'rgba(33, 168, 176, 0.3)',
  },
  active: {
    bg: '#fef3c7',
    ring: COLORS_RAW.warning,
    progress: COLORS_RAW.warning,
    icon: '#d97706',
    glow: 'rgba(236, 103, 38, 0.4)',
  },
  mastered: {
    bg: '#dcfce7',
    ring: COLORS_RAW.success,
    progress: COLORS_RAW.success,
    icon: '#16a34a',
    glow: 'rgba(136, 182, 68, 0.3)',
  },
  decaying: {
    bg: '#fed7aa',
    ring: '#f97316',
    progress: '#f97316',
    icon: '#ea580c',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
} as const;

// Mini node colors for compact visualizations
export const MINI_NODE_COLORS: Record<SkillStatus, string> = {
  locked: '#d1d5db',
  available: COLORS_RAW.teal,
  active: COLORS_RAW.warning,
  mastered: COLORS_RAW.success,
  decaying: '#f97316',
} as const;

// ===========================================
// PROGRESS BAR COLORS
// ===========================================
export type ProgressBarColorName = 'teal' | 'yellow' | 'success' | 'navy' | 'gradient' | 'purple';

export const PROGRESS_COLORS: Record<ProgressBarColorName, string> = {
  teal: COLORS_RAW.teal,
  yellow: COLORS_RAW.yellow,
  success: COLORS_RAW.success,
  navy: COLORS_RAW.navy,
  gradient: COLORS_RAW.teal,
  purple: COLORS_RAW.purple,
} as const;
