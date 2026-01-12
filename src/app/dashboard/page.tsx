'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen, Target, Lock, CheckCircle, Zap, Play, MessageCircle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { AchievementBadge } from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { StreakCounter, StreakCalendar } from '@/components/progress/StreakCounter';
import { Section } from '@/components/layout/AppLayout';
import { useUser, useSyncStatus } from '@/store/unifiedStore';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { Brain } from 'lucide-react';
import { COURSES } from '@/data/mockData';
import { cn } from '@/lib/utils';

// Demo user for UI testing when not authenticated
const DEMO_USER = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@aptly.com',
  progress: {
    currentCourseId: 'c1',
    currentModuleId: 'c1-m1',
    currentLessonId: 'c1-m1-l1',
    lessonsCompleted: ['c1-m1-l1', 'c1-m1-l2'],
    modulesCompleted: [],
    coursesCompleted: [],
    overallPercentage: 12,
    totalTimeSpentMinutes: 45,
    xp: 1250,
  },
  streak: {
    currentStreak: 5,
    longestStreak: 12,
    freezesAvailable: 2,
    streakHistory: [],
  },
  badges: [],
  preferences: {
    dailyGoalMinutes: 15,
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isLoading } = useUser();
  const { syncStatus, isSyncing } = useSyncStatus();
  const { dueCount, dueItems } = useReviewQueue(authUser?.id || null);

  // Use demo user if not authenticated (for UI testing)
  const user = authUser || DEMO_USER;

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  // Get the current course from user's progress (with defensive defaults)
  const progress = user.progress || {};
  const currentCourse = COURSES.find(c => c.id === progress.currentCourseId) || COURSES[0];

  // Calculate actual lesson progress
  const totalLessons = 47; // Total lessons in the course
  const completedLessons = progress.lessonsCompleted?.length || 0;
  const lessonProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Current lesson info based on actual position
  const currentLessonInfo = {
    id: progress.currentLessonId || 'c1-m1-l1',
    title: completedLessons === 0 ? 'Introduction to Social Media Marketing' : currentCourse.title,
    moduleTitle: completedLessons === 0 ? 'Getting Started' : `Module ${progress.currentModuleId?.split('-')[1]?.replace('m', '') || '1'}`,
    progress: lessonProgress,
    estimatedMinutes: user.preferences?.dailyGoalMinutes || 15,
  };

  const earnedBadges = (user.badges || []).filter((b) => b.earnedAt);
  const recentBadges = earnedBadges.slice(0, 4);

  // Check if user is brand new (no lessons completed)
  const isNewUser = completedLessons === 0;

  // Defensive defaults for streak
  const streak = user.streak || { currentStreak: 0, longestStreak: 0, freezesAvailable: 2, streakHistory: [] };

  // Get next 3-4 lessons for Learning Path Preview
  const getUpcomingLessons = () => {
    // Mock data for upcoming lessons - in real app, this would come from course data
    return [
      {
        id: 'c3-m1-l2',
        title: 'Setting Your Campaign Objective',
        module: 'Getting Started with Meta Ads',
        status: 'current' as const,
        estimatedMinutes: 20,
      },
      {
        id: 'c3-m1-l3',
        title: 'Understanding Ad Placements',
        module: 'Getting Started with Meta Ads',
        status: 'locked' as const,
        estimatedMinutes: 15,
      },
      {
        id: 'c3-m2-l1',
        title: 'Creating Your First Campaign',
        module: 'Campaign Creation',
        status: 'locked' as const,
        estimatedMinutes: 25,
      },
      {
        id: 'c3-m2-l2',
        title: 'Targeting Your Audience',
        module: 'Campaign Creation',
        status: 'locked' as const,
        estimatedMinutes: 30,
      },
    ];
  };

  const upcomingLessons = getUpcomingLessons();

  return (
    <div className="space-y-8">
      {/* Review Nudge Banner */}
      {dueCount > 0 && (
        <Section delay={0}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple/10 to-teal/10 rounded-xl p-4 border border-purple/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple/20 rounded-xl flex items-center justify-center">
                <Brain size={24} className="text-purple" />
              </div>
              <div>
                <p className="font-semibold text-navy">
                  {dueCount} concept{dueCount !== 1 ? 's' : ''} ready for review
                </p>
                <p className="text-sm text-rich-black/60">
                  Reviewing now will strengthen your memory!
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => router.push('/review')}
            >
              Start Review
            </Button>
          </motion.div>
        </Section>
      )}

      {/* Hero Section: Continue Learning (70vh) */}
      <Section delay={0}>
        <Card
          variant="interactive"
          padding="lg"
          className="bg-gradient-to-br from-navy to-purple text-white relative overflow-hidden group min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh] flex flex-col justify-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 w-64 h-64 bg-teal rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-32 w-48 h-48 bg-yellow rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-teal rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-4xl">
            <div className="mb-8">
              {isNewUser ? (
                <>
                  <p className="text-yellow font-semibold uppercase tracking-wider text-sm mb-4">
                    Welcome, {user.name}
                  </p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                    Ready to Begin Your Journey?
                  </h1>
                  <p className="text-white/80 text-xl mb-2">
                    Start with {currentCourse.title}
                  </p>
                  <p className="text-white/60 text-lg">
                    Your first lesson: Introduction to Social Media Marketing
                  </p>
                </>
              ) : (
                <>
                  <p className="text-teal font-semibold uppercase tracking-wider text-sm mb-4">
                    Course {COURSES.findIndex(c => c.id === progress.currentCourseId) + 1} &bull; {currentLessonInfo.moduleTitle}
                  </p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                    {currentLessonInfo.title}
                  </h1>
                  <p className="text-white/80 text-xl">
                    {currentCourse.title}
                  </p>
                </>
              )}
            </div>

            {/* Progress Info */}
            <div className="mb-8">
              <div className="flex items-center gap-4 sm:gap-6 md:gap-8 mb-6 flex-wrap">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedLessons} of {totalLessons}</p>
                    <p className="text-sm text-white/70">lessons completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">~{currentLessonInfo.estimatedMinutes} min</p>
                    <p className="text-sm text-white/70">daily goal</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{progress.overallPercentage || 0}%</p>
                    <p className="text-sm text-white/70">complete</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80 font-medium">Overall Progress</span>
                  <span className="text-white font-bold text-lg">{progress.overallPercentage || 0}%</span>
                </div>
                <ProgressBar
                  value={progress.overallPercentage || 0}
                  size="lg"
                  color="teal"
                  className="h-4"
                />
                {!isNewUser && (
                  <p className="text-white/60 text-sm mt-3">
                    Next milestone: Complete {Math.ceil(totalLessons * 0.5)} lessons to reach 50%
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button
                variant="celebration"
                size="lg"
                rightIcon={<ArrowRight size={24} />}
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                onClick={() => router.push('/learn')}
              >
                {isNewUser ? 'Start Learning' : 'Continue Learning'}
              </Button>
              <motion.div
                className="hidden sm:flex w-16 h-16 bg-white/10 rounded-2xl items-center justify-center group-hover:bg-white/20 transition-colors cursor-pointer"
                whileHover={{ scale: 1.1, rotate: 5 }}
                onClick={() => router.push('/learn')}
              >
                <Play size={32} className="text-white ml-1" />
              </motion.div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Secondary Row: Quick Stats + Learning Path Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats (Compact) */}
        <Section delay={0.1}>
          <Card variant="elevated" padding="lg" className="bg-white h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Streak */}
              <div className="flex items-center gap-3 p-3 bg-yellow/5 rounded-lg border border-yellow/20">
                <div className="w-10 h-10 bg-yellow/20 rounded-lg flex items-center justify-center">
                  <Flame size={20} className="text-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy">{streak.currentStreak}</p>
                  <p className="text-xs text-rich-black/60">day streak</p>
                </div>
              </div>

              {/* XP */}
              <div className="flex items-center gap-3 p-3 bg-teal/5 rounded-lg border border-teal/20">
                <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
                  <Zap size={20} className="text-teal" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy">{Number(progress?.xp ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-rich-black/60">total XP</p>
                </div>
              </div>

              {/* Overall % */}
              <div className="flex items-center gap-3 p-3 bg-light-teal/50 rounded-lg border border-teal/20">
                <CircularProgress
                  value={progress.overallPercentage || 0}
                  size={40}
                  strokeWidth={4}
                  color="teal"
                />
                <div>
                  <p className="text-2xl font-bold text-navy">{progress.overallPercentage || 0}%</p>
                  <p className="text-xs text-rich-black/60">complete</p>
                </div>
              </div>

              {/* Due for Review */}
              {dueCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-purple/5 rounded-lg border border-purple/20 cursor-pointer hover:bg-purple/10 transition-colors"
                  onClick={() => router.push('/review')}
                >
                  <div className="w-10 h-10 bg-purple/20 rounded-lg flex items-center justify-center">
                    <Brain size={20} className="text-purple" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-navy">{dueCount}</p>
                    <p className="text-xs text-rich-black/60">due for review</p>
                  </div>
                  <ArrowRight size={16} className="text-purple" />
                </motion.div>
              )}

              {/* Longest Streak Info */}
              {streak.longestStreak > streak.currentStreak && (
                <div className="pt-3 border-t border-grey/20">
                  <p className="text-xs text-rich-black/60">
                    Longest streak: <span className="font-semibold text-navy">{streak.longestStreak} days</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Section>

        {/* Learning Path Preview */}
        <Section delay={0.15} className="lg:col-span-2">
          <Card variant="elevated" padding="lg" className="bg-white h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Learning Path Preview</CardTitle>
              <CardDescription>Your next lessons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingLessons.map((lesson, index) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <LessonPreviewCard
                      title={lesson.title}
                      module={lesson.module}
                      status={lesson.status}
                      estimatedMinutes={lesson.estimatedMinutes}
                      isCurrent={lesson.status === 'current'}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* Stats Row */}
      <Section delay={0.2}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Today's Progress"
            icon={<Clock size={20} />}
            index={0}
          >
            <div className="flex items-center gap-3">
              <CircularProgress
                value={progress.totalTimeSpentMinutes || 0}
                max={user.preferences?.dailyGoalMinutes || 15}
                size={60}
                strokeWidth={6}
                color="teal"
              />
              <div>
                <p className="text-lg font-bold text-navy">{progress.totalTimeSpentMinutes || 0}/{user.preferences?.dailyGoalMinutes || 15}</p>
                <p className="text-xs text-rich-black/60">minutes</p>
              </div>
            </div>
          </StatCard>

          <StatCard
            label="Overall Progress"
            icon={<Target size={20} />}
            index={1}
          >
            <div className="flex items-center gap-3">
              <CircularProgress
                value={progress.overallPercentage || 0}
                size={60}
                strokeWidth={6}
                color="teal"
              />
              <div>
                <p className="text-lg font-bold text-navy">{progress.overallPercentage || 0}%</p>
                <p className="text-xs text-rich-black/60">complete</p>
              </div>
            </div>
          </StatCard>

          <StatCard
            label="Lessons Completed"
            icon={<BookOpen size={20} />}
            index={2}
          >
            <p className="text-3xl font-bold text-navy">
              {completedLessons}
            </p>
            <p className="text-sm text-rich-black/60">of 47 lessons</p>
          </StatCard>

          <StatCard
            label="Total XP"
            icon={<Zap size={20} className="text-yellow" />}
            index={3}
          >
            <p className="text-3xl font-bold text-navy">
              {Number(progress?.xp ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-rich-black/60">experience points</p>
          </StatCard>
        </div>
      </Section>

      {/* Recent Achievements */}
      {recentBadges.length > 0 && (
        <Section delay={0.3}>
          <Card variant="elevated" padding="lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>{earnedBadges.length} badges earned</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight size={16} />}
                onClick={() => router.push('/progress')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8 overflow-x-auto pb-2">
                {recentBadges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + index * 0.05 }}
                  >
                    <AchievementBadge
                      badge={badge}
                      size="md"
                      isEarned
                      showGlow={index === 0}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Course Overview */}
      <Section delay={0.4}>
        <Card variant="elevated" padding="lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Learning Path</CardTitle>
              <CardDescription>Meta Social Media Marketing Certificate</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-rich-black/60">Powered by</span>
              <span className="font-semibold text-navy">Meta</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {COURSES.map((course, index) => {
                const coursesCompleted: string[] = progress.coursesCompleted || [];
                const modulesCompleted: string[] = progress.modulesCompleted || [];
                const isCompleted = coursesCompleted.includes(course.id);
                const isCurrent = progress.currentCourseId === course.id;
                const isLocked = !course.prerequisites.every(p =>
                  coursesCompleted.includes(p)
                );

                // Calculate course progress
                const moduleCount = 3; // Simplified for demo
                const completedModulesCount = modulesCompleted.filter(
                  m => m.startsWith(`c${course.number}-`)
                ).length;
                const courseProgress = isCompleted ? 100 : Math.round((completedModulesCount / moduleCount) * 100);

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                  >
                    <CourseCard
                      number={course.number}
                      title={course.title}
                      progress={courseProgress}
                      isCompleted={isCompleted}
                      isCurrent={isCurrent}
                      isLocked={isLocked}
                      estimatedHours={course.estimatedHours}
                    />
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Coach Tip */}
      <Section delay={0.5}>
        <Card variant="outlined" padding="lg" className="bg-light-teal/30 border-teal/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-navy mb-1">Coach&apos;s Tip</h3>
              <p className="text-rich-black/70">
                {isNewUser ? (
                  <>
                    Welcome to your learning journey, {user.name}! I&apos;m here to help you master social media marketing.
                    Start with your first lesson and we&apos;ll build your skills step by step. You&apos;ve got this!
                  </>
                ) : (
                  <>
                    You&apos;re making great progress on Meta Ads! Remember, consistency beats intensity.
                    {streak.currentStreak > 0
                      ? ` Your ${streak.currentStreak}-day streak shows you've got what it takes. Keep going!`
                      : ' Start a streak today by completing a lesson!'}
                  </>
                )}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => router.push('/learn')}
              >
                {isNewUser ? 'Start My First Lesson' : 'Ask Coach a Question'}
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      {/* Sync Status Indicator */}
      {isSyncing && (
        <div className="fixed bottom-4 left-4 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-rich-black/70 border border-grey/20">
          <div className="w-3 h-3 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          Syncing...
        </div>
      )}
      {syncStatus === 'offline' && !isSyncing && (
        <div className="fixed bottom-4 left-4 bg-yellow/10 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-yellow border border-yellow/20">
          <div className="w-2 h-2 bg-yellow rounded-full" />
          Working offline
        </div>
      )}
    </div>
  );
}

// Lesson Preview Card Component
function LessonPreviewCard({
  title,
  module,
  status,
  estimatedMinutes,
  isCurrent,
}: {
  title: string;
  module: string;
  status: 'completed' | 'current' | 'locked';
  estimatedMinutes: number;
  isCurrent: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 transition-all duration-200',
        status === 'completed'
          ? 'bg-success-light border-success'
          : isCurrent
          ? 'bg-light-teal border-teal shadow-sm'
          : 'bg-light-grey/30 border-grey/30'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            status === 'completed'
              ? 'bg-success text-white'
              : isCurrent
              ? 'bg-teal text-white'
              : 'bg-grey/30 text-grey'
          )}
        >
          {status === 'completed' ? (
            <CheckCircle size={20} />
          ) : status === 'locked' ? (
            <Lock size={18} />
          ) : (
            <Play size={18} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'font-semibold text-sm truncate',
              status === 'locked' ? 'text-grey' : 'text-navy'
            )}
          >
            {title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-rich-black/60 truncate">{module}</span>
            <span className="text-xs text-rich-black/60">•</span>
            <span className="text-xs text-rich-black/60">{estimatedMinutes} min</span>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-right flex-shrink-0">
          {status === 'completed' ? (
            <span className="text-xs font-semibold text-success uppercase tracking-wide">Done</span>
          ) : isCurrent ? (
            <span className="text-xs font-semibold text-teal uppercase tracking-wide">Current</span>
          ) : (
            <span className="text-xs text-grey uppercase tracking-wide">Locked</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  icon,
  children,
  index = 0,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card variant="elevated" padding="md" className="h-full hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center gap-2 mb-3 text-rich-black/60">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

// Course Card Component
function CourseCard({
  number,
  title,
  progress,
  isCompleted,
  isCurrent,
  isLocked,
  estimatedHours,
}: {
  number: number;
  title: string;
  progress: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  estimatedHours: number;
}) {
  return (
    <motion.div
      className={cn(
        'p-4 rounded-xl border-2 transition-all duration-200',
        isCompleted
          ? 'bg-success-light border-success'
          : isCurrent
          ? 'bg-light-teal border-teal shadow-md'
          : isLocked
          ? 'bg-light-grey/50 border-grey/50 opacity-60'
          : 'bg-white border-grey hover:border-muted-teal'
      )}
      whileHover={!isLocked ? { scale: 1.01, x: 4 } : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Number/Status Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
            isCompleted
              ? 'bg-success text-white'
              : isCurrent
              ? 'bg-teal text-white'
              : isLocked
              ? 'bg-grey/30 text-grey'
              : 'bg-light-grey text-navy'
          )}
        >
          {isCompleted ? (
            <CheckCircle size={24} />
          ) : isLocked ? (
            <Lock size={20} />
          ) : (
            number
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'font-semibold truncate',
              isLocked ? 'text-grey' : 'text-navy'
            )}
          >
            {title}
          </h4>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-rich-black/60">
              {estimatedHours} hrs
            </span>
            {!isLocked && !isCompleted && (
              <ProgressBar
                value={progress}
                size="sm"
                color={isCurrent ? 'teal' : 'navy'}
                className="flex-1 max-w-[120px]"
              />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-right">
          {isCompleted ? (
            <span className="text-sm font-semibold text-success">Complete</span>
          ) : isCurrent ? (
            <span className="text-sm font-bold text-teal">{progress}%</span>
          ) : isLocked ? (
            <span className="text-xs text-grey">Locked</span>
          ) : (
            <span className="text-xs text-rich-black/60">Not started</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
