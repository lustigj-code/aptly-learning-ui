'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Award,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircularProgress } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import type { ExamReadinessResult } from '@/lib/mastery/examReadiness';

type ExamReadinessWidgetProps = {
  examDate: Date;
  targetRetention: number;
  userId: string;
};

export function ExamReadinessWidget({
  examDate,
  targetRetention,
  userId,
}: ExamReadinessWidgetProps) {
  const router = useRouter();
  const [readiness, setReadiness] = useState<ExamReadinessResult | null>(null);
  const [avgMastery, setAvgMastery] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReadinessData() {
      try {
        // Get auth token from Firebase
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setIsLoading(false);
          return;
        }

        const token = await user.getIdToken();

        // Fetch mastery map data which includes ML predictions
        const response = await fetch(`/api/mastery/map?userId=${userId}&courseId=ai-at-work`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Calculate average mastery from nodes
          if (data.data?.nodes && data.data.nodes.length > 0) {
            const nodes = data.data.nodes;
            const totalMastery = nodes.reduce((sum: number, n: { mlMastery?: number; mastery?: number }) => sum + (n.mlMastery ?? n.mastery ?? 0), 0);
            setAvgMastery(totalMastery / nodes.length);
          }
        }
      } catch (error) {
        console.error('Error fetching readiness data:', error);
      }

      // Calculate days until exam
      const now = new Date();
      const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Calculate readiness based on average mastery (use ML-enhanced data when available)
      const effectiveMastery = avgMastery > 0 ? avgMastery : 0.5;
      const readinessScore = Math.min(100, Math.round(effectiveMastery * 100));

      // Calculate readiness from real mastery data
      const calculatedReadiness: ExamReadinessResult = {
        overallReadiness: readinessScore,
        daysUntilExam: daysUntil,
        onTrack: daysUntil > 14 && readinessScore >= 60,
        dailyReviewsNeeded: Math.ceil(Math.max(0, 5 - daysUntil / 10)),
        conceptsAtRisk: [],
        projectedRetention: Math.min(100, targetRetention * 100 * (0.8 + effectiveMastery * 0.2)),
      };

      setReadiness(calculatedReadiness);
      setIsLoading(false);
    }

    fetchReadinessData();
  }, [examDate, targetRetention, userId, avgMastery]);

  if (isLoading || !readiness) {
    return (
      <Card variant="elevated" padding="lg" className="animate-pulse">
        <div className="h-32 bg-grey/20 rounded-lg" />
      </Card>
    );
  }

  const { overallReadiness, daysUntilExam, onTrack, dailyReviewsNeeded, projectedRetention } = readiness;

  // Determine status colors and messaging
  const getStatusConfig = () => {
    if (daysUntilExam <= 0) {
      return {
        bgGradient: 'from-grey/10 to-grey/5',
        borderColor: 'border-grey/30',
        statusText: 'Exam Complete',
        statusColor: 'text-grey',
        icon: CheckCircle,
      };
    }
    if (overallReadiness >= 90 && onTrack) {
      return {
        bgGradient: 'from-success/10 to-teal/5',
        borderColor: 'border-success/30',
        statusText: 'Excellent Progress',
        statusColor: 'text-success',
        icon: CheckCircle,
      };
    }
    if (overallReadiness >= 70 && onTrack) {
      return {
        bgGradient: 'from-teal/10 to-purple/5',
        borderColor: 'border-teal/30',
        statusText: 'On Track',
        statusColor: 'text-teal',
        icon: TrendingUp,
      };
    }
    if (daysUntilExam <= 7) {
      return {
        bgGradient: 'from-yellow-light to-error/5',
        borderColor: 'border-yellow-dark/30',
        statusText: 'Final Week',
        statusColor: 'text-yellow-dark',
        icon: AlertTriangle,
      };
    }
    return {
      bgGradient: 'from-purple/10 to-teal/5',
      borderColor: 'border-purple/30',
      statusText: 'Needs Attention',
      statusColor: 'text-purple',
      icon: Target,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        variant="elevated"
        padding="lg"
        className={cn(
          'bg-gradient-to-br border-2',
          statusConfig.bgGradient,
          statusConfig.borderColor
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award size={20} className="text-purple" />
              Exam Readiness
            </CardTitle>
            <span className={cn('text-sm font-medium flex items-center gap-1', statusConfig.statusColor)}>
              <StatusIcon size={14} />
              {statusConfig.statusText}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Stats Row */}
          <div className="flex items-center justify-between">
            {/* Readiness Circle */}
            <div className="flex items-center gap-4">
              <CircularProgress
                value={overallReadiness}
                size={80}
                strokeWidth={8}
                color={overallReadiness >= 80 ? 'teal' : overallReadiness >= 60 ? 'yellow' : 'navy'}
              />
              <div>
                <p className="text-3xl font-bold text-navy">{overallReadiness}%</p>
                <p className="text-sm text-rich-black/60">Ready</p>
              </div>
            </div>

            {/* Days Countdown */}
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Calendar size={16} className="text-purple" />
                <span className="text-2xl font-bold text-navy">{Math.max(0, daysUntilExam)}</span>
              </div>
              <p className="text-sm text-rich-black/60">
                {daysUntilExam === 1 ? 'day left' : 'days left'}
              </p>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-grey/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center">
                <Target size={16} className="text-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">{Math.round(projectedRetention)}%</p>
                <p className="text-xs text-rich-black/60">Projected Score</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                <Clock size={16} className="text-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">{dailyReviewsNeeded}/day</p>
                <p className="text-xs text-rich-black/60">Reviews needed</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => router.push('/review')}
            >
              Start Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight size={14} />}
              onClick={() => router.push('/settings')}
            >
              Settings
            </Button>
          </div>

          {/* Urgency Message */}
          {daysUntilExam > 0 && daysUntilExam <= 7 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 p-3 bg-yellow/10 rounded-lg border border-yellow/30"
            >
              <p className="text-sm text-yellow font-medium flex items-center gap-2">
                <AlertTriangle size={14} />
                Final week! Focus on your weakest concepts.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
