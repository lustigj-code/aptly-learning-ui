'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Target, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
  const prefersReducedMotion = useReducedMotion();
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-success flex items-center justify-center shadow-sm">
            <Target size={20} className="text-white" />
          </div>
          <div>
            <CardTitle>Skill Gap Analysis</CardTitle>
            <CardDescription>Areas that need your attention</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-br from-success/5 to-teal/5 rounded-xl border border-success/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
              <Target size={32} className="text-success" />
            </div>
            <p className="font-bold text-success text-lg mb-1">Great job!</p>
            <p className="text-sm text-rich-black/60">No significant skill gaps detected</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-warning to-error flex items-center justify-center shadow-sm">
            <TrendingDown size={20} className="text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Skill Gap Analysis</CardTitle>
            <CardDescription className="mt-0.5">Areas that need your attention</CardDescription>
          </div>
        </div>
        {sortedGaps.length > 0 && onPracticeSkill && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Zap size={16} />}
            onClick={() => onPracticeSkill(weakestSkill.skillId, weakestSkill.lessonId)}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            Practice Weakest
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedGaps.map((skill, index) => {
            const level = getMasteryLevel(skill.currentMastery);
            const gapPercent = Math.round(skill.gap * 100);

            return (
              <motion.div
                key={skill.skillId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={!prefersReducedMotion ? { y: -2, scale: 1.01 } : undefined}
                className={cn(
                  'group relative p-4 rounded-xl border transition-all cursor-default',
                  level.bgColor,
                  index === 0 ? 'border-error/30 shadow-sm' : 'border-transparent',
                  'hover:shadow-md hover:border-opacity-50'
                )}
              >
                {/* Priority indicator bar */}
                {index === 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-error rounded-l-xl" />
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-navy group-hover:text-teal transition-colors truncate">
                        {skill.skillName}
                      </h4>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-error/20 text-error flex-shrink-0 animate-pulse">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rich-black/60 leading-relaxed">{skill.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-lg font-bold tabular-nums', level.color)}>
                      {Math.round(skill.currentMastery * 100)}%
                    </div>
                    <div className="text-xs text-rich-black/50 font-medium">
                      gap: {gapPercent}%
                    </div>
                  </div>
                </div>

                {/* Enhanced progress bar with target marker */}
                <div className="relative mb-2">
                  <ProgressBar
                    value={skill.currentMastery * 100}
                    color={level.barColor}
                    size="sm"
                  />
                  {/* Target marker with tooltip */}
                  <div className="group/marker relative">
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-navy/60 rounded-full shadow-sm hover:bg-navy transition-colors"
                      style={{ left: `${skill.targetMastery * 100}%` }}
                    />
                    <div
                      className="absolute bottom-full mb-1 px-2 py-1 bg-navy text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none z-10"
                      style={{ left: `${skill.targetMastery * 100}%`, transform: 'translateX(-50%)' }}
                    >
                      Target: {Math.round(skill.targetMastery * 100)}%
                    </div>
                  </div>
                </div>

                {/* Practice button */}
                {onPracticeSkill && (
                  <button
                    onClick={() => onPracticeSkill(skill.skillId, skill.lessonId)}
                    className={cn(
                      'text-xs text-teal hover:text-teal-dark font-semibold transition-colors flex items-center gap-1 group-hover:underline',
                      index === 0 && 'opacity-0'
                    )}
                  >
                    <Zap size={12} />
                    Practice this skill
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {gaps.length > maxItems && (
          <p className="text-xs text-rich-black/50 text-center mt-4 font-medium">
            Showing top {maxItems} of {gaps.length} skill gaps
          </p>
        )}

        {/* Summary - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-4 border-t border-grey/20"
        >
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-warning/5 to-error/5 rounded-lg border border-warning/20">
            <div className="p-1.5 bg-warning/20 rounded-lg flex-shrink-0">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                Recommended Focus
              </p>
              <p className="text-sm text-rich-black/70 leading-relaxed">
                Practice <span className="font-bold text-navy">{weakestSkill.skillName}</span> to
                improve your overall mastery by up to <span className="font-bold text-warning">{Math.round(weakestSkill.gap * 100)}%</span>
              </p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default SkillGapAnalysis;
