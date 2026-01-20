/**
 * Dashboard Page
 *
 * Bento grid dashboard with glassmorphic styling.
 * Shows different views for new users vs returning users.
 *
 * Layout (Desktop):
 * ┌─────────────────┬─────────┬─────────┐
 * │  Progress Ring  │ Velocity│ Review  │
 * │     (2x2)       │  (1x1)  │ Queue   │
 * │                 │         │  (1x2)  │
 * ├─────────────────┼─────────┤         │
 * │ Skill Spotlight │         │         │
 * │     (2x1)       │         │         │
 * └─────────────────┴─────────┴─────────┘
 * ┌─────────────────────────────────────┐
 * │         Activity Heatmap (3x1)      │
 * └─────────────────────────────────────┘
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/store/unifiedStore';
import { useCourse } from '@/hooks/useCourseContent';
import { DEFAULT_COURSE_ID, getDefaultCourse } from '@/data/courseRegistry';

import {
  DashboardGrid,
  DashboardGridSkeleton,
  ProgressRingCard,
  SkillSpotlightCard,
  ReviewQueueCard,
  VelocityCard,
  ActivityHeatmap,
  FloatingActionButton,
  NewUserDashboard,
} from './components';

import { useDashboardData, useIsNewUser } from './hooks/useDashboardData';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const isNewUser = useIsNewUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Fetch dashboard data
  const {
    insights,
    reviewQueue,
    progress,
    activityData,
  } = useDashboardData();

  // Fetch course data
  const courseId = user?.progress?.currentCourseId || DEFAULT_COURSE_ID;
  const { data: _currentCourse, isLoading: isCourseLoading } = useCourse(courseId);

  // Loading timeout (10s) - reset on dependency change via separate effect
  useEffect(() => {
    if (!isUserLoading && !isCourseLoading) {
      // Loading finished, reset timeout state via timeout to avoid sync setState
      const reset = setTimeout(() => setLoadingTimeout(false), 0);
      return () => clearTimeout(reset);
    }

    const timeout = setTimeout(() => setLoadingTimeout(true), 10000);
    return () => clearTimeout(timeout);
  }, [isUserLoading, isCourseLoading]);

  // Show loading skeleton
  if ((isUserLoading || isCourseLoading) && !loadingTimeout) {
    return (
      <div className="space-y-6">
        <DashboardGridSkeleton />
      </div>
    );
  }

  // Show error state if loading timed out
  if (loadingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-yellow" />
        <h2 className="text-xl font-semibold text-navy">Taking longer than expected</h2>
        <p className="text-grey text-center max-w-md">Please check your connection and try again.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return <DashboardGridSkeleton />;
  }

  // Get course data - always use registry for full module data
  // (useCourse returns modules: [] since they're fetched separately)
  const course = getDefaultCourse();
  const totalLessons = course.modules?.reduce(
    (total, mod) => total + (mod.lessons?.length ?? 0),
    0
  ) ?? 0;

  // Get current module title
  const currentModule = course.modules?.find(m => m.id === user.progress?.currentModuleId);
  const moduleTitle = currentModule
    ? `Module ${currentModule.number}: ${currentModule.title}`
    : 'Getting Started';

  // Navigation handlers
  const handleStartLearning = () => router.push('/learn');
  const handleStartReview = () => router.push('/review');
  const handleViewPath = () => router.push('/mastery');
  const handlePracticeSkill = (skillName: string) => {
    router.push(`/learn?skill=${encodeURIComponent(skillName)}`);
  };

  // ========================================
  // NEW USER VIEW
  // ========================================
  if (isNewUser) {
    return (
      <>
        <NewUserDashboard
          userName={user.name || 'Learner'}
          courseName={course.title}
          courseDescription={course.description}
          totalLessons={totalLessons}
          onStartLearning={handleStartLearning}
          onViewPath={handleViewPath}
        />
        <FloatingActionButton
          label="Start Your First Lesson"
          onClick={handleStartLearning}
          isNewUser
        />
      </>
    );
  }

  // ========================================
  // RETURNING USER VIEW
  // ========================================

  // Default values for missing data
  const defaultSkills = {
    strongest: { name: 'Getting Started', mastery: 0, reason: 'Complete lessons to see your strongest skill' },
    focusArea: { name: 'First Lesson', mastery: 0, reason: 'Start learning to identify focus areas' },
  };

  const defaultUrgency = { high: 0, medium: 0, low: 0 };

  return (
    <>
      <DashboardGrid>
        {/* Progress Ring - 2x2 */}
        <ProgressRingCard
          percentage={progress?.overallPercentage ?? 0}
          courseName={course.title}
          moduleTitle={moduleTitle}
          lessonsCompleted={progress?.lessonsCompleted ?? 0}
          totalLessons={totalLessons}
          atomsCompleted={progress?.atomsCompleted ?? 0}
          onContinueLearning={handleStartLearning}
        />

        {/* Velocity - 1x1 */}
        <VelocityCard
          trend={insights?.velocity?.trend ?? 'stable'}
          daysRemaining={insights?.completion?.daysRemaining ?? 30}
          confidence={insights?.completion?.confidence ?? 50}
        />

        {/* Review Queue - 1x2 */}
        <ReviewQueueCard
          dueCount={reviewQueue?.dueCount ?? 0}
          urgencySummary={reviewQueue?.urgencySummary ?? defaultUrgency}
          estimatedMinutes={reviewQueue?.batch?.estimatedDurationMinutes ?? 0}
          forecast={reviewQueue?.forecast}
          onStartReview={handleStartReview}
        />

        {/* Skill Spotlight - 2x1 */}
        <SkillSpotlightCard
          strongest={insights?.skills?.strongest ?? defaultSkills.strongest}
          focusArea={insights?.skills?.focusArea ?? defaultSkills.focusArea}
          onPractice={handlePracticeSkill}
        />

        {/* Activity Heatmap - 3x1 */}
        <ActivityHeatmap
          data={activityData}
          weeks={12}
        />
      </DashboardGrid>
    </>
  );
}
