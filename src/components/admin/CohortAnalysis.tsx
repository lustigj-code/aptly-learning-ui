'use client';

import { useState, useEffect } from 'react';
import { MetricsChart, BarChart } from './MetricsChart';

interface CohortAnalysisProps {
  dateRange: { start: Date; end: Date };
}

interface CohortData {
  id: string;
  name: string;
  userCount: number;
  metrics: {
    completionRate: number;
    retentionDay7: number;
    retentionDay30: number;
    avgSessionLength: number;
    skillMasteryRate: number;
  };
  masteryProgression: { date: string; value: number }[];
  retentionCurve: { day: number; retained: number }[];
}

type CohortType = 'signup_week' | 'experiment_variant' | 'learning_pace' | 'experience_level';

export function CohortAnalysis({ dateRange }: CohortAnalysisProps) {
  const [cohortType, setCohortType] = useState<CohortType>('signup_week');
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);

  useEffect(() => {
    async function fetchCohorts() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/cohorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cohortType,
            startDate: dateRange.start.toISOString(),
            endDate: dateRange.end.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cohorts');
        }

        const data = await response.json();
        setCohorts(data.cohorts || []);
        setSelectedCohorts(data.cohorts?.slice(0, 2).map((c: CohortData) => c.id) || []);
      } catch (err) {
        console.error('Error fetching cohorts:', err);
        // Use mock data
        const mockCohorts = getMockCohorts(cohortType);
        setCohorts(mockCohorts);
        setSelectedCohorts(mockCohorts.slice(0, 2).map((c) => c.id));
      } finally {
        setLoading(false);
      }
    }
    fetchCohorts();
  }, [cohortType, dateRange]);

  const toggleCohort = (cohortId: string) => {
    setSelectedCohorts((prev) =>
      prev.includes(cohortId)
        ? prev.filter((id) => id !== cohortId)
        : [...prev, cohortId]
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-80 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const selectedCohortData = cohorts.filter((c) => selectedCohorts.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Cohort Type Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cohort Analysis</h3>

          <select
            value={cohortType}
            onChange={(e) => setCohortType(e.target.value as CohortType)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value="signup_week">By Sign-up Week</option>
            <option value="experiment_variant">By Experiment Variant</option>
            <option value="learning_pace">By Learning Pace</option>
            <option value="experience_level">By Experience Level</option>
          </select>
        </div>

        {/* Cohort Selection */}
        <div className="flex flex-wrap gap-2">
          {cohorts.map((cohort) => (
            <button
              key={cohort.id}
              onClick={() => toggleCohort(cohort.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCohorts.includes(cohort.id)
                  ? 'bg-teal/20 text-teal-dark border-2 border-teal/30'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              {cohort.name}
              <span className="ml-2 text-xs opacity-60">({cohort.userCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Comparison Table */}
      {selectedCohortData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Metrics Comparison</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Metric
                  </th>
                  {selectedCohortData.map((cohort) => (
                    <th
                      key={cohort.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {cohort.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <MetricRow
                  label="Course Completion"
                  values={selectedCohortData.map((c) => `${c.metrics.completionRate}%`)}
                  highlight={getBestIndex(
                    selectedCohortData.map((c) => c.metrics.completionRate)
                  )}
                />
                <MetricRow
                  label="7-Day Retention"
                  values={selectedCohortData.map((c) => `${c.metrics.retentionDay7}%`)}
                  highlight={getBestIndex(
                    selectedCohortData.map((c) => c.metrics.retentionDay7)
                  )}
                />
                <MetricRow
                  label="30-Day Retention"
                  values={selectedCohortData.map((c) => `${c.metrics.retentionDay30}%`)}
                  highlight={getBestIndex(
                    selectedCohortData.map((c) => c.metrics.retentionDay30)
                  )}
                />
                <MetricRow
                  label="Avg Session (min)"
                  values={selectedCohortData.map((c) => `${c.metrics.avgSessionLength}`)}
                  highlight={getBestIndex(
                    selectedCohortData.map((c) => c.metrics.avgSessionLength)
                  )}
                />
                <MetricRow
                  label="Skill Mastery Rate"
                  values={selectedCohortData.map((c) => `${c.metrics.skillMasteryRate}%`)}
                  highlight={getBestIndex(
                    selectedCohortData.map((c) => c.metrics.skillMasteryRate)
                  )}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      {selectedCohortData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mastery Progression */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Mastery Progression Over Time
            </h3>
            <div className="space-y-4">
              {selectedCohortData.map((cohort, i) => (
                <div key={cohort.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600">{cohort.name}</span>
                  </div>
                  <MetricsChart
                    data={cohort.masteryProgression}
                    color={COLORS[i % COLORS.length]}
                    label=""
                    height={120}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Retention Curves */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Retention Curves
            </h3>
            <BarChart
              data={selectedCohortData.flatMap((cohort, cohortIndex) =>
                [1, 7, 14, 30].map((day) => {
                  const point = cohort.retentionCurve.find((p) => p.day === day);
                  return {
                    label: `${cohort.name.substring(0, 8)} D${day}`,
                    value: point?.retained || 0,
                    color: COLORS[cohortIndex % COLORS.length],
                  };
                })
              )}
              height={250}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const COLORS = ['#21A8B0', '#0A004A', '#FFDE00', '#69BCC1', '#1A365D'];

interface MetricRowProps {
  label: string;
  values: string[];
  highlight: number;
}

function MetricRow({ label, values, highlight }: MetricRowProps) {
  return (
    <tr>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{label}</td>
      {values.map((value, i) => (
        <td
          key={i}
          className={`px-6 py-4 text-sm ${
            i === highlight ? 'text-green-600 font-semibold' : 'text-gray-600'
          }`}
        >
          {value}
          {i === highlight && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              Best
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

function getBestIndex(values: number[]): number {
  return values.indexOf(Math.max(...values));
}

function getMockCohorts(type: CohortType): CohortData[] {
  const baseData = {
    masteryProgression: generateTrendData(30),
    retentionCurve: [
      { day: 1, retained: 85 },
      { day: 7, retained: 65 },
      { day: 14, retained: 52 },
      { day: 30, retained: 40 },
    ],
  };

  switch (type) {
    case 'signup_week':
      return [
        {
          id: 'week-1',
          name: 'Week 1',
          userCount: 145,
          metrics: {
            completionRate: 18,
            retentionDay7: 62,
            retentionDay30: 38,
            avgSessionLength: 14,
            skillMasteryRate: 42,
          },
          ...baseData,
        },
        {
          id: 'week-2',
          name: 'Week 2',
          userCount: 178,
          metrics: {
            completionRate: 24,
            retentionDay7: 68,
            retentionDay30: 45,
            avgSessionLength: 16,
            skillMasteryRate: 51,
          },
          masteryProgression: generateTrendData(30, 1.2),
          retentionCurve: [
            { day: 1, retained: 88 },
            { day: 7, retained: 68 },
            { day: 14, retained: 58 },
            { day: 30, retained: 45 },
          ],
        },
        {
          id: 'week-3',
          name: 'Week 3',
          userCount: 156,
          metrics: {
            completionRate: 28,
            retentionDay7: 72,
            retentionDay30: 48,
            avgSessionLength: 18,
            skillMasteryRate: 58,
          },
          masteryProgression: generateTrendData(30, 1.4),
          retentionCurve: [
            { day: 1, retained: 90 },
            { day: 7, retained: 72 },
            { day: 14, retained: 62 },
            { day: 30, retained: 48 },
          ],
        },
      ];

    case 'experiment_variant':
      return [
        {
          id: 'control',
          name: 'Control',
          userCount: 234,
          metrics: {
            completionRate: 12,
            retentionDay7: 55,
            retentionDay30: 32,
            avgSessionLength: 12,
            skillMasteryRate: 35,
          },
          ...baseData,
        },
        {
          id: 'treatment',
          name: 'Treatment',
          userCount: 241,
          metrics: {
            completionRate: 28,
            retentionDay7: 72,
            retentionDay30: 52,
            avgSessionLength: 18,
            skillMasteryRate: 58,
          },
          masteryProgression: generateTrendData(30, 1.5),
          retentionCurve: [
            { day: 1, retained: 92 },
            { day: 7, retained: 72 },
            { day: 14, retained: 64 },
            { day: 30, retained: 52 },
          ],
        },
      ];

    default:
      return [];
  }
}

function generateTrendData(days: number, multiplier: number = 1): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round((20 + (days - i) * 1.5 + Math.random() * 10) * multiplier),
    });
  }

  return data;
}
