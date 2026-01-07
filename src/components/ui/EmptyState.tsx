'use client';

import { motion } from 'framer-motion';
import {
  BookOpen,
  Trophy,
  Target,
  Flame,
  Search,
  FileQuestion,
  Inbox,
  Rocket,
  Sparkles,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Character } from '@/components/characters/Character';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type EmptyStateVariant =
  | 'no-courses'
  | 'no-badges'
  | 'no-progress'
  | 'no-streak'
  | 'no-search-results'
  | 'no-content'
  | 'no-notifications'
  | 'error'
  | 'coming-soon'
  | 'custom';

type EmptyStateSize = 'sm' | 'md' | 'lg';

type EmptyStateProps = {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  size?: EmptyStateSize;
  showCharacter?: boolean;
  characterMood?: 'idle' | 'encouraging' | 'thinking' | 'celebrating';
  className?: string;
  children?: React.ReactNode;
};

// ============================================
// PRESET CONFIGURATIONS
// ============================================

const presets: Record<
  Exclude<EmptyStateVariant, 'custom'>,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    actionLabel?: string;
    characterMood?: 'idle' | 'encouraging' | 'thinking' | 'celebrating';
  }
> = {
  'no-courses': {
    title: 'No courses yet',
    description: "Start your learning journey by exploring our available courses.",
    icon: <BookOpen className="w-full h-full" />,
    actionLabel: 'Browse Courses',
    characterMood: 'encouraging',
  },
  'no-badges': {
    title: 'No badges earned yet',
    description: "Complete lessons and maintain streaks to earn your first badge!",
    icon: <Trophy className="w-full h-full" />,
    actionLabel: 'Start Learning',
    characterMood: 'encouraging',
  },
  'no-progress': {
    title: 'No progress recorded',
    description: "Begin a lesson to start tracking your learning progress.",
    icon: <Target className="w-full h-full" />,
    actionLabel: 'Start a Lesson',
    characterMood: 'idle',
  },
  'no-streak': {
    title: 'No streak yet',
    description: "Complete your first day of learning to start building your streak!",
    icon: <Flame className="w-full h-full" />,
    actionLabel: 'Learn Today',
    characterMood: 'encouraging',
  },
  'no-search-results': {
    title: 'No results found',
    description: "Try adjusting your search terms or filters.",
    icon: <Search className="w-full h-full" />,
    actionLabel: 'Clear Filters',
    characterMood: 'thinking',
  },
  'no-content': {
    title: 'Nothing here yet',
    description: "Content for this section is not available yet.",
    icon: <FileQuestion className="w-full h-full" />,
    characterMood: 'idle',
  },
  'no-notifications': {
    title: 'All caught up!',
    description: "You have no new notifications. Check back later!",
    icon: <Inbox className="w-full h-full" />,
    characterMood: 'celebrating',
  },
  'error': {
    title: 'Something went wrong',
    description: "We encountered an error. Please try again later.",
    icon: <FileQuestion className="w-full h-full" />,
    actionLabel: 'Try Again',
    characterMood: 'thinking',
  },
  'coming-soon': {
    title: 'Coming Soon',
    description: "We're working hard to bring you this feature. Stay tuned!",
    icon: <Rocket className="w-full h-full" />,
    characterMood: 'celebrating',
  },
};

// ============================================
// SIZE CONFIGURATIONS
// ============================================

const sizes: Record<
  EmptyStateSize,
  {
    container: string;
    iconSize: string;
    titleSize: string;
    descriptionSize: string;
    spacing: string;
  }
> = {
  sm: {
    container: 'py-8 px-4',
    iconSize: 'w-12 h-12',
    titleSize: 'text-lg',
    descriptionSize: 'text-sm',
    spacing: 'gap-3',
  },
  md: {
    container: 'py-12 px-6',
    iconSize: 'w-16 h-16',
    titleSize: 'text-xl',
    descriptionSize: 'text-base',
    spacing: 'gap-4',
  },
  lg: {
    container: 'py-16 px-8',
    iconSize: 'w-20 h-20',
    titleSize: 'text-2xl',
    descriptionSize: 'text-lg',
    spacing: 'gap-5',
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function EmptyState({
  variant = 'custom',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md',
  showCharacter = false,
  characterMood,
  className,
  children,
}: EmptyStateProps) {
  // Get preset values if using a preset variant
  const preset = variant !== 'custom' ? presets[variant] : null;

  const finalTitle = title || preset?.title || 'Nothing here';
  const finalDescription = description || preset?.description || '';
  const finalIcon = icon || preset?.icon || <Sparkles className="w-full h-full" />;
  const finalActionLabel = actionLabel || preset?.actionLabel;
  const finalCharacterMood = characterMood || preset?.characterMood || 'idle';

  const sizeConfig = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        sizeConfig.spacing,
        className
      )}
    >
      {/* Character or Icon */}
      {showCharacter ? (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <Character
            character="owl"
            mood={finalCharacterMood}
            size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
          className={cn(
            'rounded-2xl bg-light-teal/50 flex items-center justify-center text-teal p-4',
            sizeConfig.iconSize
          )}
        >
          {finalIcon}
        </motion.div>
      )}

      {/* Content */}
      <div className="max-w-md">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn('font-semibold text-navy mb-1', sizeConfig.titleSize)}
        >
          {finalTitle}
        </motion.h3>

        {finalDescription && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn('text-rich-black/60', sizeConfig.descriptionSize)}
          >
            {finalDescription}
          </motion.p>
        )}
      </div>

      {/* Actions */}
      {(finalActionLabel || secondaryActionLabel || children) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 mt-2"
        >
          {children}

          {finalActionLabel && onAction && (
            <Button onClick={onAction} variant="primary">
              {finalActionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="ghost">
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// SPECIALIZED EMPTY STATES
// ============================================

// For courses/lessons
export function EmptyCoursesState({
  onBrowse,
}: {
  onBrowse?: () => void;
}) {
  return (
    <EmptyState
      variant="no-courses"
      showCharacter
      onAction={onBrowse}
      size="lg"
    />
  );
}

// For badges/achievements
export function EmptyBadgesState({
  onStartLearning,
}: {
  onStartLearning?: () => void;
}) {
  return (
    <EmptyState
      variant="no-badges"
      showCharacter
      onAction={onStartLearning}
    />
  );
}

// For search results
export function EmptySearchState({
  searchQuery,
  onClearFilters,
}: {
  searchQuery?: string;
  onClearFilters?: () => void;
}) {
  return (
    <EmptyState
      variant="no-search-results"
      description={
        searchQuery
          ? `No results found for "${searchQuery}". Try different keywords.`
          : "Try adjusting your search terms or filters."
      }
      onAction={onClearFilters}
    />
  );
}

// For error states
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      onAction={onRetry}
      showCharacter
      characterMood="thinking"
    />
  );
}

// For coming soon features
export function ComingSoonState({
  featureName,
}: {
  featureName?: string;
}) {
  return (
    <EmptyState
      variant="coming-soon"
      title={featureName ? `${featureName} Coming Soon` : 'Coming Soon'}
      showCharacter
      characterMood="celebrating"
    />
  );
}

// For inline empty states (smaller, used within cards)
export function InlineEmptyState({
  icon,
  message,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-light-grey flex items-center justify-center text-rich-black/40 mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm text-rich-black/60 mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// For list items
export function EmptyListState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-light-grey/50 rounded-xl">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rich-black/30">
          {icon}
        </div>
      )}
      <div>
        <p className="font-medium text-navy">{title}</p>
        {description && (
          <p className="text-sm text-rich-black/60">{description}</p>
        )}
      </div>
    </div>
  );
}
