'use client';

import { cn } from '@/lib/utils';

// ============================================
// BASE SKELETON
// ============================================

type SkeletonProps = {
  className?: string;
  variant?: 'default' | 'circular' | 'rounded' | 'text';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
};

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const variantStyles = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
    text: 'rounded h-4',
  };

  return (
    <div
      className={cn(
        'bg-grey/50',
        animate && 'animate-pulse',
        variantStyles[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// ============================================
// SKELETON COMPOSITIONS
// ============================================

// Avatar skeleton
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

// Text line skeleton
export function SkeletonText({
  lines = 1,
  className,
  lastLineWidth = '70%'
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-4"
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// ============================================
// PAGE-SPECIFIC SKELETONS
// ============================================

// Dashboard stat card skeleton
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="text" width="60%" height={24} />
        </div>
      </div>
    </div>
  );
}

// Course progress row skeleton
export function SkeletonCourseRow() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton variant="rounded" className="flex-1 h-2" />
            <Skeleton variant="text" width={40} height={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Badge grid skeleton
export function SkeletonBadge() {
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <Skeleton variant="circular" width={64} height={64} />
      <Skeleton variant="text" width={80} height={14} />
      <Skeleton variant="text" width={60} height={12} />
    </div>
  );
}

export function SkeletonBadgeGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBadge key={i} />
      ))}
    </div>
  );
}

// Lesson card skeleton
export function SkeletonLessonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="30%" height={12} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <Skeleton variant="rounded" width={48} height={48} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
    </div>
  );
}

// Module list skeleton
export function SkeletonModuleList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" height={18} />
              <div className="flex gap-4">
                <Skeleton variant="text" width={80} height={12} />
                <Skeleton variant="text" width={60} height={12} />
              </div>
            </div>
            <Skeleton variant="rounded" width={32} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile header skeleton
export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="space-y-2">
        <Skeleton variant="text" width={150} height={20} />
        <Skeleton variant="text" width={200} height={14} />
      </div>
    </div>
  );
}

// Activity feed item skeleton
export function SkeletonActivityItem() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1 space-y-1">
        <Skeleton variant="text" width="80%" height={14} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonActivityFeed({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonActivityItem key={i} />
      ))}
    </div>
  );
}

// Full page loading skeleton
export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="text" width="60%" height={16} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Content area */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton variant="text" width="30%" height={20} />
          <SkeletonCourseRow />
          <SkeletonCourseRow />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" width="30%" height={20} />
          <SkeletonActivityFeed count={4} />
        </div>
      </div>
    </div>
  );
}

// Dashboard specific skeleton
export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="space-y-2">
        <Skeleton variant="text" width={250} height={32} />
        <Skeleton variant="text" width={180} height={16} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Continue learning */}
      <div className="space-y-4">
        <Skeleton variant="text" width={180} height={24} />
        <SkeletonLessonCard />
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
          <Skeleton variant="text" width={120} height={20} />
          <SkeletonActivityFeed count={3} />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
          <Skeleton variant="text" width={100} height={20} />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBadge key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Learn page skeleton
export function SkeletonLearnPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="text" width={300} height={16} />
      </div>

      {/* Course cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md">
            <Skeleton variant="default" className="h-40 rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="text" width="60%" height={14} />
              <div className="flex items-center gap-2">
                <Skeleton variant="rounded" className="flex-1 h-2" />
                <Skeleton variant="text" width={40} height={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Achievements page skeleton
export function SkeletonAchievementsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width={180} height={28} />
        <Skeleton variant="text" width={250} height={16} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Badge sections */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton variant="text" width={150} height={20} />
          <SkeletonBadgeGrid count={6} />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" width={120} height={20} />
          <SkeletonBadgeGrid count={3} />
        </div>
      </div>
    </div>
  );
}

// Progress page skeleton
export function SkeletonProgressPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width={160} height={28} />
        <Skeleton variant="text" width={220} height={16} />
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Progress chart placeholder */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <Skeleton variant="text" width={180} height={20} />
        <Skeleton variant="rounded" className="w-full h-48" />
      </div>

      {/* Course progress list */}
      <div className="space-y-4">
        <Skeleton variant="text" width={150} height={20} />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCourseRow key={i} />
        ))}
      </div>
    </div>
  );
}
