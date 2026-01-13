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
          <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
            <Clock size={20} className="text-teal" />
          </div>
          <div>
            <CardTitle>Time to Mastery</CardTitle>
            <CardDescription>Estimated completion predictions</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-grey">
            <Clock size={32} className="mb-2 text-success" />
            <p className="font-medium text-success">All skills mastered!</p>
            <p className="text-sm">Keep reviewing to maintain mastery</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
            <Clock size={20} className="text-teal" />
          </div>
          <div>
            <CardTitle>Time to Mastery</CardTitle>
            <CardDescription>Estimated completion predictions</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple/10">
          <Zap size={14} className="text-purple" />
          <span className="text-sm font-medium text-purple">
            {(avgVelocity * 100).toFixed(1)}%/day
          </span>
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
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-light-grey/50 hover:bg-light-grey transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-navy truncate">{skill.skillName}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-grey">
                        {Math.round(skill.currentMastery * 100)}% / {Math.round(skill.targetMastery * 100)}%
                      </span>
                      {skill.confidence >= 0.8 && (
                        <span className="text-xs text-success">High confidence</span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                    colors.bg
                  )}>
                    <Calendar size={12} className={colors.text} />
                    <span className={cn('text-sm font-medium', colors.text)}>
                      {formatDays(skill.estimatedDays)}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <ProgressBar
                    value={progress}
                    color={progress >= 80 ? 'success' : 'teal'}
                    size="xs"
                    animated={false}
                  />
                </div>

                {/* Velocity indicator */}
                <div className="flex items-center justify-between mt-1.5 text-xs text-grey">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} />
                    <span>{(skill.learningVelocity * 100).toFixed(1)}%/day</span>
                  </div>
                  <span>{Math.round(skill.confidence * 100)}% confident</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {predictions.length > maxItems && (
          <p className="text-xs text-grey text-center mt-4">
            Showing {maxItems} of {predictions.filter(p => p.currentMastery < p.targetMastery).length} skills in progress
          </p>
        )}

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-4"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-grey">
              At your current pace, you will master {sortedPredictions.length} skill{sortedPredictions.length !== 1 ? 's' : ''} within:
            </span>
            <span className="font-medium text-navy">
              {formatDays(Math.max(...sortedPredictions.map(s => s.estimatedDays)))}
            </span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default TimeToMasteryWidget;
