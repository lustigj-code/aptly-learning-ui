'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/store/userProfileStore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineBadge } from '@/components/ui/Badge';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Filter,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  startDate: string;
  endDate?: string;
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
    winner: 'control' | 'treatment' | 'inconclusive';
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<ExperimentStatus, { variant: 'default' | 'success' | 'warning' | 'teal'; label: string; icon: typeof Play }> = {
  draft: { variant: 'default', label: 'Draft', icon: Clock },
  running: { variant: 'success', label: 'Running', icon: Play },
  paused: { variant: 'warning', label: 'Paused', icon: Pause },
  completed: { variant: 'teal', label: 'Completed', icon: CheckCircle },
};

export default function ExperimentsPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchExperiments = useCallback(async () => {
    try {
      setLoading(true);
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch('/api/admin/experiments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }

      const data = await response.json();
      setExperiments(data.experiments || []);
    } catch (err) {
      console.error('Error fetching experiments:', err);
      // Use mock data for demo
      setExperiments(getMockExperiments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    if (user?.role === 'admin') {
      fetchExperiments();
    }
  }, [user, userLoading, router, fetchExperiments]);

  const handleInitialize = async () => {
    try {
      setActionLoading('init');
      const token = await auth?.currentUser?.getIdToken();
      await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchExperiments();
    } catch (err) {
      console.error('Error initializing experiments:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (experimentId: string, action: 'start' | 'pause' | 'complete') => {
    try {
      setActionLoading(experimentId);
      const token = await auth?.currentUser?.getIdToken();
      await fetch(`/api/admin/experiments/${experimentId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchExperiments();
    } catch (err) {
      console.error(`Error ${action} experiment:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredExperiments = statusFilter === 'all'
    ? experiments
    : experiments.filter(e => e.status === statusFilter);

  const stats = {
    total: experiments.length,
    running: experiments.filter(e => e.status === 'running').length,
    completed: experiments.filter(e => e.status === 'completed').length,
    totalUsers: experiments.reduce((sum, e) => sum + e.sampleSize.current.control + e.sampleSize.current.treatment, 0),
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-light-grey p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-white/50 rounded-lg animate-pulse w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-light-grey">
      {/* Header */}
      <header className="bg-white border-b border-grey">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy">A/B Experiments</h1>
                <p className="text-sm text-rich-black/60">
                  Manage and monitor experiments to prove adaptive learning efficacy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchExperiments}
                isLoading={loading}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleInitialize}
                isLoading={actionLoading === 'init'}
              >
                Initialize Defaults
              </Button>
              <Link href="/admin/experiments/create">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  New Experiment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-navy" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Total Experiments</p>
                <p className="text-2xl font-bold text-navy">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Running</p>
                <p className="text-2xl font-bold text-navy">{stats.running}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Completed</p>
                <p className="text-2xl font-bold text-navy">{stats.completed}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple" />
              </div>
              <div>
                <p className="text-sm text-rich-black/60">Total Participants</p>
                <p className="text-2xl font-bold text-navy">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card variant="default" padding="md">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-rich-black/40" />
            <span className="text-sm font-medium text-rich-black/60">Filter by status:</span>
            <div className="flex gap-2">
              {(['all', 'draft', 'running', 'paused', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-teal text-white'
                      : 'bg-light-grey text-rich-black/60 hover:bg-grey'
                  }`}
                >
                  {status === 'all' ? 'All' : statusConfig[status].label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Experiments List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredExperiments.length === 0 ? (
            <Card variant="elevated" padding="lg" className="col-span-2">
              <div className="text-center py-12">
                <FlaskConical className="w-12 h-12 text-grey mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No experiments found</h3>
                <p className="text-rich-black/60 mb-6">
                  {statusFilter === 'all'
                    ? 'Get started by creating your first experiment or initializing defaults.'
                    : `No ${statusFilter} experiments found.`}
                </p>
                <Button onClick={handleInitialize} isLoading={actionLoading === 'init'}>
                  Initialize Default Experiments
                </Button>
              </div>
            </Card>
          ) : (
            filteredExperiments.map((experiment) => {
              const config = statusConfig[experiment.status];
              const StatusIcon = config.icon;
              const totalUsers = experiment.sampleSize.current.control + experiment.sampleSize.current.treatment;
              const progress = (totalUsers / experiment.sampleSize.target) * 100;

              return (
                <Card key={experiment.id} variant="elevated" padding="none" className="overflow-hidden">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{experiment.name}</CardTitle>
                          <InlineBadge variant={config.variant} size="sm">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </InlineBadge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {experiment.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* Sample Size Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-rich-black/60 mb-1">
                        <span>Sample Size</span>
                        <span>{totalUsers} / {experiment.sampleSize.target} users</span>
                      </div>
                      <div className="h-2 bg-light-grey rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal to-muted-teal rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-rich-black/40 mt-1">
                        <span>Control: {experiment.sampleSize.current.control}</span>
                        <span>Treatment: {experiment.sampleSize.current.treatment}</span>
                      </div>
                    </div>

                    {/* Allocation */}
                    <div className="flex items-center gap-4 text-sm text-rich-black/60 mb-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-grey" />
                        <span>Control: {experiment.allocation.control * 100}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-teal" />
                        <span>Treatment: {experiment.allocation.treatment * 100}%</span>
                      </div>
                    </div>

                    {/* Results Preview (if completed) */}
                    {experiment.results && (
                      <div className={`p-3 rounded-lg mb-4 ${
                        experiment.results.winner === 'treatment'
                          ? 'bg-success-light'
                          : experiment.results.winner === 'control'
                          ? 'bg-warning-light'
                          : 'bg-light-grey'
                      }`}>
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${
                            experiment.results.winner === 'treatment'
                              ? 'text-success'
                              : experiment.results.winner === 'control'
                              ? 'text-warning'
                              : 'text-grey'
                          }`} />
                          <span className="text-sm font-medium">
                            {experiment.results.winner === 'treatment' && `Treatment wins (${experiment.results.confidence}% confidence)`}
                            {experiment.results.winner === 'control' && 'Control performs better'}
                            {experiment.results.winner === 'inconclusive' && 'Results inconclusive'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-light-grey">
                      <div className="flex gap-2">
                        {experiment.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="success"
                            leftIcon={<Play className="w-3 h-3" />}
                            onClick={() => handleAction(experiment.id, 'start')}
                            isLoading={actionLoading === experiment.id}
                          >
                            Start
                          </Button>
                        )}
                        {experiment.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pause className="w-3 h-3" />}
                              onClick={() => handleAction(experiment.id, 'pause')}
                              isLoading={actionLoading === experiment.id}
                            >
                              Pause
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                              onClick={() => handleAction(experiment.id, 'complete')}
                              isLoading={actionLoading === experiment.id}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {experiment.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="success"
                            leftIcon={<Play className="w-3 h-3" />}
                            onClick={() => handleAction(experiment.id, 'start')}
                            isLoading={actionLoading === experiment.id}
                          >
                            Resume
                          </Button>
                        )}
                      </div>

                      <Link href={`/admin/experiments/${experiment.id}`}>
                        <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="w-3 h-3" />}>
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function getMockExperiments(): Experiment[] {
  return [
    {
      id: 'adaptive-sequencing-v1',
      name: 'Adaptive vs Linear Learning Path',
      description: 'Test if adaptive sequencing improves completion and mastery compared to linear progression',
      status: 'running',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 67, treatment: 71 },
      },
      metrics: ['courseCompletionRate', 'lessonCompletionRate', 'skillMasteryRate', 'averageTimeToMastery'],
      results: {
        winner: 'treatment',
        confidence: 85,
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proactive-coach-v1',
      name: 'Proactive vs Reactive Coach',
      description: 'Test if proactive interventions improve struggle resolution and learning outcomes',
      status: 'running',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 34, treatment: 38 },
      },
      metrics: ['interventionSuccessRate', 'sessionCompletionRate', 'returnRate.day1', 'returnRate.day7'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'socratic-sage-v1',
      name: 'Socratic Sage vs Standard Coach',
      description: 'Test if Socratic questioning (never giving direct answers) improves learning outcomes vs traditional coaching',
      status: 'draft',
      startDate: new Date().toISOString(),
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 0, treatment: 0 },
      },
      metrics: ['quiz_remediation_rate', 'time_to_mastery', 'user_satisfaction', 'retentionRate'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pretest-skip-v1',
      name: 'Pre-test Skipping Impact',
      description: 'Test if allowing content skipping via pre-tests improves efficiency without hurting retention',
      status: 'draft',
      startDate: new Date().toISOString(),
      allocation: { control: 0.5, treatment: 0.5 },
      sampleSize: {
        target: 200,
        current: { control: 0, treatment: 0 },
      },
      metrics: ['averageTimeToMastery', 'skillMasteryRate', 'retentionRate', 'contentSkipRate'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
