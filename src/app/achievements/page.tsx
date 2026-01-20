'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Flame,
  Target,
  BookOpen,
  Star,
  Lock,
  Sparkles,
  Award,
  Zap,
  Crown,
  Heart,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { InlineBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonAchievementsPage } from '@/components/ui/Skeleton';
import { Section } from '@/components/layout/AppLayout';
import { useUser } from '@/store/unifiedStore';
import { cn } from '@/lib/utils';

type BadgeCategory = 'all' | 'streak' | 'course' | 'special';
type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Local type for achievement badges (different from the Badge type in types/index.ts)
type AchievementBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  earnedAt?: Date;
  category: BadgeCategory;
  progress?: number;
  total?: number;
};

const categoryFilters: { id: BadgeCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Badges', icon: <Trophy size={16} /> },
  { id: 'streak', label: 'Streak', icon: <Flame size={16} /> },
  { id: 'course', label: 'Course', icon: <BookOpen size={16} /> },
  { id: 'special', label: 'Special', icon: <Star size={16} /> },
];

// Extended badges data with more details
const allBadges: AchievementBadge[] = [
  // Streak badges
  {
    id: 'first-flame',
    title: 'First Flame',
    description: 'Complete your first learning day',
    icon: 'flame',
    tier: 'bronze',
    earnedAt: new Date('2024-10-01'),
    category: 'streak',
  },
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'flame',
    tier: 'bronze',
    earnedAt: new Date('2024-10-07'),
    category: 'streak',
  },
  {
    id: 'consistency-king',
    title: 'Consistency King',
    description: 'Maintain a 30-day streak',
    icon: 'flame',
    tier: 'silver',
    category: 'streak',
    progress: 12,
    total: 30,
  },
  {
    id: 'streak-master',
    title: 'Streak Master',
    description: 'Maintain a 100-day streak',
    icon: 'crown',
    tier: 'gold',
    category: 'streak',
    progress: 12,
    total: 100,
  },
  {
    id: 'legendary-learner',
    title: 'Legendary Learner',
    description: 'Maintain a 365-day streak',
    icon: 'crown',
    tier: 'platinum',
    category: 'streak',
    progress: 12,
    total: 365,
  },
  // Course badges
  {
    id: 'course-1-complete',
    title: 'Social Foundations',
    description: 'Complete Course 1: Introduction to Social Media Marketing',
    icon: 'book',
    tier: 'bronze',
    earnedAt: new Date('2024-10-15'),
    category: 'course',
  },
  {
    id: 'course-2-complete',
    title: 'Platform Expert',
    description: 'Complete Course 2: Social Media Management',
    icon: 'book',
    tier: 'bronze',
    earnedAt: new Date('2024-10-28'),
    category: 'course',
  },
  {
    id: 'course-3-complete',
    title: 'Ads Apprentice',
    description: 'Complete Course 3: Fundamentals of Social Media Advertising',
    icon: 'target',
    tier: 'silver',
    category: 'course',
    progress: 65,
    total: 100,
  },
  {
    id: 'course-4-complete',
    title: 'Campaign Commander',
    description: 'Complete Course 4: Advertising with Meta',
    icon: 'target',
    tier: 'silver',
    category: 'course',
    progress: 0,
    total: 100,
  },
  {
    id: 'course-5-complete',
    title: 'Measurement Maven',
    description: 'Complete Course 5: Measure & Optimize',
    icon: 'chart',
    tier: 'silver',
    category: 'course',
    progress: 0,
    total: 100,
  },
  {
    id: 'certified',
    title: 'Meta Certified',
    description: 'Pass the Meta Social Media Marketing certification exam',
    icon: 'award',
    tier: 'gold',
    category: 'course',
    progress: 2,
    total: 5,
  },
  // Special badges
  {
    id: 'quick-learner',
    title: 'Quick Learner',
    description: 'Complete 5 lessons in one day',
    icon: 'zap',
    tier: 'bronze',
    earnedAt: new Date('2024-10-20'),
    category: 'special',
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a lesson before 7 AM',
    icon: 'clock',
    tier: 'bronze',
    category: 'special',
    progress: 0,
    total: 1,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 11 PM',
    icon: 'star',
    tier: 'bronze',
    earnedAt: new Date('2024-10-25'),
    category: 'special',
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Get 100% on 10 quizzes',
    icon: 'star',
    tier: 'gold',
    category: 'special',
    progress: 3,
    total: 10,
  },
  {
    id: 'weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Learn on 4 consecutive weekends',
    icon: 'heart',
    tier: 'silver',
    category: 'special',
    progress: 2,
    total: 4,
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete a module in under 30 minutes',
    icon: 'zap',
    tier: 'silver',
    earnedAt: new Date('2024-11-01'),
    category: 'special',
  },
];

const iconMap: Record<string, React.ReactNode> = {
  flame: <Flame className="w-full h-full" />,
  crown: <Crown className="w-full h-full" />,
  book: <BookOpen className="w-full h-full" />,
  target: <Target className="w-full h-full" />,
  chart: <TrendingUp className="w-full h-full" />,
  award: <Award className="w-full h-full" />,
  zap: <Zap className="w-full h-full" />,
  clock: <Clock className="w-full h-full" />,
  star: <Star className="w-full h-full" />,
  heart: <Heart className="w-full h-full" />,
};

const tierColors: Record<BadgeTier, { bg: string; text: string; glow: string }> = {
  bronze: {
    bg: 'bg-gradient-to-br from-amber-600 to-amber-800',
    text: 'text-amber-600',
    glow: 'shadow-amber-500/50',
  },
  silver: {
    bg: 'bg-gradient-to-br from-slate-300 to-slate-500',
    text: 'text-slate-500',
    glow: 'shadow-slate-400/50',
  },
  gold: {
    bg: 'bg-gradient-to-br from-yellow to-amber-500',
    text: 'text-yellow-dark',
    glow: 'shadow-yellow/50',
  },
  platinum: {
    bg: 'bg-gradient-to-br from-purple to-navy',
    text: 'text-purple',
    glow: 'shadow-purple/50',
  },
};

export default function AchievementsPage() {
  const { user, isLoading } = useUser();
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>('all');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  if (isLoading || !user) {
    return <SkeletonAchievementsPage />;
  }

  // Defensive defaults
  const badges = user.badges || [];
  const streak = user.streak || { currentStreak: 0, longestStreak: 0 };

  // Merge user's earned badges with badge definitions
  const mergedBadges: AchievementBadge[] = allBadges.map(badge => {
    const userBadge = badges.find(b => b.id === badge.id);
    return {
      ...badge,
      earnedAt: userBadge?.earnedAt ? new Date(userBadge.earnedAt) : undefined,
      // Update progress based on user's actual streak
      progress: badge.id.includes('streak') ? streak.currentStreak : badge.progress,
    };
  });

  const filteredBadges = mergedBadges.filter(
    (badge) => activeCategory === 'all' || badge.category === activeCategory
  );

  const earnedCount = mergedBadges.filter((b) => b.earnedAt).length;
  const totalBadges = allBadges.length;
  const completionPercent = Math.round((earnedCount / totalBadges) * 100);

  // Check if badge was recently earned (within last 7 days)
  const isNewlyEarned = (badge: AchievementBadge) => {
    if (!badge.earnedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(badge.earnedAt) > weekAgo;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <Section delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h2 text-navy">Achievements</h1>
            <p className="text-rich-black/60 mt-1">
              Collect badges as you progress through your certification journey
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-navy">{earnedCount}/{totalBadges}</p>
              <p className="text-sm text-rich-black/60">Badges Earned</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-yellow/20 flex items-center justify-center">
              <Trophy size={28} className="text-yellow-dark" />
            </div>
          </div>
        </div>
      </Section>

      {/* Overall Progress */}
      <Section delay={0.1}>
        <Card variant="elevated" padding="lg" className="bg-gradient-to-r from-purple to-navy text-white">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Award size={32} className="text-yellow" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Badge Collection Progress</h3>
              <ProgressBar
                value={completionPercent}
                size="lg"
                color="yellow"
                showLabel
                className="mb-2"
              />
              <p className="text-white/70 text-sm">
                {completionPercent < 25 && "You're just getting started! Keep learning to earn more badges."}
                {completionPercent >= 25 && completionPercent < 50 && "Great progress! You're building an impressive collection."}
                {completionPercent >= 50 && completionPercent < 75 && "Amazing! You're more than halfway there."}
                {completionPercent >= 75 && completionPercent < 100 && "Almost there! Just a few more badges to go."}
                {completionPercent === 100 && "Incredible! You've collected every badge!"}
              </p>
            </div>
          </div>
        </Card>
      </Section>

      {/* Category Filters */}
      <Section delay={0.2}>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categoryFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveCategory(filter.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap',
                activeCategory === filter.id
                  ? 'bg-navy text-white'
                  : 'bg-light-grey text-rich-black/60 hover:bg-grey/50'
              )}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Badge Grid */}
      <Section delay={0.3}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredBadges.map((badge, index) => {
              const isEarned = !!badge.earnedAt;
              const isNew = isNewlyEarned(badge);
              const colors = tierColors[badge.tier];

              return (
                <motion.div
                  key={badge.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedBadge(badge)}
                  className="cursor-pointer"
                >
                  <Card
                    variant={isEarned ? 'elevated' : 'outlined'}
                    padding="md"
                    className={cn(
                      'relative overflow-hidden transition-all hover:scale-105',
                      !isEarned && 'opacity-50 grayscale',
                      isNew && 'animate-glow'
                    )}
                  >
                    {/* New badge indicator */}
                    {isNew && (
                      <div className="absolute top-2 right-2">
                        <InlineBadge variant="yellow" size="sm">
                          <Sparkles size={12} className="mr-1" />
                          NEW
                        </InlineBadge>
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center">
                      {/* Badge Icon */}
                      <div
                        className={cn(
                          'w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-white p-3',
                          isEarned ? colors.bg : 'bg-light-grey'
                        )}
                      >
                        {isEarned ? (
                          iconMap[badge.icon] || <Trophy className="w-full h-full" />
                        ) : (
                          <Lock className="w-full h-full text-grey" />
                        )}
                      </div>

                      {/* Badge Info */}
                      <h4 className="font-semibold text-navy text-sm mb-1 line-clamp-1">
                        {badge.title}
                      </h4>
                      <p className="text-xs text-rich-black/50 line-clamp-2 mb-2">
                        {badge.description}
                      </p>

                      {/* Tier indicator */}
                      <span
                        className={cn(
                          'text-xs font-medium capitalize',
                          isEarned ? colors.text : 'text-grey'
                        )}
                      >
                        {badge.tier}
                      </span>

                      {/* Progress for locked badges */}
                      {!isEarned && badge.progress !== undefined && badge.total !== undefined && (
                        <div className="w-full mt-2">
                          <ProgressBar
                            value={(badge.progress / badge.total) * 100}
                            size="sm"
                            color="teal"
                          />
                          <p className="text-xs text-rich-black/50 mt-1">
                            {badge.progress}/{badge.total}
                          </p>
                        </div>
                      )}

                      {/* Earned date */}
                      {isEarned && badge.earnedAt && (
                        <p className="text-xs text-rich-black/40 mt-1">
                          {new Date(badge.earnedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Section>

      {/* Featured Achievement */}
      <Section delay={0.4}>
        <Card variant="outlined" padding="lg" className="bg-gradient-to-r from-light-teal/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="text-teal" />
              Next Milestone
            </CardTitle>
            <CardDescription>Keep going to unlock your next achievement</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Find the next unearned badge
              const nextBadge = mergedBadges.find(b => !b.earnedAt && b.total !== undefined);
              const streakProgress = streak.currentStreak;
              const target = nextBadge?.total || 30;
              const remaining = Math.max(0, target - streakProgress);

              return (
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white p-4">
                    <Flame className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-navy mb-1">{nextBadge?.title || 'First Flame'}</h4>
                    <p className="text-sm text-rich-black/60 mb-3">
                      {nextBadge?.description || 'Complete your first learning day'}
                    </p>
                    <div className="flex items-center gap-4">
                      <ProgressBar value={(streakProgress / target) * 100} size="md" color="teal" className="flex-1" />
                      <span className="text-sm font-medium text-navy">{streakProgress}/{target} days</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-teal">{remaining}</p>
                    <p className="text-sm text-rich-black/60">days to go</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </Section>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <BadgeDetailCard badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BadgeDetailCard({
  badge,
  onClose,
}: {
  badge: AchievementBadge;
  onClose: () => void;
}) {
  const isEarned = !!badge.earnedAt;
  const colors = tierColors[badge.tier];

  return (
    <div className="text-center">
      {/* Badge Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className={cn(
          'w-24 h-24 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white p-5',
          isEarned ? colors.bg : 'bg-light-grey'
        )}
      >
        {isEarned ? (
          iconMap[badge.icon] || <Trophy className="w-full h-full" />
        ) : (
          <Lock className="w-full h-full text-grey" />
        )}
      </motion.div>

      {/* Badge Name */}
      <h3 className="h4 text-navy mb-2">{badge.title}</h3>

      {/* Tier */}
      <InlineBadge
        variant={isEarned ? 'success' : 'default'}
        className={cn('mb-4', isEarned && colors.text)}
      >
        {badge.tier.toUpperCase()}
      </InlineBadge>

      {/* Description */}
      <p className="text-rich-black/60 mb-4">{badge.description}</p>

      {/* Status */}
      {isEarned ? (
        <div className="flex items-center justify-center gap-2 text-success mb-4">
          <CheckCircle2 size={20} />
          <span className="font-medium">
            Earned on {new Date(badge.earnedAt!).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      ) : badge.progress !== undefined && badge.total !== undefined ? (
        <div className="mb-4">
          <ProgressBar
            value={(badge.progress / badge.total) * 100}
            size="md"
            color="teal"
            showLabel
            className="mb-2"
          />
          <p className="text-sm text-rich-black/60">
            {badge.progress} of {badge.total} completed
          </p>
        </div>
      ) : (
        <p className="text-rich-black/40 mb-4">Not yet earned</p>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full py-3 px-4 bg-light-grey text-navy font-medium rounded-xl hover:bg-grey/50 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
