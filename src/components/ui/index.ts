/**
 * UI Component Barrel Export
 *
 * Centralized exports for all UI primitives.
 * Import components from '@/components/ui' instead of individual files.
 */

// ============================================
// BUTTON
// ============================================
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// ============================================
// CARD
// ============================================
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

// ============================================
// INPUT
// ============================================
export { Input } from './Input';
export type { InputProps, InputSize } from './Input';

// ============================================
// FORM LABEL
// ============================================
export { FormLabel } from './FormLabel';
export type { FormLabelProps } from './FormLabel';

// ============================================
// MODAL
// ============================================
export { Modal } from './Modal';

// ============================================
// BADGE
// ============================================
export { AchievementBadge, InlineBadge, XPBadge, FloatingXP } from './Badge';

// ============================================
// PROGRESS
// ============================================
export { ProgressBar, CircularProgress } from './ProgressBar';

// ============================================
// TOAST
// ============================================
export { useToast, ToastProvider, ToastContext } from './Toast';
export type { Toast, ToastType } from './Toast';

// ============================================
// SKELETON
// ============================================
export {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonCourseRow,
  SkeletonBadge,
  SkeletonBadgeGrid,
  SkeletonLessonCard,
  SkeletonModuleList,
  SkeletonProfileHeader,
  SkeletonActivityItem,
  SkeletonActivityFeed,
  SkeletonPage,
  SkeletonDashboard,
  SkeletonLearnPage,
  SkeletonAchievementsPage,
  SkeletonProgressPage,
} from './Skeleton';

// ============================================
// EMPTY STATES
// ============================================
export {
  EmptyState,
  EmptyCoursesState,
  EmptyBadgesState,
  EmptySearchState,
  ErrorState,
  ComingSoonState,
  InlineEmptyState,
  EmptyListState,
} from './EmptyState';

// ============================================
// ACCESSIBILITY
// ============================================
export { VisuallyHidden, LiveRegion, AccessibleDescription, AccessibleLabel } from './VisuallyHidden';
export { FocusTrap } from './FocusTrap';
export { SkipLink, MainContent } from './SkipLink';

// ============================================
// IMAGES
// ============================================
export { OptimizedImage, AvatarImage } from './OptimizedImage';

// ============================================
// MICRO-INTERACTIONS
// ============================================
export { MicroButton } from './MicroButton';
export type { MicroButtonProps } from './MicroButton';
export { MicroCard } from './MicroCard';
export type { MicroCardProps } from './MicroCard';

// ============================================
// COOKIE CONSENT
// ============================================
export { CookieConsent } from './CookieConsent';
