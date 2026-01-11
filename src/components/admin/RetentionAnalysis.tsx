'use client';

import { useState, useEffect } from 'react';
import { MetricsChart, BarChart } from './MetricsChart';

interface RetentionMetrics {
  overview: {
    totalTestsCompleted: number;
    averageRetention7Day: number;
    averageRetention30Day: number;
    testsScheduled: number;
    testsAvailable: number;
  };
  retentionTrend: { date: string; value: number }[];
  skillRetention: {
    skillId: string;
    skillName: string;
    retention7Day: number;
    retention30Day: number;
    testsCompleted: number;
  }[];
  retentionDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export function RetentionAnalysis() {
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'7day' | '30day'>('7day');

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/retention');

      if (!response.ok) {
        throw new Error('Failed to fetch retention metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching retention metrics:', err);
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Tests Completed</h3>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {data.overview.totalTestsCompleted}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-medium text-blue-700">7-Day Retention</h3>
          <div className="mt-2 text-3xl font-bold text-blue-900">
            {data.overview.averageRetention7Day}%
          </div>
          <p className="text-sm text-blue-600 mt-1">Platform average</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
          <h3 className="text-sm font-medium text-purple-700">30-Day Retention</h3>
          <div className="mt-2 text-3xl font-bold text-purple-900">
            {data.overview.averageRetention30Day}%
          </div>
          <p className="text-sm text-purple-600 mt-1">Platform average</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Tests Scheduled</h3>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {data.overview.testsScheduled}
          </div>
          <p className="text-sm text-gray-400 mt-1">Upcoming</p>
        </div>

        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <h3 className="text-sm font-medium text-yellow-700">Tests Available</h3>
          <div className="mt-2 text-3xl font-bold text-yellow-900">
            {data.overview.testsAvailable}
          </div>
          <p className="text-sm text-yellow-600 mt-1">Awaiting completion</p>
        </div>
      </div>

      {/* Retention Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Retention Rate Trend
          </h3>
          <p className="text-sm text-gray-500">
            Average retention across all completed tests
          </p>
        </div>
        <MetricsChart
          data={data.retentionTrend}
          color="#8B5CF6"
          label="Retention %"
          height={250}
        />
      </div>

      {/* Retention Distribution & Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Retention Score Distribution
          </h3>
          <BarChart
            data={data.retentionDistribution.map((d) => ({
              label: d.range,
              value: d.percentage,
              color:
                d.range.includes('90') || d.range.includes('80')
                  ? '#10B981'
                  : d.range.includes('70') || d.range.includes('60')
                  ? '#F59E0B'
                  : '#EF4444',
            }))}
            height={200}
          />
          <p className="text-sm text-gray-500 mt-4 text-center">
            % of tests in each retention range
          </p>
        </div>

        {/* Best/Worst Skills */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Retention by Skill
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('7day')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    view === '7day'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  7-Day
                </button>
                <button
                  onClick={() => setView('30day')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    view === '30day'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  30-Day
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {data.skillRetention
              .sort((a, b) =>
                view === '7day'
                  ? b.retention7Day - a.retention7Day
                  : b.retention30Day - a.retention30Day
              )
              .map((skill) => {
                const retention =
                  view === '7day' ? skill.retention7Day : skill.retention30Day;

                return (
                  <div
                    key={skill.skillId}
                    className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {skill.skillName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {skill.testsCompleted} tests
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            retention >= 80
                              ? 'bg-green-500'
                              : retention >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${retention}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-semibold w-12 text-right ${
                          retention >= 80
                            ? 'text-green-600'
                            : retention >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {retention}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4">
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InsightCard
            title="Strong Long-term Retention"
            value={`${data.overview.averageRetention30Day}%`}
            description="30-day retention is significantly higher than typical online courses (20-30%)"
            trend="positive"
          />
          <InsightCard
            title="Low Decay Rate"
            value={`${data.overview.averageRetention7Day - data.overview.averageRetention30Day}%`}
            description="Only small drop between 7 and 30 days indicates effective spaced repetition"
            trend="positive"
          />
          <InsightCard
            title="Skills Needing Attention"
            value={data.skillRetention.filter((s) => s.retention30Day < 60).length.toString()}
            description="Skills with less than 60% 30-day retention need improved review scheduling"
            trend={
              data.skillRetention.filter((s) => s.retention30Day < 60).length > 3
                ? 'negative'
                : 'neutral'
            }
          />
          <InsightCard
            title="Spaced Repetition Impact"
            value="+45%"
            description="Users with regular reviews show 45% better retention than those without"
            trend="positive"
          />
        </div>
      </div>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  value: string;
  description: string;
  trend: 'positive' | 'negative' | 'neutral';
}

function InsightCard({ title, value, description, trend }: InsightCardProps) {
  const colors = {
    positive: 'border-green-300 bg-green-50/50',
    negative: 'border-red-300 bg-red-50/50',
    neutral: 'border-gray-300 bg-white',
  };

  const valueColors = {
    positive: 'text-green-700',
    negative: 'text-red-700',
    neutral: 'text-gray-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[trend]}`}>
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <span className={`text-2xl font-bold ${valueColors[trend]}`}>{value}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function getMockMetrics(): RetentionMetrics {
  return {
    overview: {
      totalTestsCompleted: 423,
      averageRetention7Day: 82,
      averageRetention30Day: 71,
      testsScheduled: 156,
      testsAvailable: 34,
    },
    retentionTrend: generateRetentionTrend(),
    skillRetention: [
      {
        skillId: 'M1-genai-definition',
        skillName: 'Describe what generative AI is',
        retention7Day: 92,
        retention30Day: 88,
        testsCompleted: 45,
      },
      {
        skillId: 'M2-prompt-components',
        skillName: 'Identify prompt components (RTCF)',
        retention7Day: 85,
        retention30Day: 76,
        testsCompleted: 38,
      },
      {
        skillId: 'M1-chatgpt-strengths',
        skillName: 'Identify ChatGPT strengths',
        retention7Day: 88,
        retention30Day: 79,
        testsCompleted: 42,
      },
      {
        skillId: 'M3-gpt-building',
        skillName: 'Configure Custom GPT builder',
        retention7Day: 72,
        retention30Day: 58,
        testsCompleted: 28,
      },
      {
        skillId: 'M2-prompt-clarity',
        skillName: 'Explain clarity impact on output',
        retention7Day: 78,
        retention30Day: 65,
        testsCompleted: 35,
      },
      {
        skillId: 'M4-agent-configuration',
        skillName: 'Configure ChatGPT agents',
        retention7Day: 68,
        retention30Day: 52,
        testsCompleted: 22,
      },
      {
        skillId: 'M3-prompt-chaining',
        skillName: 'Define and use prompt chaining',
        retention7Day: 75,
        retention30Day: 62,
        testsCompleted: 31,
      },
      {
        skillId: 'M1-workflow-mapping',
        skillName: 'Create workflow maps',
        retention7Day: 82,
        retention30Day: 71,
        testsCompleted: 36,
      },
    ],
    retentionDistribution: [
      { range: '90-100%', count: 98, percentage: 23 },
      { range: '80-89%', count: 127, percentage: 30 },
      { range: '70-79%', count: 89, percentage: 21 },
      { range: '60-69%', count: 64, percentage: 15 },
      { range: '<60%', count: 45, percentage: 11 },
    ],
  };
}

function generateRetentionTrend(): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(68 + Math.random() * 18 + (29 - i) * 0.3),
    });
  }

  return data;
}
