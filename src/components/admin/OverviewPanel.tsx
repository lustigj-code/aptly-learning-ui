'use client';

import { useState, useEffect } from 'react';
import { MetricsChart } from './MetricsChart';

interface OverviewPanelProps {
  dateRange: { start: Date; end: Date };
}

interface OverviewMetrics {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  courseCompletionRate: number;
  averageSessionLength: number;
  skillMasteryVelocity: number;
  // Trends (percentage change from previous period)
  trends: {
    users: number;
    completion: number;
    sessionLength: number;
    masteryVelocity: number;
  };
  // Time series data
  dailyActiveUsers: { date: string; value: number }[];
  completionRateTrend: { date: string; value: number }[];
  sessionLengthTrend: { date: string; value: number }[];
}

export function OverviewPanel({ dateRange }: OverviewPanelProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/overview', {
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
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold">Error loading metrics</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Use mock data if API not yet implemented
  const data = metrics || getMockMetrics();

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={data.totalUsers.toLocaleString()}
          trend={data.trends.users}
          subtitle={`${data.activeUsers7d} active (7d)`}
        />
        <MetricCard
          title="Course Completion"
          value={`${data.courseCompletionRate}%`}
          trend={data.trends.completion}
          subtitle="vs industry avg 10%"
          highlight={data.courseCompletionRate > 10}
        />
        <MetricCard
          title="Avg Session Length"
          value={`${data.averageSessionLength} min`}
          trend={data.trends.sessionLength}
          subtitle="target: 15 min"
        />
        <MetricCard
          title="Mastery Velocity"
          value={`${data.skillMasteryVelocity}/hr`}
          trend={data.trends.masteryVelocity}
          subtitle="skills mastered per hour"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Active Users
          </h3>
          <MetricsChart
            data={data.dailyActiveUsers}
            color="#4F46E5"
            label="Active Users"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Course Completion Trend
          </h3>
          <MetricsChart
            data={data.completionRateTrend}
            color="#10B981"
            label="Completion Rate %"
          />
        </div>
      </div>

      {/* Session Length Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Session Length Trend
        </h3>
        <MetricsChart
          data={data.sessionLengthTrend}
          color="#F59E0B"
          label="Minutes"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  subtitle: string;
  highlight?: boolean;
}

function MetricCard({ title, value, trend, subtitle, highlight }: MetricCardProps) {
  const isPositive = trend >= 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-6 ${
        highlight ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}
    >
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span
          className={`text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? '+' : ''}
          {trend}%
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function getMockMetrics(): OverviewMetrics {
  const today = new Date();
  const dailyActiveUsers = [];
  const completionRateTrend = [];
  const sessionLengthTrend = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    dailyActiveUsers.push({
      date: dateStr,
      value: Math.floor(50 + Math.random() * 100),
    });

    completionRateTrend.push({
      date: dateStr,
      value: Math.floor(15 + Math.random() * 20),
    });

    sessionLengthTrend.push({
      date: dateStr,
      value: Math.floor(10 + Math.random() * 15),
    });
  }

  return {
    totalUsers: 1247,
    activeUsers7d: 342,
    activeUsers30d: 891,
    courseCompletionRate: 28,
    averageSessionLength: 18,
    skillMasteryVelocity: 2.4,
    trends: {
      users: 12,
      completion: 45,
      sessionLength: 8,
      masteryVelocity: 15,
    },
    dailyActiveUsers,
    completionRateTrend,
    sessionLengthTrend,
  };
}
