/**
 * Reviews Due Card
 *
 * Shows spaced repetition review status on dashboard.
 * Links to full review page for session.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, ChevronRight, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircularProgress } from '@/components/ui/ProgressBar';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface ReviewStats {
  dueCount: number;
  overdueCount: number;
  avgMastery: number;
  estimatedMinutes: number;
  nextReviewDate?: string;
}

export function ReviewDueCard() {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviewStats = useCallback(async () => {
    if (!firebaseUser) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/review/due?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        const now = new Date();

        // Calculate stats from items
        const dueCount = items.length;
        const overdueCount = items.filter((item: { dueDate?: string }) => {
          if (!item.dueDate) return false;
          return new Date(item.dueDate) < now;
        }).length;

        const avgMastery = items.length > 0
          ? items.reduce((sum: number, item: { masteryLevel?: number }) => sum + (item.masteryLevel || 0), 0) / items.length
          : 0;

        // Estimate ~30 seconds per review
        const estimatedMinutes = Math.ceil(dueCount * 0.5);

        // Find next review date
        const nextReviewDate = items.length > 0 && items[0].dueDate
          ? items[0].dueDate
          : undefined;

        setStats({
          dueCount,
          overdueCount,
          avgMastery,
          estimatedMinutes,
          nextReviewDate,
        });
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchReviewStats();
  }, [fetchReviewStats]);

  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className="bg-white">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-grey/20 rounded w-1/3" />
          <div className="h-16 bg-grey/20 rounded" />
        </div>
      </Card>
    );
  }

  // No reviews due - show positive message
  if (!stats || stats.dueCount === 0) {
    return (
      <Card variant="elevated" padding="lg" className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-teal" />
            Spaced Repetition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="font-medium text-navy">All caught up!</p>
              <p className="text-sm text-rich-black/60">No reviews due right now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has reviews due
  const hasOverdue = stats.overdueCount > 0;
  const urgency = hasOverdue ? 'high' : stats.dueCount > 10 ? 'medium' : 'low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        variant="elevated"
        padding="lg"
        className={cn(
          'bg-gradient-to-br border-2',
          urgency === 'high'
            ? 'from-yellow/5 to-error/5 border-yellow/30'
            : urgency === 'medium'
            ? 'from-purple/5 to-teal/5 border-purple/30'
            : 'from-teal/5 to-white border-teal/30'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-teal" />
              Daily Review
            </CardTitle>
            {hasOverdue && (
              <span className="text-xs font-medium text-yellow-dark bg-yellow/20 px-2 py-1 rounded-full">
                {stats.overdueCount} overdue
              </span>
            )}
          </div>
          <CardDescription>
            Strengthen your memory with spaced repetition
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircularProgress
                value={stats.avgMastery}
                size={56}
                strokeWidth={6}
                color={stats.avgMastery >= 70 ? 'teal' : stats.avgMastery >= 50 ? 'yellow' : 'navy'}
              />
              <div>
                <p className="text-2xl font-bold text-navy">{stats.dueCount}</p>
                <p className="text-sm text-rich-black/60">reviews due</p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-rich-black/60 text-sm">
                <Clock size={14} />
                <span>~{stats.estimatedMinutes} min</span>
              </div>
              <p className="text-xs text-rich-black/40 mt-1">
                {Math.round(stats.avgMastery)}% avg mastery
              </p>
            </div>
          </div>

          {/* Benefits reminder */}
          <div className="flex items-start gap-2 p-3 bg-teal/5 rounded-lg border border-teal/20">
            <Sparkles size={16} className="text-teal mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rich-black/70">
              Reviewing at optimal intervals increases long-term retention by up to <strong>50%</strong>
            </p>
          </div>

          {/* CTA */}
          <Button
            variant="primary"
            fullWidth
            rightIcon={<ChevronRight size={18} />}
            onClick={() => router.push('/review')}
          >
            Start Reviewing
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ReviewDueCard;
