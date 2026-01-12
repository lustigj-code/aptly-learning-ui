'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen, Target, Lock, CheckCircle, Zap, Play, MessageCircle, Flame, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { AchievementBadge } from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { Section } from '@/components/layout/AppLayout';
import { ExamReadinessWidget } from '@/components/dashboard/ExamReadinessWidget';
import { ReviewQueueWidget } from '@/components/dashboard/ReviewQueueWidget';
import { AIInsightsWidget } from '@/components/dashboard/AIInsightsWidget';
import PathVisualization from '@/components/learning/PathVisualization';
import { useUser, useSyncStatus } from '@/store/unifiedStore';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { getCourse, getDefaultCourse, DEFAULT_COURSE_ID } from '@/data/courseRegistry';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isLoading } = useUser();
  const { syncStatus, isSyncing } = useSyncStatus();
  const { dueCount } = useReviewQueue(authUser?.id || null);

  // Show loading skeleton while checking auth
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  // Redirect to login if not authenticated - no fake data
  if (!authUser) {
    router.push('/login');
    return <SkeletonDashboard />;
  }

  const user = authUser;

  // Get the current course from user's progress (with defensive defaults)
  const progress = user.progress || {};
  const currentCourse = getCourse(progress.currentCourseId || DEFAULT_COURSE_ID) || getDefaultCourse();

  // Calculate actual lesson progress
  const totalLessons = currentCourse.modules?.reduce(
    (total, mod) => total + (mod.lessons?.length ?? 0),
    0
  ) ?? 0;
  const completedLessons = progress.lessonsCompleted?.length || 0;
  const lessonProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Get current module title
  const currentModule = currentCourse.modules?.find(m => m.id === progress.currentModuleId);
  const moduleTitle = currentModule
    ? `Module ${currentModule.number}: ${currentModule.title}`
    : 'Getting Started';

  // Current lesson info based on actual position
  const currentLessonInfo = {
    id: progress.currentLessonId || '1.1',
    title: currentCourse.title,
    moduleTitle,
    progress: lessonProgress,
    estimatedMinutes: user.preferences?.dailyGoalMinutes || 15,
  };

  const earnedBadges = (user.badges || []).filter((b) => b.earnedAt);
  const recentBadges = earnedBadges.slice(0, 4);

  // Check if user is brand new (no lessons completed)
  const isNewUser = completedLessons === 0;

  // Defensive defaults for streak
  const streak = user.streak || { currentStreak: 0, longestStreak: 0, freezesAvailable: 2, streakHistory: [] };

  // Get next 3-4 lessons for Learning Path Preview from actual course data
  // Memoized to prevent recalculation on every render
  const upcomingLessons = useMemo(() => {
    const completedLessonIds = new Set(progress.lessonsCompleted || []);
    const lessons: {
      id: string;
      title: string;
      module: string;
      status: 'completed' | 'current' | 'locked';
      estimatedMinutes: number;
    }[] = [];

    let foundCurrent = false;
    let addedCount = 0;

    for (const courseModule of currentCourse.modules ?? []) {
      for (const lesson of courseModule.lessons ?? []) {
        if (addedCount >= 4) break;

        const isCompleted = completedLessonIds.has(lesson.id);
        let status: 'completed' | 'current' | 'locked';

        if (isCompleted) {
          status = 'completed';
        } else if (!foundCurrent) {
          status = 'current';
          foundCurrent = true;
        } else {
          status = 'locked';
        }

        // Skip completed lessons unless we haven't found current yet
        if (isCompleted && foundCurrent) continue;

        lessons.push({
          id: lesson.id,
          title: lesson.title,
          module: `Module ${courseModule.number}: ${courseModule.title}`,
          status,
          estimatedMinutes: lesson.estimatedMinutes ?? 15,
        });
        addedCount++;
      }
      if (addedCount >= 4) break;
    }

    return lessons;
  }, [progress.lessonsCompleted, currentCourse.modules]);

  return (
    <div className="space-y-8">
      {/* Review Queue Widget - Full widget with top 5 items */}
      {dueCount > 0 && (
        <Section delay={0}>
          <ReviewQueueWidget userId={user.id} maxItems={5} />
        </Section>
      )}

      {/* Exam Readiness Widget - Only show when exam mode is enabled */}
      {user.preferences?.examModeEnabled && user.preferences?.certificationExamDate && (
        <Section delay={0.05}>
          <ExamReadinessWidget
            examDate={new Date(user.preferences.certificationExamDate)}
            targetRetention={user.preferences.targetRetention || 0.95}
            userId={user.id}
          />
        </Section>
      )}

      {/* AI Insights Widget - ML-driven learning insights with explanations */}
      {!isNewUser && (
        <Section delay={0.08}>
          <AIInsightsWidget userId={user.id} />
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
                    Begin your learning journey
                  </p>
                </>
              ) : (
                <>
                  <p className="text-teal font-semibold uppercase tracking-wider text-sm mb-4">
                    {currentLessonInfo.moduleTitle}
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
              <div className="flex items-center gap-3 p-3 bg-yellow/5 rounded-lg">
                <div className="w-10 h-10 bg-yellow/20 rounded-lg flex items-center justify-center">
                  <Flame size={20} className="text-yellow-dark" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy">{streak.currentStreak}</p>
                  <p className="text-xs text-rich-black/60">day streak</p>
                </div>
              </div>

              {/* XP */}
              <div className="flex items-center gap-3 p-3 bg-teal/5 rounded-lg">
                <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
                  <Zap size={20} className="text-teal" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy">{Number(progress?.xp ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-rich-black/60">total XP</p>
                </div>
              </div>

              {/* Overall % */}
              <div className="flex items-center gap-3 p-3 bg-teal/5 rounded-lg">
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
                  className="flex items-center gap-3 p-3 bg-purple/5 rounded-lg cursor-pointer hover:bg-purple/10 transition-colors"
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
                <div className="pt-3">
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
              <div className="space-y-4">
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

      {/* Optimized Learning Path */}
      <Section delay={0.18}>
        <PathVisualization
          userId={user.id}
          courseId={progress.currentCourseId || DEFAULT_COURSE_ID}
          onSkillClick={(skillId) => router.push(`/learn?skill=${skillId}`)}
          onFastTrack={() => router.push('/learn?fasttrack=true')}
        />
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
                    Welcome to your learning journey, {user.name}! I&apos;m here to help you master {currentCourse.title}.
                    Start with your first lesson and we&apos;ll build your skills step by step. You&apos;ve got this!
                  </>
                ) : (
                  <>
                    You&apos;re making great progress on {currentCourse.title}! Remember, consistency beats intensity.
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
        <div className="fixed bottom-4 left-4 bg-yellow-light shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-yellow-dark border border-yellow-dark/20">
          <div className="w-2 h-2 bg-yellow-dark rounded-full" />
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


