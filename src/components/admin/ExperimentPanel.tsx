'use client';

import { useState, useEffect } from 'react';
import { ComparisonChart } from './MetricsChart';

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  sampleSize: {
    target: number;
    current: { control: number; treatment: number };
  };
  results?: {
    metrics: {
      metric: string;
      controlValue: number;
      treatmentValue: number;
      absoluteDiff: number;
      percentDiff: number;
      statisticalSignificance: number;
      isSignificant: boolean;
    }[];
    winner: 'control' | 'treatment' | 'inconclusive';
    confidence: number;
    recommendations: string[];
  };
}

export function ExperimentPanel() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments();
  }, []);

  async function fetchExperiments() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/experiments');

      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }

      const data = await response.json();
      setExperiments(data.experiments || []);

      // Select first experiment by default
      if (data.experiments?.length > 0 && !selectedExperiment) {
        setSelectedExperiment(data.experiments[0].id);
      }
    } catch (err) {
      console.error('Error fetching experiments:', err);
      // Use mock data for demo
      const mockExperiments = getMockExperiments();
      setExperiments(mockExperiments);
      if (mockExperiments.length > 0) {
        setSelectedExperiment(mockExperiments[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExperimentAction(
    experimentId: string,
    action: 'start' | 'pause' | 'complete' | 'calculate'
  ) {
    try {
      setActionLoading(experimentId);
      await fetch(`/api/admin/experiments/${experimentId}/${action}`, {
        method: 'POST',
      });
      await fetchExperiments();
    } catch (err) {
      console.error(`Error ${action} experiment:`, err);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-80 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const selected = experiments.find((e) => e.id === selectedExperiment);

  return (
    <div className="space-y-6">
      {/* Experiment Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">A/B Experiments</h3>
          <button
            onClick={() => handleExperimentAction('', 'start')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Initialize Experiments
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp) => (
            <button
              key={exp.id}
              onClick={() => setSelectedExperiment(exp.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedExperiment === exp.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-gray-900 text-sm">{exp.name}</h4>
                <StatusBadge status={exp.status} />
              </div>
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                {exp.description}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span>
                  {exp.sampleSize.current.control + exp.sampleSize.current.treatment}
                  /{exp.sampleSize.target} users
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Experiment Details */}
      {selected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selected.name}
                </h3>
                <p className="text-sm text-gray-500">{selected.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {selected.status === 'draft' && (
                  <button
                    onClick={() => handleExperimentAction(selected.id, 'start')}
                    disabled={actionLoading === selected.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selected.id ? 'Starting...' : 'Start'}
                  </button>
                )}
                {selected.status === 'running' && (
                  <>
                    <button
                      onClick={() => handleExperimentAction(selected.id, 'pause')}
                      disabled={actionLoading === selected.id}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => handleExperimentAction(selected.id, 'complete')}
                      disabled={actionLoading === selected.id}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Complete
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleExperimentAction(selected.id, 'calculate')}
                  disabled={actionLoading === selected.id}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Recalculate
                </button>
              </div>
            </div>
          </div>

          {/* Sample Size Progress */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Sample Size Progress
              </span>
              <span className="text-sm text-gray-500">
                {selected.sampleSize.current.control +
                  selected.sampleSize.current.treatment}{' '}
                / {selected.sampleSize.target} users
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-500 rounded-full"
                    style={{
                      width: `${
                        (selected.sampleSize.current.control /
                          (selected.sampleSize.target / 2)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  Control: {selected.sampleSize.current.control}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${
                        (selected.sampleSize.current.treatment /
                          (selected.sampleSize.target / 2)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  Treatment: {selected.sampleSize.current.treatment}
                </span>
              </div>
            </div>
          </div>

          {/* Results */}
          {selected.results ? (
            <>
              {/* Winner Banner */}
              <div
                className={`px-6 py-4 ${
                  selected.results.winner === 'treatment'
                    ? 'bg-green-50'
                    : selected.results.winner === 'control'
                    ? 'bg-yellow-50'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">
                      {selected.results.winner === 'treatment' && (
                        <span className="text-green-700">
                          Treatment wins with {selected.results.confidence}% confidence
                        </span>
                      )}
                      {selected.results.winner === 'control' && (
                        <span className="text-yellow-700">
                          Control performs better - treatment needs refinement
                        </span>
                      )}
                      {selected.results.winner === 'inconclusive' && (
                        <span className="text-gray-700">
                          Results inconclusive - more data needed
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Comparison */}
              <div className="px-6 py-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Metrics Comparison
                </h4>
                <ComparisonChart
                  data={selected.results.metrics.map((m) => ({
                    metric: m.metric,
                    control: m.controlValue,
                    treatment: m.treatmentValue,
                    isSignificant: m.isSignificant,
                  }))}
                />
              </div>

              {/* Recommendations */}
              {selected.results.recommendations.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {selected.results.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-indigo-500 mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No results yet. Start the experiment and wait for data to accumulate.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Experiment['status'] }) {
  const config = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
    running: { bg: 'bg-green-100', text: 'text-green-700', label: 'Running' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
  };

  const c = config[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function getMockExperiments(): Experiment[] {
  return [
    {
      id: 'adaptive-sequencing-v1',
      name: 'Adaptive vs Linear Learning Path',
      description: 'Test if adaptive sequencing improves completion and mastery',
      status: 'running',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      sampleSize: {
        target: 200,
        current: { control: 67, treatment: 71 },
      },
      results: {
        metrics: [
          {
            metric: 'courseCompletionRate',
            controlValue: 12,
            treatmentValue: 28,
            absoluteDiff: 16,
            percentDiff: 133,
            statisticalSignificance: 0.012,
            isSignificant: true,
          },
          {
            metric: 'lessonCompletionRate',
            controlValue: 45,
            treatmentValue: 72,
            absoluteDiff: 27,
            percentDiff: 60,
            statisticalSignificance: 0.003,
            isSignificant: true,
          },
          {
            metric: 'skillMasteryRate',
            controlValue: 34,
            treatmentValue: 58,
            absoluteDiff: 24,
            percentDiff: 71,
            statisticalSignificance: 0.008,
            isSignificant: true,
          },
          {
            metric: 'averageTimeToMastery',
            controlValue: 45,
            treatmentValue: 32,
            absoluteDiff: -13,
            percentDiff: -29,
            statisticalSignificance: 0.021,
            isSignificant: true,
          },
          {
            metric: 'retentionRate',
            controlValue: 65,
            treatmentValue: 78,
            absoluteDiff: 13,
            percentDiff: 20,
            statisticalSignificance: 0.087,
            isSignificant: false,
          },
        ],
        winner: 'treatment',
        confidence: 85,
        recommendations: [
          'Consider rolling out treatment features to all users.',
          'courseCompletionRate: +133.3% improvement (p=0.0120)',
          'lessonCompletionRate: +60.0% improvement (p=0.0030)',
          'skillMasteryRate: +70.6% improvement (p=0.0080)',
        ],
      },
    },
    {
      id: 'proactive-coach-v1',
      name: 'Proactive vs Reactive Coach',
      description: 'Test if proactive interventions improve struggle resolution',
      status: 'running',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      sampleSize: {
        target: 200,
        current: { control: 34, treatment: 38 },
      },
      results: undefined,
    },
    {
      id: 'pretest-skip-v1',
      name: 'Pre-test Skipping Impact',
      description:
        'Test if allowing content skipping improves efficiency without hurting retention',
      status: 'draft',
      startDate: new Date().toISOString(),
      sampleSize: {
        target: 200,
        current: { control: 0, treatment: 0 },
      },
      results: undefined,
    },
  ];
}
