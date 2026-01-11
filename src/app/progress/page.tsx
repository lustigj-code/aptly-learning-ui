'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Clock,
  Flame,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { InlineBadge } from '@/components/ui/Badge';
import { SkeletonProgressPage } from '@/components/ui/Skeleton';
import { StreakCalendar } from '@/components/progress/StreakCounter';
import { Section } from '@/components/layout/AppLayout';
import { SkillMap } from '@/components/mastery/SkillMap';
import { useUser, useSyncStatus } from '@/store/unifiedStore';
import { COURSES } from '@/data/mockData';
import { cn, formatDuration } from '@/lib/utils';

export default function ProgressPage() {
  const { user, isLoading } = useUser();
  const { syncStatus } = useSyncStatus();

  if (isLoading || !user) {
    return <SkeletonProgressPage />;
  }

  // Defensive defaults for user properties
  const userProgress = user.progress || {};
  const streak = user.streak || { currentStreak: 0, longestStreak: 0, freezesAvailable: 2, streakHistory: [] };

  const totalLessons = 47; // Demo value
  const completedPercentage = userProgress.overallPercentage || 0;
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + 45); // Estimate

  return (
    <div className="space-y-8">
      {/* Header */}
      <Section delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h2 text-navy">Your Progress</h1>
            <p className="text-rich-black/60 mt-1">
              Meta Social Media Marketing Professional Certificate
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-rich-black/60">
            <Calendar size={16} />
            <span>Started {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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

      {/* Course Progress */}
      <Section delay={0.2}>
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

                // Calculate course progress
                const moduleCount = 3;
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
                <Flame size={20} className="text-yellow" />
              </div>
              <div>
                <CardTitle>Learning Streak</CardTitle>
                <CardDescription>Consistency is key!</CardDescription>
              </div>
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

              <div className="flex items-center justify-between pt-4 border-t border-light-grey">
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
      <Section delay={0.4}>
        <SkillMap showModuleFilter={true} />
      </Section>

      {/* Exam Readiness */}
      <Section delay={0.5}>
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
      isCurrent && 'bg-light-teal/30 border border-teal/20',
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
