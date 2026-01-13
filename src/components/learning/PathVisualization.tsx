'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Lock,
  Zap,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface PathSkill {
  skillId: string;
  skillName: string;
  order: number;
  estimatedMinutes: number;
  canSkip: boolean;
  skipReason?: string;
  prerequisites: string[];
  pMastery: number;
}

export interface OptimizedPath {
  skills: PathSkill[];
  estimatedCompletionHours: number;
  pathType: 'standard' | 'accelerated' | 'remedial';
  reasoning: string;
}

export interface LearningVelocity {
  atomsPerHour: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

export interface CompletionEstimate {
  estimatedDays: number;
  estimatedHours: number;
  completionDate: Date;
  averageDailyMinutes: number;
  confidence: number;
}

export interface FastTrackEligibility {
  eligible: boolean;
  skillsToSkip: string[];
  timeSavedMinutes: number;
  reason: string;
}

interface PathVisualizationProps {
  userId: string;
  courseId?: string;
  onSkillClick?: (skillId: string) => void;
  onFastTrack?: () => void;
  className?: string;
}

interface PathData {
  path: OptimizedPath | null;
  estimate: CompletionEstimate | null;
  fastTrack: FastTrackEligibility | null;
  velocity: LearningVelocity | null;
}

// ============================================
// SKILL NODE COMPONENT
// ============================================

function SkillNode({
  skill,
  index,
  isFirst,
  isLast,
  onClick,
}: {
  skill: PathSkill;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onClick?: () => void;
}) {
  const isMastered = skill.pMastery >= 0.95;
  const isInProgress = skill.pMastery > 0.1 && skill.pMastery < 0.95;
  const isLocked = skill.pMastery < 0.1 && index > 0;

  // Status configuration
  const statusConfig = {
    mastered: {
      bg: 'bg-success',
      border: 'border-success',
      text: 'text-success',
      icon: <CheckCircle size={16} className="text-white" />,
      label: 'Mastered',
    },
    skippable: {
      bg: 'bg-purple-500',
      border: 'border-purple-500',
      text: 'text-purple-600',
      icon: <Sparkles size={16} className="text-white" />,
      label: 'Can Skip',
    },
    inProgress: {
      bg: 'bg-teal',
      border: 'border-teal',
      text: 'text-teal',
      icon: <Zap size={16} className="text-white" />,
      label: 'In Progress',
    },
    locked: {
      bg: 'bg-grey/40',
      border: 'border-grey/40',
      text: 'text-grey',
      icon: <Lock size={14} className="text-white" />,
      label: 'Locked',
    },
    ready: {
      bg: 'bg-navy',
      border: 'border-navy',
      text: 'text-navy',
      icon: <span className="text-white text-xs font-bold">{skill.order}</span>,
      label: 'Ready',
    },
  };

  let status: keyof typeof statusConfig = 'ready';
  if (isMastered) status = 'mastered';
  else if (skill.canSkip) status = 'skippable';
  else if (isInProgress) status = 'inProgress';
  else if (isLocked) status = 'locked';

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-stretch"
    >
      {/* Vertical Line and Node */}
      <div className="flex flex-col items-center mr-4">
        {/* Top connector line */}
        {!isFirst && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[12px]',
              isMastered || status === 'skippable' ? 'bg-success' : 'bg-grey/30'
            )}
          />
        )}

        {/* Node */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            config.bg,
            status === 'locked' ? 'opacity-50' : ''
          )}
        >
          {config.icon}
        </div>

        {/* Bottom connector line */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[12px]',
              isMastered ? 'bg-success' : 'bg-grey/30'
            )}
          />
        )}
      </div>

      {/* Skill Card */}
      <motion.div
        className={cn(
          'flex-1 p-3 rounded-lg border-2 transition-all duration-200 mb-2 cursor-pointer',
          isMastered
            ? 'bg-success-light border-success/30'
            : skill.canSkip
            ? 'bg-purple-50 border-purple-200'
            : isInProgress
            ? 'bg-light-teal border-teal/30'
            : isLocked
            ? 'bg-light-grey/50 border-grey/20 opacity-60'
            : 'bg-white border-grey/20 hover:border-teal/50'
        )}
        whileHover={!isLocked ? { scale: 1.01, x: 4 } : undefined}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className={cn(
                  'font-medium text-sm truncate',
                  isLocked ? 'text-grey' : 'text-navy'
                )}
              >
                {skill.skillName}
              </h4>
              {skill.canSkip && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Skip
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-grey">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {skill.estimatedMinutes}m
              </span>
              {!isMastered && !isLocked && (
                <span className={cn('font-medium', config.text)}>
                  {Math.round(skill.pMastery * 100)}%
                </span>
              )}
            </div>

            {/* Mini progress bar for in-progress skills */}
            {isInProgress && (
              <div className="mt-2">
                <ProgressBar
                  value={skill.pMastery * 100}
                  size="xs"
                  color="teal"
                  className="h-1"
                />
              </div>
            )}

            {/* Skip reason */}
            {skill.canSkip && skill.skipReason && (
              <p className="text-xs text-purple-600 mt-1">{skill.skipReason}</p>
            )}
          </div>

          <ChevronRight
            size={16}
            className={cn('flex-shrink-0 ml-2', isLocked ? 'text-grey/40' : 'text-grey')}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// COMPLETION ESTIMATE CARD
// ============================================

function CompletionEstimateCard({
  estimate,
  velocity,
}: {
  estimate: CompletionEstimate;
  velocity: LearningVelocity | null;
}) {
  const trendIcon = {
    improving: <TrendingUp size={14} className="text-success" />,
    stable: <span className="text-grey">-</span>,
    declining: <TrendingUp size={14} className="text-warning rotate-180" />,
  };

  return (
    <Card variant="outlined" padding="md" className="bg-gradient-to-br from-teal/5 to-purple/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock size={16} className="text-teal" />
          Completion Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-grey">Estimated Days</span>
          <span className="font-bold text-navy text-lg">{estimate.estimatedDays}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-grey">Total Hours</span>
          <span className="font-medium text-navy">{estimate.estimatedHours}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-grey">Daily Average</span>
          <span className="font-medium text-navy">{estimate.averageDailyMinutes}min/day</span>
        </div>
        {velocity && (
          <div className="flex items-center justify-between pt-2 border-t border-grey/10">
            <span className="text-xs text-grey">Learning Trend</span>
            <span className="flex items-center gap-1 font-medium text-navy capitalize">
              {trendIcon[velocity.trend]}
              {velocity.trend}
            </span>
          </div>
        )}
        <div className="pt-2">
          <p className="text-xs text-grey">
            Target:{' '}
            <span className="font-medium text-navy">
              {estimate.completionDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// FAST TRACK CARD
// ============================================

function FastTrackCard({
  fastTrack,
  onFastTrack,
}: {
  fastTrack: FastTrackEligibility;
  onFastTrack?: () => void;
}) {
  if (!fastTrack.eligible && fastTrack.skillsToSkip.length === 0) {
    return null;
  }

  return (
    <Card
      variant="outlined"
      padding="md"
      className={cn(
        'border-2',
        fastTrack.eligible
          ? 'bg-purple-50 border-purple-200'
          : 'bg-light-grey/50 border-grey/20'
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award size={16} className={fastTrack.eligible ? 'text-purple-600' : 'text-grey'} />
          Fast Track
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-rich-black/70 mb-3">{fastTrack.reason}</p>

        {fastTrack.eligible && (
          <>
            <div className="flex items-center justify-between mb-3 p-2 bg-white rounded">
              <span className="text-xs text-grey">Time Saved</span>
              <span className="font-bold text-purple-600">
                {Math.round(fastTrack.timeSavedMinutes / 60 * 10) / 10}h
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={onFastTrack}
              leftIcon={<Sparkles size={14} />}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Enable Fast Track
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PathVisualization({
  userId,
  courseId = 'ai-at-work',
  onSkillClick,
  onFastTrack,
  className,
}: PathVisualizationProps) {
  const [data, setData] = useState<PathData>({
    path: null,
    estimate: null,
    fastTrack: null,
    velocity: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPathData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/path/optimized?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(courseId)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch path data');
        }

        const result = await response.json();

        if (result.success) {
          setData({
            path: result.path,
            estimate: result.estimate
              ? {
                  ...result.estimate,
                  completionDate: new Date(result.estimate.completionDate),
                }
              : null,
            fastTrack: result.fastTrack,
            velocity: result.velocity,
          });
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Error fetching path data:', err);
        setError('Unable to load learning path');
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchPathData();
    }
  }, [userId, courseId]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="bg-light-grey rounded-xl h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card variant="outlined" padding="md" className={className}>
        <div className="text-center py-8">
          <p className="text-grey">{error}</p>
        </div>
      </Card>
    );
  }

  // No data state
  if (!data.path || data.path.skills.length === 0) {
    return (
      <Card variant="outlined" padding="md" className={className}>
        <div className="text-center py-8">
          <p className="text-grey">No learning path available</p>
        </div>
      </Card>
    );
  }

  const { path, estimate, fastTrack, velocity } = data;

  // Path type badge
  const pathTypeBadge = {
    standard: { label: 'Standard Path', color: 'bg-navy text-white' },
    accelerated: { label: 'Accelerated', color: 'bg-teal text-white' },
    remedial: { label: 'Foundation', color: 'bg-yellow text-navy' },
  };

  const badge = pathTypeBadge[path.pathType];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Card */}
      <Card variant="elevated" padding="md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Learning Path</CardTitle>
            <span className={cn('px-2 py-1 rounded text-xs font-medium', badge.color)}>
              {badge.label}
            </span>
          </div>
          <CardDescription>{path.reasoning}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-grey">
              {path.skills.length} skills
            </span>
            <span className="text-grey">|</span>
            <span className="text-grey">
              ~{path.estimatedCompletionHours}h total
            </span>
            {path.skills.filter((s) => s.canSkip).length > 0 && (
              <>
                <span className="text-grey">|</span>
                <span className="text-purple-600 font-medium">
                  {path.skills.filter((s) => s.canSkip).length} skippable
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Path Visualization */}
        <Card variant="outlined" padding="md" className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Skills Path</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto pr-2">
            {path.skills.map((skill, index) => (
              <SkillNode
                key={skill.skillId}
                skill={skill}
                index={index}
                isFirst={index === 0}
                isLast={index === path.skills.length - 1}
                onClick={() => onSkillClick?.(skill.skillId)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Side Cards */}
        <div className="space-y-4">
          {estimate && (
            <CompletionEstimateCard estimate={estimate} velocity={velocity} />
          )}
          {fastTrack && (
            <FastTrackCard fastTrack={fastTrack} onFastTrack={onFastTrack} />
          )}
        </div>
      </div>
    </div>
  );
}

export { SkillNode, CompletionEstimateCard, FastTrackCard };
