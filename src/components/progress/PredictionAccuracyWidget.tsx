'use client';

import { motion } from 'framer-motion';
import { Brain, Target, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

export type PredictionStats = {
  totalPredictions: number;
  correctPredictions: number;
  modelType: 'BKT' | 'Hybrid' | 'DKT';
  lastUpdated?: Date;
  confidenceScore?: number;
};

type PredictionAccuracyWidgetProps = {
  stats: PredictionStats;
  className?: string;
};

export function PredictionAccuracyWidget({
  stats,
  className,
}: PredictionAccuracyWidgetProps) {
  const accuracy = stats.totalPredictions > 0
    ? Math.round((stats.correctPredictions / stats.totalPredictions) * 100)
    : 0;

  const getAccuracyColor = (acc: number): 'success' | 'teal' | 'yellow' => {
    if (acc >= 80) return 'success';
    if (acc >= 60) return 'teal';
    return 'yellow';
  };

  const getModelDescription = (type: string): string => {
    switch (type) {
      case 'BKT':
        return 'Bayesian Knowledge Tracing';
      case 'Hybrid':
        return 'BKT + FSRS Hybrid Model';
      case 'DKT':
        return 'Deep Knowledge Tracing';
      default:
        return 'Unknown Model';
    }
  };

  const getAccuracyLabel = (acc: number): string => {
    if (acc >= 90) return 'Excellent';
    if (acc >= 80) return 'Very Good';
    if (acc >= 70) return 'Good';
    if (acc >= 60) return 'Fair';
    return 'Learning';
  };

  if (stats.totalPredictions === 0) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy/20 flex items-center justify-center">
            <Brain size={20} className="text-navy" />
          </div>
          <div>
            <CardTitle>AI Prediction Accuracy</CardTitle>
            <CardDescription>How well the AI knows your learning</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-grey">
            <Brain size={32} className="mb-2 opacity-50" />
            <p>Not enough data yet</p>
            <p className="text-sm">Complete more quizzes to train the AI</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy/20 flex items-center justify-center">
          <Brain size={20} className="text-navy" />
        </div>
        <div>
          <CardTitle>AI Prediction Accuracy</CardTitle>
          <CardDescription>How well the AI knows your learning</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Circular accuracy indicator */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <CircularProgress
              value={accuracy}
              size={100}
              strokeWidth={10}
              color={getAccuracyColor(accuracy)}
              showLabel
            />
          </motion.div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-grey">Accuracy Level</span>
                <span className={cn(
                  'text-sm font-medium',
                  accuracy >= 80 ? 'text-success' : accuracy >= 60 ? 'text-teal' : 'text-yellow'
                )}>
                  {getAccuracyLabel(accuracy)}
                </span>
              </div>
              <ProgressBar
                value={accuracy}
                color={getAccuracyColor(accuracy)}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Target size={14} className="text-grey" />
                <span className="text-grey">Predictions Made</span>
              </div>
              <span className="font-medium text-navy">
                {stats.totalPredictions.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-grey" />
                <span className="text-grey">Correct</span>
              </div>
              <span className="font-medium text-success">
                {stats.correctPredictions.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Model Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 pt-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                stats.modelType === 'Hybrid' ? 'bg-purple/20 text-purple' :
                stats.modelType === 'BKT' ? 'bg-teal/20 text-teal' :
                'bg-navy/20 text-navy'
              )}>
                {stats.modelType}
              </div>
              <span className="text-sm text-grey">
                {getModelDescription(stats.modelType)}
              </span>
            </div>

            {stats.confidenceScore !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp size={14} className="text-grey" />
                <span className="text-grey">Confidence:</span>
                <span className="font-medium text-navy">
                  {Math.round(stats.confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>

          {stats.lastUpdated && (
            <p className="text-xs text-grey/70 mt-2">
              Last updated: {new Date(stats.lastUpdated).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default PredictionAccuracyWidget;
