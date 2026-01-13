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

  // Loading state
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className={cn('animate-pulse', className)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-grey/20 rounded-lg" />
            <div className="h-6 w-32 bg-grey/20 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-grey/20 rounded-lg" />
            <div className="h-24 bg-grey/20 rounded-lg" />
          </div>
          <div className="h-20 bg-grey/20 rounded-lg" />
        </div>
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
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Learning Velocity */}
            <div className="p-4 rounded-xl bg-white border border-grey/20 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-yellow-dark" />
                <span className="text-xs font-medium text-rich-black/60 uppercase tracking-wide">
                  Learning Velocity
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy">
                  {velocity.atomsPerHour.toFixed(1)}
                </span>
                <span className="text-sm text-rich-black/50">atoms/hr</span>
              </div>
              <div className={cn('flex items-center gap-1 mt-1', trendConfig.color)}>
                <TrendIcon size={14} />
                <span className="text-xs font-medium">
                  {trendConfig.label}
                  {velocity.percentChange !== 0 && (
                    <span className="ml-1">
                      ({velocity.percentChange > 0 ? '+' : ''}
                      {velocity.percentChange}%)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Predicted Completion */}
            <div className="p-4 rounded-xl bg-white border border-grey/20 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-purple" />
                <span className="text-xs font-medium text-rich-black/60 uppercase tracking-wide">
                  Est. Completion
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CircularProgress
                  value={completion.confidence}
                  size={44}
                  strokeWidth={4}
                  color={completion.confidence >= 70 ? 'teal' : 'yellow'}
                />
                <div>
                  <p className="text-lg font-bold text-navy">{completion.daysRemaining} days</p>
                  <p className="text-xs text-rich-black/50">
                    {new Date(completion.predictedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Strongest Skill */}
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-success uppercase tracking-wide">
                  Strongest Skill
                </span>
                <span className="text-sm font-bold text-success">{skills.strongest.mastery}%</span>
              </div>
              <p className="text-sm font-medium text-navy mb-2">{skills.strongest.name}</p>
              <WhyExplanation
                reason={skills.strongest.reason}
                confidence={skills.strongest.mastery}
                variant="compact"
              />
            </div>

            {/* Focus Area */}
            <div className="p-3 rounded-lg bg-yellow/5 border border-yellow/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-yellow uppercase tracking-wide">
                  Focus Area
                </span>
                <span className="text-sm font-bold text-yellow">{skills.focusArea.mastery}%</span>
              </div>
              <p className="text-sm font-medium text-navy mb-2">{skills.focusArea.name}</p>
              <WhyExplanation
                reason={skills.focusArea.reason}
                confidence={60}
                modelInfo={modelInfo.type}
                variant="compact"
              />
            </div>
          </div>

          {/* Daily Study Time */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-light-grey/50">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <Target size={18} className="text-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">Avg. Daily Study</p>
                <p className="text-xs text-rich-black/50">Based on your recent activity</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-navy">{averageDailyMinutes}</p>
              <p className="text-xs text-rich-black/50">min/day</p>
            </div>
          </div>

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
