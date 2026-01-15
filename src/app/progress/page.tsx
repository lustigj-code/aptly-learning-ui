'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Clock,
  Flame,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { InlineBadge } from '@/components/ui/Badge';
import { SkeletonProgressPage } from '@/components/ui/Skeleton';
import {
  StreakCalendar,
  MasteryTrajectoryChart,
  ExportProgressReport,
} from '@/components/progress';
import { StreakShop } from '@/components/gamification';
import { Section } from '@/components/layout/AppLayout';
import { SkillMap } from '@/components/mastery/SkillMap';
import { useUser } from '@/store/userProfileStore';
import { useProgressReport } from '@/hooks/useProgressReport';
import { COURSES } from '@/data/mockData';
import { cn, formatDuration } from '@/lib/utils';

export default function ProgressPage() {
  const { user, isLoading } = useUser();
  const [isStreakShopOpen, setIsStreakShopOpen] = useState(false);

  // Fetch progress report data
  const {
    report,
    visualization,
    isLoading: isReportLoading,
    refresh: refreshReport,
  } = useProgressReport(user?.id ?? null);

  // Handler for export - only export real data
  const handleExport = useCallback(async () => {
    if (report) return report;
    // Generate fresh report data
    await refreshReport();
    return report;
  }, [report, refreshReport]);

  if (isLoading || !user) {
    return <SkeletonProgressPage />;
  }

  // Defensive defaults for user properties
  const userProgress = user.progress || {};
  const streak = user.streak || { currentStreak: 0, longestStreak: 0, freezesAvailable: 2, streakHistory: [] };

  // Calculate total lessons from actual course data
  const totalLessons = COURSES.reduce((total, course) => {
    return total + course.modules.reduce((modTotal, mod) => modTotal + mod.lessons.length, 0);
  }, 0) || 47; // Fallback if modules not populated
  const completedPercentage = userProgress.overallPercentage || 0;
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + 45); // Estimate

  return (
    <div className="space-y-8">
      {/* Header with Export Button */}
      <Section delay={0}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="h2 text-navy">Your Progress</h1>
            <p className="text-rich-black/60 mt-1">
              Meta Social Media Marketing Professional Certificate
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-rich-black/60">
              <Calendar size={16} />
              <span>Started {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <ExportProgressReport
              data={report}
              isLoading={isReportLoading}
              onExport={handleExport}
            />
          </div>
        </div>
      </Section>

      {/* Overall Progress Card */}
      <Section delay={0.1}>
        <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-navy to-purple text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-40 h-40 bg-teal rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-yellow rounded-full blur-2xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-medium text-white/80 mb-1">Overall Progress</h2>
                <p className="text-5xl font-bold">{completedPercentage}%</p>
              </div>

              <CircularProgress
                value={completedPercentage}
                size={100}
                strokeWidth={10}
                color="teal"
                showLabel={false}
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <StatItem
                icon={<BookOpen size={20} />}
                label="Lessons"
                value={`${(userProgress.lessonsCompleted || []).length}/${totalLessons}`}
              />
              <StatItem
                icon={<Clock size={20} />}
                label="Time Spent"
                value={formatDuration((userProgress.totalTimeSpentMinutes || 0))}
              />
              <StatItem
                icon={<Target size={20} />}
                label="Est. Completion"
                value={estimatedCompletion.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            </div>
          </div>
        </Card>
      </Section>

      {/* Learning Progress Chart - Only show with real data */}
      {visualization && visualization.masteryHistory.length > 0 && (
        <Section delay={0.15}>
          <MasteryTrajectoryChart
            data={visualization.masteryHistory}
            title="Learning Progress"
            description="Your progress over time"
          />
        </Section>
      )}

      {/* Empty state for new users without progress data */}
      {!visualization && !isReportLoading && (
        <Section delay={0.15}>
          <Card variant="outlined" padding="lg" className="text-center">
            <div className="py-8">
              <TrendingUp size={48} className="mx-auto text-grey mb-4" />
              <h3 className="h4 text-navy mb-2">Start Learning to See Your Progress</h3>
              <p className="text-rich-black/60 max-w-md mx-auto">
                Complete lessons to see your learning progress tracked over time.
              </p>
            </div>
          </Card>
        </Section>
      )}

      {/* Course Progress */}
      <Section delay={0.25}>
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Course Progress</CardTitle>
            <CardDescription>5 courses to complete for certification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {COURSES.map((course, index) => {
                const isCompleted = (userProgress.coursesCompleted || []).includes(course.id);
                const isCurrent = (userProgress.currentCourseId || 'course-1') === course.id;
                const isLocked = !course.prerequisites.every(p =>
                  (userProgress.coursesCompleted || []).includes(p)
                );

                // Calculate course progress dynamically
                const moduleCount = course.modules.length || 3; // Fallback to 3 if not populated
                const completedModules = (userProgress.modulesCompleted || []).filter(
                  m => m.startsWith(`c${course.number}-`)
                ).length;
                const progress = isCompleted ? 100 : Math.round((completedModules / moduleCount) * 100);

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <CourseProgressRow
                      number={course.number}
                      title={course.title}
                      progress={progress}
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

      {/* Stats Grid */}
      <Section delay={0.3}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Streak Stats */}
          <Card variant="elevated" padding="lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow/20 flex items-center justify-center">
                <Flame size={20} className="text-yellow-dark" />
              </div>
              <div className="flex-1">
                <CardTitle>Learning Streak</CardTitle>
                <CardDescription>Consistency is key!</CardDescription>
              </div>
              <button
                onClick={() => setIsStreakShopOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal bg-teal/10 rounded-lg hover:bg-teal/20 transition-colors"
              >
                <ShoppingBag size={16} />
                Shop
              </button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-4xl font-bold text-navy">{streak.currentStreak}</p>
                  <p className="text-sm text-rich-black/60">day streak</p>
                </div>
                <div className="w-12 h-12 bg-yellow rounded-xl flex items-center justify-center">
                  <Flame size={24} className="text-white" />
                </div>
              </div>

              <StreakCalendar
                streakHistory={(streak.streakHistory || [])}
                className="mb-4"
              />

              <div className="flex items-center justify-between pt-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-navy">{streak.longestStreak}</p>
                  <p className="text-xs text-rich-black/60">Longest Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-navy">{streak.freezesAvailable}</p>
                  <p className="text-xs text-rich-black/60">Freezes Left</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-navy">
                    {(streak.streakHistory || []).filter(d => d.completed).length}
                  </p>
                  <p className="text-xs text-rich-black/60">Total Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Mastery */}
          <Card variant="elevated" padding="lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-teal" />
              </div>
              <div>
                <CardTitle>Skills Mastery</CardTitle>
                <CardDescription>Your expertise areas</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {(userProgress.masteryLevels || []).length > 0 ? (
                <div className="space-y-4">
                  {(userProgress.masteryLevels || []).map((skill, i) => (
                    <SkillBar
                      key={skill.skillId}
                      name={formatSkillName(skill.skillId)}
                      level={skill.level}
                      delay={0.1 * i}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-light-grey rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp size={24} className="text-grey" />
                  </div>
                  <p className="text-rich-black/60 mb-2">No skills tracked yet</p>
                  <p className="text-sm text-rich-black/40">Complete lessons to start building your expertise!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Skills Mastery Map - BKT Visualization */}
      <Section delay={0.35}>
        <SkillMap showModuleFilter={true} />
      </Section>

      {/* Exam Readiness */}
      <Section delay={0.4}>
        <Card variant="outlined" padding="lg" className="bg-light-teal/30 border-teal/20">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-teal/20 flex items-center justify-center">
              <Award size={32} className="text-teal" />
            </div>
            <div className="flex-1">
              <h3 className="h4 text-navy mb-1">Meta Certification Exam</h3>
              <p className="text-rich-black/60 mb-3">
                Complete all 5 courses to unlock exam preparation
              </p>

              <div className="flex items-center gap-4">
                <ProgressBar
                  value={((userProgress.coursesCompleted || []).length / 5) * 100}
                  size="md"
                  color="teal"
                  className="flex-1"
                />
                <span className="text-sm font-medium text-navy">
                  {(userProgress.coursesCompleted || []).length}/5 courses
                </span>
              </div>
            </div>

            <div className="text-right">
              <InlineBadge
                variant={(userProgress.coursesCompleted || []).length >= 5 ? 'success' : 'default'}
                size="md"
              >
                {(userProgress.coursesCompleted || []).length >= 5 ? 'Ready!' : 'Not yet'}
              </InlineBadge>
            </div>
          </div>
        </Card>
      </Section>

      {/* Streak Shop Modal */}
      <StreakShop
        isOpen={isStreakShopOpen}
        onClose={() => setIsStreakShopOpen(false)}
      />
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-2 text-white/60">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function CourseProgressRow({
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
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-xl transition-all',
      isCurrent && 'bg-light-teal/30',
      isLocked && 'opacity-50'
    )}>
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
          isCompleted
            ? 'bg-success text-white'
            : isCurrent
            ? 'bg-teal text-white'
            : 'bg-light-grey text-navy'
        )}
      >
        {isCompleted ? '✓' : number}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-navy truncate">{title}</h4>
          {isCurrent && <InlineBadge variant="teal">In Progress</InlineBadge>}
          {isCompleted && <InlineBadge variant="success">Complete</InlineBadge>}
        </div>

        <div className="flex items-center gap-4">
          <ProgressBar
            value={progress}
            size="sm"
            color={isCompleted ? 'success' : 'teal'}
            className="flex-1"
          />
          <span className="text-sm text-rich-black/60">{progress}%</span>
        </div>
      </div>

      <div className="text-right text-sm text-rich-black/60">
        {estimatedHours} hrs
      </div>
    </div>
  );
}

function SkillBar({ name, level, delay }: { name: string; level: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-navy">{name}</span>
        <span className="text-sm text-rich-black/60">{level}%</span>
      </div>
      <ProgressBar
        value={level}
        size="sm"
        color={level >= 80 ? 'success' : level >= 50 ? 'teal' : 'navy'}
        animated
      />
    </motion.div>
  );
}

function formatSkillName(skillId: string): string {
  const names: Record<string, string> = {
    'social-strategy': 'Social Strategy',
    'content-creation': 'Content Creation',
    'meta-ads': 'Meta Advertising',
    'analytics': 'Analytics & Reporting',
  };
  return names[skillId] || skillId;
}
