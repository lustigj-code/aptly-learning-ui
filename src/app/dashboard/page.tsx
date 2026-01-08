'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen, Target, Lock, CheckCircle, Zap, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { AchievementBadge, InlineBadge } from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { StreakCounter, StreakCalendar } from '@/components/progress/StreakCounter';
import { Character } from '@/components/characters/Character';
import { Section } from '@/components/layout/AppLayout';
import { useUser, useSyncStatus } from '@/store/unifiedStore';
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

  return (
    <div className="space-y-8">
      {/* Top Row: Streak + Continue Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak Card */}
        <Section delay={0}>
          <Card variant="elevated" padding="lg" className="bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <StreakCounter
                  count={streak.currentStreak}
                  size="lg"
                  longestStreak={streak.longestStreak}
                  freezesAvailable={streak.freezesAvailable}
                />
                <Character character="squirrel" mood="celebrating" size="sm" />
              </div>

              <StreakCalendar
                streakHistory={streak.streakHistory || []}
                className="mt-4"
              />

              {streak.currentStreak >= 7 && (
                <motion.div
                  className="mt-4 p-3 bg-yellow/10 rounded-lg border border-yellow/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm font-medium text-navy">
                    Amazing! You&apos;ve been learning for {streak.currentStreak} days straight!
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </Section>

        {/* Continue Learning Card */}
        <Section delay={0.1} className="lg:col-span-2">
          <Card
            variant="interactive"
            padding="lg"
            className="bg-gradient-to-br from-navy to-purple text-white relative overflow-hidden group"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-40 h-40 bg-teal rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-20 w-32 h-32 bg-yellow rounded-full blur-2xl" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isNewUser ? (
                    <>
                      <InlineBadge variant="yellow" className="mb-2">
                        Welcome, {user.name}!
                      </InlineBadge>
                      <h2 className="text-2xl font-bold mb-1">
                        Ready to Begin Your Journey?
                      </h2>
                      <p className="text-white/70 text-sm">
                        Start with {currentCourse.title}
                      </p>
                    </>
                  ) : (
                    <>
                      <InlineBadge variant="teal" className="mb-2">
                        Course {COURSES.findIndex(c => c.id === progress.currentCourseId) + 1}
                      </InlineBadge>
                      <h2 className="text-2xl font-bold mb-1">
                        {currentLessonInfo.title}
                      </h2>
                      <p className="text-white/70 text-sm">
                        {currentLessonInfo.moduleTitle}
                      </p>
                    </>
                  )}
                </div>

                <motion.div
                  className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Play size={28} className="text-white ml-1" />
                </motion.div>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Clock size={16} />
                  <span>~{currentLessonInfo.estimatedMinutes} min/day goal</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <BookOpen size={16} />
                  <span>{progress.overallPercentage || 0}% complete</span>
                </div>
              </div>

              <ProgressBar
                value={progress.overallPercentage || 0}
                size="md"
                color="teal"
                className="mb-6"
              />

              <Button
                variant="celebration"
                size="lg"
                rightIcon={<ArrowRight size={20} />}
                className="w-full sm:w-auto"
                onClick={() => router.push('/learn')}
              >
                {isNewUser ? 'Start Learning' : 'Continue Learning'}
              </Button>
            </div>
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
            <Character character="owl" mood={isNewUser ? 'encouraging' : 'celebrating'} size="md" />
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
            <InlineBadge variant="success">Complete</InlineBadge>
          ) : isCurrent ? (
            <InlineBadge variant="teal">{progress}%</InlineBadge>
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
