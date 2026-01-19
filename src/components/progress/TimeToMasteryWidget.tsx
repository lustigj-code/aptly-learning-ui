'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Calendar, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

export type SkillPrediction = {
  skillId: string;
  skillName: string;
  currentMastery: number;
  targetMastery: number;
  estimatedDays: number;
  learningVelocity: number; // Mastery gain per day
  confidence: number; // 0-1
};

type TimeToMasteryWidgetProps = {
  predictions: SkillPrediction[];
  maxItems?: number;
  className?: string;
};

function getDaysColor(days: number): {
  text: string;
  bg: string;
} {
  if (days <= 3) {
    return { text: 'text-success', bg: 'bg-success/10' };
  }
  if (days <= 7) {
    return { text: 'text-teal', bg: 'bg-teal/10' };
  }
  if (days <= 14) {
    return { text: 'text-yellow-dark', bg: 'bg-yellow-light' };
  }
  return { text: 'text-warning', bg: 'bg-warning/10' };
}

function formatDays(days: number): string {
  if (days < 1) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 14) return '1-2 weeks';
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} month${days >= 60 ? 's' : ''}`;
}

export function TimeToMasteryWidget({
  predictions,
  maxItems = 5,
  className,
}: TimeToMasteryWidgetProps) {
  // Sort by estimated days (fastest first)
  const sortedPredictions = useMemo(() => {
    return [...predictions]
      .filter(p => p.currentMastery < p.targetMastery)
      .sort((a, b) => a.estimatedDays - b.estimatedDays)
      .slice(0, maxItems);
  }, [predictions, maxItems]);

  // Calculate average velocity
  const avgVelocity = useMemo(() => {
    if (predictions.length === 0) return 0;
    const sum = predictions.reduce((acc, p) => acc + p.learningVelocity, 0);
    return sum / predictions.length;
  }, [predictions]);

  if (predictions.length === 0 || sortedPredictions.length === 0) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-success flex items-center justify-center shadow-sm">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <CardTitle>Time to Mastery</CardTitle>
            <CardDescription>Estimated completion predictions</CardDescription>
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
              <Clock size={32} className="text-success" />
            </div>
            <p className="font-bold text-success text-lg mb-1">All skills mastered!</p>
            <p className="text-sm text-rich-black/60">Keep reviewing to maintain mastery</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal to-purple flex items-center justify-center shadow-sm">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Time to Mastery</CardTitle>
            <CardDescription className="mt-0.5">Estimated completion predictions</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple/10 to-teal/10 border border-purple/20 shadow-sm">
          <Zap size={14} className="text-purple" />
          <span className="text-sm font-bold text-purple tabular-nums">
            {(avgVelocity * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-rich-black/50 font-medium">/day</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPredictions.map((skill, index) => {
            const colors = getDaysColor(skill.estimatedDays);
            const progress = Math.round((skill.currentMastery / skill.targetMastery) * 100);

            return (
              <motion.div
                key={skill.skillId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className="group p-4 rounded-xl bg-white border border-grey/20 hover:border-teal/30 hover:shadow-md transition-all cursor-default"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="font-semibold text-navy truncate group-hover:text-teal transition-colors mb-1">
                      {skill.skillName}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-rich-black/60 font-medium tabular-nums">
                        {Math.round(skill.currentMastery * 100)}% → {Math.round(skill.targetMastery * 100)}%
                      </span>
                      {skill.confidence >= 0.8 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-success/10 text-xs font-semibold text-success">
                          High confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 shadow-sm',
                    colors.bg,
                    'group-hover:scale-105 transition-transform'
                  )}>
                    <Calendar size={14} className={colors.text} />
                    <span className={cn('text-sm font-bold', colors.text)}>
                      {formatDays(skill.estimatedDays)}
                    </span>
                  </div>
                </div>

                {/* Enhanced progress bar */}
                <div className="relative mb-3">
                  <ProgressBar
                    value={progress}
                    color={progress >= 80 ? 'success' : 'teal'}
                    size="sm"
                    animated={true}
                  />
                </div>

                {/* Velocity and confidence indicators - Enhanced */}
                <div className="flex items-center justify-between pt-2 border-t border-grey/10">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple/5 rounded-full">
                    <TrendingUp size={12} className="text-purple" />
                    <span className="text-xs font-semibold text-purple tabular-nums">
                      +{(skill.learningVelocity * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-rich-black/50 font-medium">/day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 bg-grey/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-teal rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.confidence * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-teal tabular-nums">
                      {Math.round(skill.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {predictions.length > maxItems && (
          <p className="text-xs text-rich-black/50 text-center mt-4 font-medium">
            Showing {maxItems} of {predictions.filter(p => p.currentMastery < p.targetMastery).length} skills in progress
          </p>
        )}

        {/* Summary - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-4 border-t border-grey/20"
        >
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-teal/5 to-purple/5 rounded-lg border border-teal/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal/20 rounded-lg">
                <Clock size={14} className="text-teal" />
              </div>
              <span className="text-sm text-rich-black/70">
                At your current pace, you&apos;ll master <span className="font-bold text-navy">{sortedPredictions.length}</span> skill{sortedPredictions.length !== 1 ? 's' : ''} within:
              </span>
            </div>
            <div className="px-3 py-1.5 bg-teal/10 rounded-full">
              <span className="text-base font-bold text-teal">
                {formatDays(Math.max(...sortedPredictions.map(s => s.estimatedDays)))}
              </span>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default TimeToMasteryWidget;
