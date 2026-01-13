'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Target, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

export type SkillGap = {
  skillId: string;
  skillName: string;
  currentMastery: number;
  targetMastery: number;
  gap: number;
  reason: string;
  lessonId?: string;
};

type SkillGapAnalysisProps = {
  gaps: SkillGap[];
  onPracticeSkill?: (skillId: string, lessonId?: string) => void;
  maxItems?: number;
  className?: string;
};

const MASTERY_THRESHOLDS = {
  critical: 0.3, // Below 30% - red
  warning: 0.6,  // 30-60% - yellow
  good: 0.8,     // 60-80% - teal
  mastered: 0.95 // 80%+ - green
};

function getMasteryLevel(mastery: number): {
  color: string;
  bgColor: string;
  label: string;
  barColor: 'teal' | 'yellow' | 'success' | 'navy';
} {
  if (mastery < MASTERY_THRESHOLDS.critical) {
    return {
      color: 'text-error',
      bgColor: 'bg-error/10',
      label: 'Needs Work',
      barColor: 'navy',
    };
  }
  if (mastery < MASTERY_THRESHOLDS.warning) {
    return {
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: 'Developing',
      barColor: 'yellow',
    };
  }
  if (mastery < MASTERY_THRESHOLDS.good) {
    return {
      color: 'text-teal',
      bgColor: 'bg-teal/10',
      label: 'Good',
      barColor: 'teal',
    };
  }
  return {
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Strong',
    barColor: 'success',
  };
}

export function SkillGapAnalysis({
  gaps,
  onPracticeSkill,
  maxItems = 5,
  className,
}: SkillGapAnalysisProps) {
  // Sort gaps by severity (largest gap first)
  const sortedGaps = useMemo(() => {
    return [...gaps]
      .sort((a, b) => b.gap - a.gap)
      .slice(0, maxItems);
  }, [gaps, maxItems]);

  const weakestSkill = sortedGaps[0];

  if (gaps.length === 0) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
            <Target size={20} className="text-teal" />
          </div>
          <div>
            <CardTitle>Skill Gap Analysis</CardTitle>
            <CardDescription>Areas that need your attention</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-grey">
            <Target size={32} className="mb-2 text-success" />
            <p className="font-medium text-success">Great job!</p>
            <p className="text-sm">No significant skill gaps detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
            <TrendingDown size={20} className="text-warning" />
          </div>
          <div>
            <CardTitle>Skill Gap Analysis</CardTitle>
            <CardDescription>Areas that need your attention</CardDescription>
          </div>
        </div>
        {sortedGaps.length > 0 && onPracticeSkill && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Zap size={16} />}
            onClick={() => onPracticeSkill(weakestSkill.skillId, weakestSkill.lessonId)}
          >
            Practice Weakest
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedGaps.map((skill, index) => {
            const level = getMasteryLevel(skill.currentMastery);
            const gapPercent = Math.round(skill.gap * 100);

            return (
              <motion.div
                key={skill.skillId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-3 rounded-lg transition-all',
                  level.bgColor,
                  'hover:shadow-sm'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-navy">{skill.skillName}</h4>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-error/20 text-error">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-grey mt-0.5">{skill.reason}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-sm font-bold', level.color)}>
                      {Math.round(skill.currentMastery * 100)}%
                    </div>
                    <div className="text-xs text-grey">
                      Gap: {gapPercent}%
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <ProgressBar
                    value={skill.currentMastery * 100}
                    color={level.barColor}
                    size="sm"
                  />
                  {/* Target marker */}
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-grey/50"
                    style={{ left: `${skill.targetMastery * 100}%` }}
                    title={`Target: ${Math.round(skill.targetMastery * 100)}%`}
                  />
                </div>

                {onPracticeSkill && index > 0 && (
                  <button
                    onClick={() => onPracticeSkill(skill.skillId, skill.lessonId)}
                    className="mt-2 text-xs text-teal hover:text-teal-dark font-medium transition-colors"
                  >
                    Practice this skill
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {gaps.length > maxItems && (
          <p className="text-xs text-grey text-center mt-4">
            Showing top {maxItems} of {gaps.length} skill gaps
          </p>
        )}

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-4"
        >
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-grey">
              Focus on <span className="font-medium text-navy">{weakestSkill.skillName}</span> to
              improve your overall mastery by up to {Math.round(weakestSkill.gap * 100)}%
            </span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default SkillGapAnalysis;
