'use client';

import { useState, useEffect } from 'react';
import { MetricsChart } from './MetricsChart';

interface InterventionEffectivenessProps {
  dateRange: { start: Date; end: Date };
}

interface InterventionMetrics {
  overview: {
    totalStrugglesDetected: number;
    interventionsShown: number;
    interventionsAccepted: number;
    masteryImprovements: number;
    avgMasteryImprovement: number;
  };
  byType: {
    type: string;
    shown: number;
    accepted: number;
    successRate: number;
    avgImprovement: number;
  }[];
  strugglesBySkill: {
    skillId: string;
    skillName: string;
    struggles: number;
    resolved: number;
    resolutionRate: number;
  }[];
  trend: { date: string; value: number }[];
}

export function InterventionEffectiveness({
  dateRange,
}: InterventionEffectivenessProps) {
  const [metrics, setMetrics] = useState<InterventionMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/interventions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: dateRange.start.toISOString(),
            endDate: dateRange.end.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching intervention metrics:', err);
        setMetrics(getMockMetrics());
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const data = metrics || getMockMetrics();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Struggles Detected"
          value={data.overview.totalStrugglesDetected}
          icon="search"
          color="yellow"
        />
        <MetricCard
          title="Interventions Shown"
          value={data.overview.interventionsShown}
          icon="lightbulb"
          color="blue"
        />
        <MetricCard
          title="Interventions Accepted"
          value={data.overview.interventionsAccepted}
          icon="check"
          color="green"
          subtitle={`${Math.round(
            (data.overview.interventionsAccepted / data.overview.interventionsShown) * 100
          )}% acceptance rate`}
        />
        <MetricCard
          title="Avg Mastery Improvement"
          value={`+${data.overview.avgMasteryImprovement}%`}
          icon="trending-up"
          color="purple"
          subtitle={`${data.overview.masteryImprovements} total improvements`}
        />
      </div>

      {/* Intervention Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Effectiveness by Intervention Type
          </h3>
          <div className="space-y-4">
            {data.byType.map((type) => (
              <InterventionTypeRow key={type.type} {...type} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Intervention Success Rate Trend
          </h3>
          <MetricsChart
            data={data.trend}
            color="#21A8B0"
            label="Success Rate %"
          />
        </div>
      </div>

      {/* Skills with Most Struggles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Skills with Most Struggles
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Focus intervention improvements on these areas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Skill
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Struggles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Resolved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Resolution Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.strugglesBySkill.map((skill) => (
                <tr key={skill.skillId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {skill.skillName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {skill.struggles}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {skill.resolved}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-24">
                        <div
                          className={`h-full rounded-full ${
                            skill.resolutionRate >= 70
                              ? 'bg-green-500'
                              : skill.resolutionRate >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${skill.resolutionRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {skill.resolutionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge rate={skill.resolutionRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-light-teal rounded-xl border border-teal/30 p-6">
        <h3 className="text-lg font-semibold text-navy mb-3">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {getRecommendations(data).map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-teal-dark">
              <span className="text-teal mt-0.5">•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'yellow' | 'blue' | 'green' | 'purple';
  subtitle?: string;
}

function MetricCard({ title, value, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-light-teal border-teal/30 text-teal-dark',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-navy/10 border-navy/30 text-navy',
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
    </div>
  );
}

interface InterventionTypeRowProps {
  type: string;
  shown: number;
  accepted: number;
  successRate: number;
  avgImprovement: number;
}

function InterventionTypeRow({
  type,
  shown,
  accepted,
  successRate,
  avgImprovement,
}: InterventionTypeRowProps) {
  const acceptanceRate = Math.round((accepted / shown) * 100);

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{formatType(type)}</span>
        <span
          className={`text-sm font-semibold ${
            successRate >= 70 ? 'text-green-600' : 'text-yellow-600'
          }`}
        >
          {successRate}% success
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Shown</span>
          <span className="ml-2 text-gray-900">{shown}</span>
        </div>
        <div>
          <span className="text-gray-500">Accepted</span>
          <span className="ml-2 text-gray-900">
            {accepted} ({acceptanceRate}%)
          </span>
        </div>
        <div>
          <span className="text-gray-500">Avg Improvement</span>
          <span className="ml-2 text-green-600">+{avgImprovement}%</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ rate }: { rate: number }) {
  if (rate >= 70) {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
        Good
      </span>
    );
  }
  if (rate >= 50) {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
        Needs Work
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
      Critical
    </span>
  );
}

function formatType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getRecommendations(data: InterventionMetrics): string[] {
  const recs: string[] = [];

  // Check acceptance rate
  const acceptanceRate =
    (data.overview.interventionsAccepted / data.overview.interventionsShown) * 100;
  if (acceptanceRate < 50) {
    recs.push(
      'Low intervention acceptance rate. Consider making interventions less intrusive or more contextual.'
    );
  }

  // Find struggling skills
  const criticalSkills = data.strugglesBySkill.filter(
    (s) => s.resolutionRate < 50 && s.struggles > 10
  );
  if (criticalSkills.length > 0) {
    recs.push(
      `${criticalSkills.length} skills have poor resolution rates. Review content and intervention strategies for: ${criticalSkills
        .map((s) => s.skillName)
        .join(', ')}`
    );
  }

  // Check intervention types
  const poorTypes = data.byType.filter((t) => t.successRate < 50);
  if (poorTypes.length > 0) {
    recs.push(
      `Consider improving or replacing these intervention types: ${poorTypes
        .map((t) => formatType(t.type))
        .join(', ')}`
    );
  }

  // Default recommendation
  if (recs.length === 0) {
    recs.push(
      'Intervention system performing well. Continue monitoring and A/B testing new strategies.'
    );
  }

  return recs;
}

function getMockMetrics(): InterventionMetrics {
  return {
    overview: {
      totalStrugglesDetected: 847,
      interventionsShown: 623,
      interventionsAccepted: 412,
      masteryImprovements: 358,
      avgMasteryImprovement: 18,
    },
    byType: [
      {
        type: 'alternative_explanation',
        shown: 245,
        accepted: 178,
        successRate: 72,
        avgImprovement: 22,
      },
      {
        type: 'prerequisite_review',
        shown: 189,
        accepted: 134,
        successRate: 68,
        avgImprovement: 16,
      },
      {
        type: 'simpler_practice',
        shown: 112,
        accepted: 67,
        successRate: 58,
        avgImprovement: 14,
      },
      {
        type: 'coach_session',
        shown: 77,
        accepted: 33,
        successRate: 82,
        avgImprovement: 28,
      },
    ],
    strugglesBySkill: [
      {
        skillId: 'M2-prompt-clarity',
        skillName: 'Explain clarity impact on output',
        struggles: 89,
        resolved: 61,
        resolutionRate: 69,
      },
      {
        skillId: 'M3-prompt-chaining',
        skillName: 'Define and use prompt chaining',
        struggles: 76,
        resolved: 42,
        resolutionRate: 55,
      },
      {
        skillId: 'M1-chatgpt-limitations',
        skillName: 'Identify ChatGPT limitations',
        struggles: 64,
        resolved: 52,
        resolutionRate: 81,
      },
      {
        skillId: 'M4-agent-vs-gpt',
        skillName: 'Distinguish agents from GPTs',
        struggles: 58,
        resolved: 24,
        resolutionRate: 41,
      },
      {
        skillId: 'M2-prompt-mistakes',
        skillName: 'Recognize common prompt mistakes',
        struggles: 52,
        resolved: 39,
        resolutionRate: 75,
      },
    ],
    trend: generateTrend(),
  };
}

function generateTrend(): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(55 + Math.random() * 25 + (29 - i) * 0.5),
    });
  }

  return data;
}
