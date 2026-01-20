'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useUser } from '@/store/unifiedStore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineBadge } from '@/components/ui/Badge';
import { StatisticalSignificance } from '@/components/admin/StatisticalSignificance';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  RefreshCw,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';

interface MetricComparison {
  metric: string;
  controlValue: number;
  treatmentValue: number;
  absoluteDiff: number;
  percentDiff: number;
  statisticalSignificance: number;
  isSignificant: boolean;
}

interface ExperimentConfig {
  useAdaptiveSequencing: boolean;
  useStruggleDetection: boolean;
  useProactiveCoach: boolean;
  usePretests: boolean;
  useContentVariants: boolean;
  useSocraticMode?: boolean;
}

interface ExperimentDetail {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  variants: {
    control: ExperimentConfig;
    treatment: ExperimentConfig;
  };
  allocation: {
    control: number;
    treatment: number;
  };
  sampleSize: {
    target: number;
    current: { control: number; treatment: number };
  };
  metrics: string[];
  results?: {
    metrics: MetricComparison[];
    winner: 'control' | 'treatment' | 'inconclusive';
    confidence: number;
    recommendations: string[];
    calculatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  draft: { variant: 'default' as const, label: 'Draft', color: 'bg-grey' },
  running: { variant: 'success' as const, label: 'Running', color: 'bg-success' },
  paused: { variant: 'warning' as const, label: 'Paused', color: 'bg-warning' },
  completed: { variant: 'teal' as const, label: 'Completed', color: 'bg-teal' },
};

const metricLabels: Record<string, string> = {
  courseCompletionRate: 'Course Completion',
  lessonCompletionRate: 'Lesson Completion',
  sessionCompletionRate: 'Session Completion',
  atomCompletionRate: 'Atom Completion',
  skillMasteryRate: 'Skill Mastery',
  averageTimeToMastery: 'Time to Mastery (min)',
  retentionRate: 'Retention Rate',
  quizAccuracy: 'Quiz Accuracy',
  masteryVelocity: 'Mastery Velocity',
  contentSkipRate: 'Content Skip Rate',
  reviewEfficiency: 'Review Efficiency',
  interventionSuccessRate: 'Intervention Success',
  coachUtilization: 'Coach Utilization',
  'returnRate.day1': 'Day 1 Return',
  'returnRate.day7': 'Day 7 Return',
  'returnRate.day30': 'Day 30 Return',
  quiz_remediation_rate: 'Quiz Remediation Rate',
  time_to_mastery: 'Time to Mastery',
  user_satisfaction: 'User Satisfaction',
};

export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const resolvedParams = use(params);
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchExperiment = useCallback(async () => {
    try {
      setLoading(true);
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/experiments/${resolvedParams.experimentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experiment');
      }

      const data = await response.json();
      setExperiment(data.experiment);
    } catch (err) {
      console.error('Error fetching experiment:', err);
      // Use mock data for demo
      setExperiment(getMockExperiment(resolvedParams.experimentId));
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.experimentId]);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    if (user?.role === 'admin') {
      fetchExperiment();
    }
  }, [user, userLoading, router, fetchExperiment]);

  const handleAction = async (action: 'start' | 'pause' | 'complete' | 'calculate') => {
    if (!experiment) return;
    try {
      setActionLoading(action);
      const token = await auth?.currentUser?.getIdToken();
      await fetch(`/api/admin/experiments/${experiment.id}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchExperiment();
    } catch (err) {
      console.error(`Error ${action} experiment:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-light-grey p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-white/50 rounded-lg animate-pulse w-32" />
          <div className="h-48 bg-white rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-xl animate-pulse" />
            <div className="h-80 bg-white rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin' || !experiment) {
    return null;
  }

  const config = statusConfig[experiment.status];
  const totalUsers = experiment.sampleSize.current.control + experiment.sampleSize.current.treatment;
  const progress = (totalUsers / experiment.sampleSize.target) * 100;

  return (
    <div className="min-h-screen bg-light-grey">
      {/* Header */}
      <header className="bg-white border-b border-grey">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/experiments" className="inline-flex items-center gap-2 text-sm text-rich-black/60 hover:text-navy mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Experiments
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-navy">{experiment.name}</h1>
                <InlineBadge variant={config.variant}>{config.label}</InlineBadge>
              </div>
              <p className="text-rich-black/60">{experiment.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {experiment.status === 'draft' && (
                <Button
                  variant="success"
                  leftIcon={<Play className="w-4 h-4" />}
                  onClick={() => handleAction('start')}
                  isLoading={actionLoading === 'start'}
                >
                  Start Experiment
                </Button>
              )}
              {experiment.status === 'running' && (
                <>
                  <Button
                    variant="ghost"
                    leftIcon={<Pause className="w-4 h-4" />}
                    onClick={() => handleAction('pause')}
                    isLoading={actionLoading === 'pause'}
                  >
                    Pause
                  </Button>
                  <Button
                    variant="secondary"
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handleAction('complete')}
                    isLoading={actionLoading === 'complete'}
                  >
                    Complete
                  </Button>
                </>
              )}
              {experiment.status === 'paused' && (
                <Button
                  variant="success"
                  leftIcon={<Play className="w-4 h-4" />}
                  onClick={() => handleAction('start')}
                  isLoading={actionLoading === 'start'}
                >
                  Resume
                </Button>
              )}
              <Button
                variant="ghost"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => handleAction('calculate')}
                isLoading={actionLoading === 'calculate'}
              >
                Recalculate Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Total Participants</p>
                <p className="text-2xl font-bold text-navy">{totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-grey/30 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-rich-black/60" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Control Group</p>
                <p className="text-2xl font-bold text-navy">{experiment.sampleSize.current.control}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Treatment Group</p>
                <p className="text-2xl font-bold text-navy">{experiment.sampleSize.current.treatment}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-navy" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Progress</p>
                <p className="text-2xl font-bold text-navy">{Math.round(progress)}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sample Size Progress */}
        <Card variant="elevated" padding="lg">
          <CardHeader className="pb-4">
            <CardTitle>Sample Size Progress</CardTitle>
            <CardDescription>
              Target: {experiment.sampleSize.target} users ({experiment.allocation.control * 100}% control / {experiment.allocation.treatment * 100}% treatment)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-rich-black/60">Overall Progress</span>
                  <span className="font-semibold text-navy">{totalUsers} / {experiment.sampleSize.target}</span>
                </div>
                <div className="h-3 bg-light-grey rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal to-muted-teal rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-rich-black/60">Control</span>
                    <span className="font-medium">{experiment.sampleSize.current.control} / {Math.round(experiment.sampleSize.target * experiment.allocation.control)}</span>
                  </div>
                  <div className="h-2 bg-light-grey rounded-full overflow-hidden">
                    <div
                      className="h-full bg-grey rounded-full"
                      style={{ width: `${(experiment.sampleSize.current.control / (experiment.sampleSize.target * experiment.allocation.control)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-rich-black/60">Treatment</span>
                    <span className="font-medium">{experiment.sampleSize.current.treatment} / {Math.round(experiment.sampleSize.target * experiment.allocation.treatment)}</span>
                  </div>
                  <div className="h-2 bg-light-grey rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal rounded-full"
                      style={{ width: `${(experiment.sampleSize.current.treatment / (experiment.sampleSize.target * experiment.allocation.treatment)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {experiment.results ? (
          <>
            {/* Winner Banner */}
            <Card
              variant="elevated"
              padding="lg"
              className={
                experiment.results.winner === 'treatment'
                  ? 'bg-gradient-to-r from-success-light to-white border-success/20'
                  : experiment.results.winner === 'control'
                  ? 'bg-gradient-to-r from-warning-light to-white border-warning/20'
                  : ''
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    experiment.results.winner === 'treatment'
                      ? 'bg-success/20'
                      : experiment.results.winner === 'control'
                      ? 'bg-warning/20'
                      : 'bg-grey/20'
                  }`}>
                    {experiment.results.winner === 'treatment' ? (
                      <TrendingUp className="w-6 h-6 text-success" />
                    ) : experiment.results.winner === 'control' ? (
                      <TrendingDown className="w-6 h-6 text-warning" />
                    ) : (
                      <BarChart3 className="w-6 h-6 text-grey" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-navy">
                      {experiment.results.winner === 'treatment' && 'Treatment Wins!'}
                      {experiment.results.winner === 'control' && 'Control Performs Better'}
                      {experiment.results.winner === 'inconclusive' && 'Results Inconclusive'}
                    </h3>
                    <p className="text-sm text-rich-black/60">
                      {experiment.results.winner !== 'inconclusive'
                        ? `Confidence: ${experiment.results.confidence}%`
                        : 'More data needed to reach statistical significance'}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-rich-black/40">
                  Last calculated: {new Date(experiment.results.calculatedAt).toLocaleDateString()}
                </div>
              </div>
            </Card>

            {/* Metrics Comparison */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Metrics Comparison</CardTitle>
                <CardDescription>
                  Comparing control vs treatment performance across tracked metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experiment.results.metrics.map((metric) => (
                    <div key={metric.metric} className="p-4 bg-light-grey/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy">
                            {metricLabels[metric.metric] || metric.metric}
                          </span>
                          {metric.isSignificant && (
                            <InlineBadge variant="success" size="sm">Significant</InlineBadge>
                          )}
                        </div>
                        <StatisticalSignificance
                          pValue={metric.statisticalSignificance}
                          controlN={experiment.sampleSize.current.control}
                          treatmentN={experiment.sampleSize.current.treatment}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-rich-black/60 mb-1">Control</p>
                          <p className="text-xl font-bold text-rich-black/70">{metric.controlValue.toFixed(1)}%</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-rich-black/60 mb-1">Treatment</p>
                          <p className="text-xl font-bold text-teal">{metric.treatmentValue.toFixed(1)}%</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-rich-black/60 mb-1">Difference</p>
                          <p className={`text-xl font-bold ${metric.percentDiff > 0 ? 'text-success' : metric.percentDiff < 0 ? 'text-error' : 'text-grey'}`}>
                            {metric.percentDiff > 0 ? '+' : ''}{metric.percentDiff.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Visual comparison bar */}
                      <div className="mt-3 flex gap-2 items-center">
                        <div className="flex-1 h-4 bg-grey/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-grey rounded-full"
                            style={{ width: `${Math.min(metric.controlValue, 100)}%` }}
                          />
                        </div>
                        <div className="flex-1 h-4 bg-teal/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full"
                            style={{ width: `${Math.min(metric.treatmentValue, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {experiment.results.recommendations.length > 0 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {experiment.results.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-light-grey/50 rounded-lg">
                        <div className="w-6 h-6 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-teal">{i + 1}</span>
                        </div>
                        <span className="text-sm text-rich-black/80">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card variant="elevated" padding="lg">
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-grey mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No Results Yet</h3>
              <p className="text-rich-black/60 mb-6">
                {experiment.status === 'draft'
                  ? 'Start the experiment to begin collecting data.'
                  : 'Results will appear once enough data has been collected.'}
              </p>
              {experiment.status === 'running' && (
                <Button
                  variant="secondary"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => handleAction('calculate')}
                  isLoading={actionLoading === 'calculate'}
                >
                  Calculate Results Now
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Variant Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-grey" />
                <CardTitle>Control Configuration</CardTitle>
              </div>
              <CardDescription>Features enabled for the control group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(experiment.variants.control).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-light-grey last:border-0">
                    <span className="text-sm text-rich-black/70">{formatFeatureName(key)}</span>
                    <InlineBadge variant={value ? 'success' : 'default'} size="sm">
                      {value ? 'Enabled' : 'Disabled'}
                    </InlineBadge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal" />
                <CardTitle>Treatment Configuration</CardTitle>
              </div>
              <CardDescription>Features enabled for the treatment group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(experiment.variants.treatment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-light-grey last:border-0">
                    <span className="text-sm text-rich-black/70">{formatFeatureName(key)}</span>
                    <InlineBadge variant={value ? 'success' : 'default'} size="sm">
                      {value ? 'Enabled' : 'Disabled'}
                    </InlineBadge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <Card variant="default" padding="md">
          <div className="flex items-center gap-6 text-sm text-rich-black/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Created: {new Date(experiment.createdAt).toLocaleDateString()}</span>
            </div>
            {experiment.startDate && (
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Started: {new Date(experiment.startDate).toLocaleDateString()}</span>
              </div>
            )}
            {experiment.endDate && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Ended: {new Date(experiment.endDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Updated: {new Date(experiment.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

function formatFeatureName(key: string): string {
  return key
    .replace(/^use/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function getMockExperiment(id: string): ExperimentDetail {
  const experiments: Record<string, ExperimentDetail> = {
    'adaptive-sequencing-v1': {
      id: 'adaptive-sequencing-v1',
      name: 'Adaptive vs Linear Learning Path',
      description: 'Test if adaptive sequencing improves completion and mastery compared to linear progression',
      status: 'running',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      variants: {
        control: {
          useAdaptiveSequencing: false,
          useStruggleDetection: false,
          useProactiveCoach: false,
          usePretests: false,
          useContentVariants: false,
        },
        treatment: {
          useAdaptiveSequencing: true,
          useStruggleDetection: true,
          useProactiveCoach: true,
          usePretests: true,
          useContentVariants: true,
        },
      },
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 67, treatment: 71 },
      },
      metrics: ['courseCompletionRate', 'lessonCompletionRate', 'skillMasteryRate', 'averageTimeToMastery', 'retentionRate'],
      results: {
        metrics: [
          { metric: 'courseCompletionRate', controlValue: 12, treatmentValue: 28, absoluteDiff: 16, percentDiff: 133, statisticalSignificance: 0.012, isSignificant: true },
          { metric: 'lessonCompletionRate', controlValue: 45, treatmentValue: 72, absoluteDiff: 27, percentDiff: 60, statisticalSignificance: 0.003, isSignificant: true },
          { metric: 'skillMasteryRate', controlValue: 34, treatmentValue: 58, absoluteDiff: 24, percentDiff: 71, statisticalSignificance: 0.008, isSignificant: true },
          { metric: 'averageTimeToMastery', controlValue: 45, treatmentValue: 32, absoluteDiff: -13, percentDiff: -29, statisticalSignificance: 0.021, isSignificant: true },
          { metric: 'retentionRate', controlValue: 65, treatmentValue: 78, absoluteDiff: 13, percentDiff: 20, statisticalSignificance: 0.087, isSignificant: false },
        ],
        winner: 'treatment',
        confidence: 85,
        recommendations: [
          'Consider rolling out treatment features to all users.',
          'courseCompletionRate: +133.3% improvement (p=0.0120)',
          'lessonCompletionRate: +60.0% improvement (p=0.0030)',
          'skillMasteryRate: +70.6% improvement (p=0.0080)',
        ],
        calculatedAt: new Date().toISOString(),
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'socratic-sage-v1': {
      id: 'socratic-sage-v1',
      name: 'Socratic Sage vs Standard Coach',
      description: 'Test if Socratic questioning (never giving direct answers) improves learning outcomes vs traditional coaching',
      status: 'draft',
      startDate: new Date().toISOString(),
      variants: {
        control: {
          useAdaptiveSequencing: true,
          useStruggleDetection: true,
          useProactiveCoach: true,
          usePretests: true,
          useContentVariants: true,
          useSocraticMode: false,
        },
        treatment: {
          useAdaptiveSequencing: true,
          useStruggleDetection: true,
          useProactiveCoach: true,
          usePretests: true,
          useContentVariants: true,
          useSocraticMode: true,
        },
      },
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 0, treatment: 0 },
      },
      metrics: ['quiz_remediation_rate', 'time_to_mastery', 'user_satisfaction', 'retentionRate'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  return experiments[id] || experiments['adaptive-sequencing-v1'];
}
