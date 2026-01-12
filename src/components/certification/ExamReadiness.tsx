'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import {
  type ExamReadinessResult,
  type SkillReadinessStatus,
  getTrackingStatusInfo,
  formatDaysUntilExam,
} from '@/lib/certification/examScheduler';

// ============================================
// TYPES
// ============================================

export interface ExamReadinessProps {
  readiness: ExamReadinessResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSkillClick?: (skillId: string) => void;
  showDetailedBreakdown?: boolean;
  className?: string;
}

interface SkillCategoryGroup {
  category: string;
  skills: SkillReadinessStatus[];
  averageReadiness: number;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatusBadge({ status }: { status: ExamReadinessResult['trackingStatus'] }) {
  const info = getTrackingStatusInfo(status);

  const IconComponent = {
    check: CheckCircle2,
    alert: AlertCircle,
    warning: AlertTriangle,
    critical: AlertCircle,
  }[info.icon];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium',
        info.bgColor,
        info.color
      )}
    >
      <IconComponent size={18} />
      <span>{info.message}</span>
    </motion.div>
  );
}

function SkillStatusIcon({ status }: { status: SkillReadinessStatus['status'] }) {
  const iconProps = { size: 16 };

  switch (status) {
    case 'mastered':
      return <CheckCircle2 {...iconProps} className="text-success" />;
    case 'in_progress':
      return <TrendingUp {...iconProps} className="text-teal" />;
    case 'at_risk':
      return <AlertTriangle {...iconProps} className="text-yellow-600" />;
    case 'not_started':
      return <BookOpen {...iconProps} className="text-rich-black/40" />;
  }
}

function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color = 'teal',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClass = {
    teal: 'stroke-teal',
    success: 'stroke-success',
    warning: 'stroke-yellow-500',
    error: 'stroke-error',
  }[color] || 'stroke-teal';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-grey/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClass}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.span
            className="text-3xl font-bold text-navy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {value}%
          </motion.span>
          <p className="text-xs text-rich-black/60">Readiness</p>
        </div>
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  onClick,
}: {
  skill: SkillReadinessStatus;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all duration-200',
        'hover:shadow-md hover:border-teal/30 focus:outline-none focus:ring-2 focus:ring-teal/50',
        skill.status === 'at_risk' && 'border-yellow-200 bg-yellow-50/50',
        skill.status === 'mastered' && 'border-success/20 bg-success/5',
        skill.status === 'not_started' && 'border-grey/30 bg-grey/5',
        skill.status === 'in_progress' && 'border-grey/30'
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SkillStatusIcon status={skill.status} />
            <span className="font-medium text-navy truncate">{skill.skillName}</span>
          </div>
          <p className="text-xs text-rich-black/60 capitalize">{skill.category}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-navy">{skill.currentMastery}%</div>
          {skill.reviewsNeeded > 0 && (
            <p className="text-xs text-rich-black/50">
              {skill.reviewsNeeded} review{skill.reviewsNeeded !== 1 ? 's' : ''} needed
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <ProgressBar
          value={skill.currentMastery}
          max={100}
          size="sm"
          color={
            skill.status === 'mastered' ? 'success' :
            skill.status === 'at_risk' ? 'yellow' : 'teal'
          }
        />
      </div>
    </motion.button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExamReadiness({
  readiness,
  isLoading = false,
  onRefresh,
  onSkillClick,
  showDetailedBreakdown = true,
  className,
}: ExamReadinessProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group skills by category
  const skillReadinessData = readiness?.skillReadiness;
  const skillsByCategory = useMemo((): SkillCategoryGroup[] => {
    if (!skillReadinessData) return [];

    const groups: Record<string, SkillReadinessStatus[]> = {};
    for (const skill of skillReadinessData) {
      const cat = skill.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }

    return Object.entries(groups)
      .map(([category, skills]) => ({
        category,
        skills,
        averageReadiness: Math.round(
          skills.reduce((sum, s) => sum + s.currentMastery, 0) / skills.length
        ),
      }))
      .sort((a, b) => a.averageReadiness - b.averageReadiness); // Show lowest first
  }, [skillReadinessData]);

  // Get color for readiness percentage
  const getReadinessColor = (value: number): string => {
    if (value >= 90) return 'success';
    if (value >= 70) return 'teal';
    if (value >= 50) return 'warning';
    return 'error';
  };

  if (!readiness && !isLoading) {
    return (
      <Card variant="outlined" padding="lg" className={className}>
        <CardContent className="text-center py-8">
          <Calendar size={48} className="mx-auto text-rich-black/30 mb-4" />
          <h3 className="font-semibold text-navy mb-2">No Exam Date Set</h3>
          <p className="text-sm text-rich-black/60 mb-4">
            Set your certification exam date to see your readiness dashboard
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-teal" />
        </CardContent>
      </Card>
    );
  }

  if (!readiness) return null;

  const { skillsBreakdown, trackingStatus, daysUntilExam } = readiness;

  return (
    <Card variant="elevated" padding="lg" className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Award size={20} className="text-purple" />
            Exam Readiness
          </CardTitle>
          <CardDescription>
            {formatDaysUntilExam(daysUntilExam)} until your certification exam
          </CardDescription>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            leftIcon={<RefreshCw size={16} />}
          >
            Refresh
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Stats Row */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Circular Progress */}
          <CircularProgress
            value={readiness.overallReadiness}
            color={getReadinessColor(readiness.overallReadiness)}
          />

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-xl bg-light-grey/50">
              <div className="text-2xl font-bold text-navy">
                {readiness.predictedReadinessAtExam}%
              </div>
              <div className="text-xs text-rich-black/60">Projected at Exam</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-light-grey/50">
              <div className="text-2xl font-bold text-navy">
                {readiness.dailyReviewTarget}
              </div>
              <div className="text-xs text-rich-black/60">Daily Reviews</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-light-grey/50">
              <div className="text-2xl font-bold text-navy">
                {readiness.estimatedDailyMinutes}
              </div>
              <div className="text-xs text-rich-black/60">Minutes/Day</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-light-grey/50">
              <div className="text-2xl font-bold text-teal">
                {Math.round(readiness.targetRetention * 100)}%
              </div>
              <div className="text-xs text-rich-black/60">Target Retention</div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <StatusBadge status={trackingStatus} />
        </div>

        {/* Skills Breakdown Summary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Mastered', count: skillsBreakdown.mastered, color: 'bg-success' },
            { label: 'In Progress', count: skillsBreakdown.inProgress, color: 'bg-teal' },
            { label: 'At Risk', count: skillsBreakdown.atRisk, color: 'bg-yellow-500' },
            { label: 'Not Started', count: skillsBreakdown.notStarted, color: 'bg-grey' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={cn('w-2.5 h-2.5 rounded-full', color)} />
                <span className="text-lg font-bold text-navy">{count}</span>
              </div>
              <div className="text-xs text-rich-black/60">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-rich-black/60 mb-1">
            <span>Overall Progress</span>
            <span>{skillsBreakdown.mastered + skillsBreakdown.inProgress} / {skillsBreakdown.total} skills</span>
          </div>
          <div className="h-3 bg-grey/20 rounded-full overflow-hidden flex">
            <motion.div
              className="bg-success"
              initial={{ width: 0 }}
              animate={{ width: `${(skillsBreakdown.mastered / Math.max(1, skillsBreakdown.total)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="bg-teal"
              initial={{ width: 0 }}
              animate={{ width: `${(skillsBreakdown.inProgress / Math.max(1, skillsBreakdown.total)) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
            <motion.div
              className="bg-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${(skillsBreakdown.atRisk / Math.max(1, skillsBreakdown.total)) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Expandable Detailed Breakdown */}
        {showDetailedBreakdown && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-teal hover:text-teal-dark transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={18} />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Show Skill Breakdown
                </>
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        !selectedCategory
                          ? 'bg-teal text-white'
                          : 'bg-grey/10 text-rich-black/70 hover:bg-grey/20'
                      )}
                    >
                      All
                    </button>
                    {skillsByCategory.map(group => (
                      <button
                        key={group.category}
                        onClick={() => setSelectedCategory(group.category)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                          selectedCategory === group.category
                            ? 'bg-teal text-white'
                            : 'bg-grey/10 text-rich-black/70 hover:bg-grey/20'
                        )}
                      >
                        {group.category} ({group.skills.length})
                      </button>
                    ))}
                  </div>

                  {/* Skills List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {(selectedCategory
                      ? skillsByCategory.filter(g => g.category === selectedCategory)
                      : skillsByCategory
                    ).map(group => (
                      <div key={group.category}>
                        {!selectedCategory && (
                          <div className="flex items-center justify-between py-2 sticky top-0 bg-white">
                            <h4 className="font-medium text-navy capitalize">
                              {group.category}
                            </h4>
                            <span className="text-xs text-rich-black/50">
                              Avg: {group.averageReadiness}%
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {group.skills.map(skill => (
                            <SkillCard
                              key={skill.skillId}
                              skill={skill}
                              onClick={() => onSkillClick?.(skill.skillId)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Daily Study Recommendation */}
        {daysUntilExam <= 7 && daysUntilExam > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow/10 border border-yellow/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-navy">Final Week - Emergency Mode</h4>
                <p className="text-sm text-rich-black/70 mt-1">
                  Focus on reviewing at-risk skills. New material learning is paused.
                  Aim for {Math.round(readiness.estimatedDailyMinutes * 1.5)} minutes of focused review daily.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExamReadiness;
