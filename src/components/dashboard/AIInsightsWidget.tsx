'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircularProgress } from '@/components/ui/ProgressBar';
import { WhyExplanation } from './WhyExplanation';
import { cn } from '@/lib/utils';
import { getIdToken } from '@/lib/firebase/auth';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * AI Insights Response Type
 */
interface AIInsights {
  velocity: {
    atomsPerHour: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    percentChange: number;
  };
  completion: {
    predictedDate: string;
    confidence: number;
    daysRemaining: number;
  };
  skills: {
    strongest: {
      name: string;
      mastery: number;
      reason: string;
    };
    focusArea: {
      name: string;
      mastery: number;
      reason: string;
    };
  };
  averageDailyMinutes: number;
  modelInfo: {
    type: 'BKT' | 'Hybrid' | 'DKT';
    version: string;
    lastUpdated: string;
  };
}

type AIInsightsWidgetProps = {
  userId: string | null;
  className?: string;
};

/**
 * AIInsightsWidget Component
 *
 * Displays ML-driven insights about the user's learning:
 * - Learning velocity with trend
 * - Predicted completion date
 * - Strongest skill
 * - Focus area recommendation
 * All with "why" explanations
 */
export function AIInsightsWidget({ userId, className }: AIInsightsWidgetProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (showRefresh = false) => {
    if (!userId) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/dashboard/insights?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.data);
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError('Unable to load AI insights');
      // No mock data - show empty state instead
      setInsights(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Don't render if no user
  if (!userId) return null;

  // Loading state - Enhanced skeleton with shimmer
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className={cn('relative overflow-hidden', className)}>
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple/10 to-teal/10 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-grey/10 rounded animate-pulse" />
                <div className="h-3 w-32 bg-grey/10 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-8 h-8 bg-grey/10 rounded animate-pulse" />
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-grey/5 animate-pulse space-y-3">
                <div className="h-3 w-24 bg-grey/10 rounded" />
                <div className="h-6 w-16 bg-grey/10 rounded" />
                <div className="h-3 w-20 bg-grey/10 rounded" />
              </div>
            ))}
          </div>

          {/* Skills skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-grey/5 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-grey/10 rounded" />
                  <div className="h-4 w-10 bg-grey/10 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-grey/10 rounded" />
                <div className="h-8 bg-grey/10 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Bottom section skeleton */}
          <div className="flex justify-between p-3 bg-grey/5 rounded-lg animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-grey/10 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-grey/10 rounded" />
                <div className="h-3 w-32 bg-grey/10 rounded" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="h-5 w-12 bg-grey/10 rounded ml-auto" />
              <div className="h-3 w-16 bg-grey/10 rounded ml-auto" />
            </div>
          </div>
        </div>

        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'linear',
          }}
        />
      </Card>
    );
  }

  // Error state - show helpful message
  if (error && !insights) {
    return (
      <Card variant="outlined" padding="lg" className={cn('border-purple/20 bg-purple/5', className)}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple/10 flex items-center justify-center">
            <Brain size={20} className="text-purple" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-navy">AI Insights Not Available</p>
            <p className="text-xs text-rich-black/60">Complete more lessons to unlock personalized learning insights.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchInsights()}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  const { velocity, completion, skills, averageDailyMinutes, modelInfo } = insights;

  // Trend icon and color
  const getTrendConfig = (trend: 'increasing' | 'stable' | 'decreasing') => {
    switch (trend) {
      case 'increasing':
        return { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', label: 'Improving' };
      case 'decreasing':
        return { icon: TrendingDown, color: 'text-yellow-dark', bg: 'bg-yellow-light', label: 'Slowing' };
      default:
        return { icon: Target, color: 'text-teal', bg: 'bg-teal/10', label: 'Steady' };
    }
  };

  const trendConfig = getTrendConfig(velocity.trend);
  const TrendIcon = trendConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card
        variant="elevated"
        padding="lg"
        className="bg-gradient-to-br from-purple/5 via-teal/5 to-white border-2 border-purple/10"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-teal flex items-center justify-center">
                <Brain size={20} className="text-white" />
              </div>
              <div>
                <span className="text-lg">AI Learning Insights</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Sparkles size={12} className="text-purple" />
                  <span className="text-xs text-rich-black/50 font-normal">
                    Powered by {modelInfo.type} Model v{modelInfo.version}
                  </span>
                </div>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInsights(true)}
              disabled={isRefreshing}
              className="p-2"
            >
              <RefreshCw
                size={16}
                className={cn('text-rich-black/50', isRefreshing && 'animate-spin')}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Stats Grid - Enhanced with hover effects */}
          <div className="grid grid-cols-2 gap-4">
            {/* Learning Velocity */}
            <motion.div
              className="group p-4 rounded-xl bg-white border border-grey/20 shadow-sm hover:shadow-lg hover:border-yellow/30 transition-all cursor-default"
              whileHover={!prefersReducedMotion ? { y: -2, scale: 1.02 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-yellow/10 group-hover:bg-yellow/20 transition-colors">
                  <Zap size={14} className="text-yellow-dark" />
                </div>
                <span className="text-xs font-semibold text-rich-black/60 uppercase tracking-wider">
                  Learning Velocity
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-navy tabular-nums">
                  {velocity.atomsPerHour.toFixed(1)}
                </span>
                <span className="text-sm text-rich-black/50 font-medium">atoms/hr</span>
              </div>
              <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full w-fit', trendConfig.bg)}>
                <TrendIcon size={12} className={trendConfig.color} />
                <span className={cn('text-xs font-semibold', trendConfig.color)}>
                  {trendConfig.label}
                  {velocity.percentChange !== 0 && (
                    <span className="ml-1">
                      ({velocity.percentChange > 0 ? '+' : ''}
                      {velocity.percentChange}%)
                    </span>
                  )}
                </span>
              </div>
            </motion.div>

            {/* Predicted Completion */}
            <motion.div
              className="group p-4 rounded-xl bg-white border border-grey/20 shadow-sm hover:shadow-lg hover:border-purple/30 transition-all cursor-default"
              whileHover={!prefersReducedMotion ? { y: -2, scale: 1.02 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-purple/10 group-hover:bg-purple/20 transition-colors">
                  <Calendar size={14} className="text-purple" />
                </div>
                <span className="text-xs font-semibold text-rich-black/60 uppercase tracking-wider">
                  Est. Completion
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CircularProgress
                  value={completion.confidence}
                  size={48}
                  strokeWidth={5}
                  color={completion.confidence >= 70 ? 'teal' : 'yellow'}
                />
                <div>
                  <p className="text-2xl font-bold text-navy tabular-nums">{completion.daysRemaining}</p>
                  <p className="text-xs text-rich-black/50 font-medium mt-0.5">
                    days · {new Date(completion.predictedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Skills Insights - Enhanced with hover effects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Strongest Skill */}
            <motion.div
              className="group p-4 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 hover:border-success/30 hover:shadow-md transition-all cursor-default"
              whileHover={!prefersReducedMotion ? { y: -1, scale: 1.01 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-success/20 group-hover:scale-110 transition-transform">
                    <TrendingUp size={12} className="text-success" />
                  </div>
                  <span className="text-xs font-bold text-success uppercase tracking-wider">
                    Strongest Skill
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-success/20">
                  <span className="text-sm font-bold text-success tabular-nums">{skills.strongest.mastery}%</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-navy mb-3 group-hover:text-success transition-colors">
                {skills.strongest.name}
              </p>
              <WhyExplanation
                reason={skills.strongest.reason}
                confidence={skills.strongest.mastery}
                variant="compact"
              />
            </motion.div>

            {/* Focus Area */}
            <motion.div
              className="group p-4 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 hover:border-warning/30 hover:shadow-md transition-all cursor-default"
              whileHover={!prefersReducedMotion ? { y: -1, scale: 1.01 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-warning/20 group-hover:scale-110 transition-transform">
                    <Target size={12} className="text-warning" />
                  </div>
                  <span className="text-xs font-bold text-warning uppercase tracking-wider">
                    Focus Area
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-warning/20">
                  <span className="text-sm font-bold text-warning tabular-nums">{skills.focusArea.mastery}%</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-navy mb-3 group-hover:text-warning transition-colors">
                {skills.focusArea.name}
              </p>
              <WhyExplanation
                reason={skills.focusArea.reason}
                confidence={60}
                modelInfo={modelInfo.type}
                variant="compact"
              />
            </motion.div>
          </div>

          {/* Daily Study Time - Enhanced */}
          <motion.div
            className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal/5 to-purple/5 border border-teal/10 hover:border-teal/20 hover:shadow-md transition-all cursor-default"
            whileHover={!prefersReducedMotion ? { y: -1, scale: 1.005 } : undefined}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal to-teal-light flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">Avg. Daily Study</p>
                <p className="text-xs text-rich-black/60">Based on recent activity</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-navy tabular-nums">{averageDailyMinutes}</p>
              <p className="text-xs text-rich-black/50 font-medium mt-0.5">min/day</p>
            </div>
          </motion.div>

          {/* Why Explanation for Overall Insights */}
          <WhyExplanation
            reason={`Based on ${averageDailyMinutes} minutes of daily study and your ${velocity.trend} learning velocity, you're on track for completion in ${completion.daysRemaining} days. Focus on ${skills.focusArea.name} to maintain progress.`}
            confidence={completion.confidence}
            modelInfo={`${modelInfo.type} Model`}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => router.push('/mastery')}
            >
              View Skill Map
            </Button>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight size={14} />}
              onClick={() => router.push('/learn')}
            >
              Continue Learning
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AIInsightsWidget;
