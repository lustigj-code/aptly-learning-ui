'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/store/unifiedStore';
import { useRouter } from 'next/navigation';
import { OverviewPanel } from '@/components/admin/OverviewPanel';
import { ExperimentPanel } from '@/components/admin/ExperimentPanel';
import { CohortAnalysis } from '@/components/admin/CohortAnalysis';
import { InterventionEffectiveness } from '@/components/admin/InterventionEffectiveness';
import { RetentionAnalysis } from '@/components/admin/RetentionAnalysis';

type TabId = 'overview' | 'experiments' | 'cohorts' | 'interventions' | 'retention';

interface Tab {
  id: TabId;
  name: string;
  description: string;
}

const TABS: Tab[] = [
  { id: 'overview', name: 'Overview', description: 'Key metrics and trends' },
  { id: 'experiments', name: 'Experiments', description: 'A/B test results' },
  { id: 'cohorts', name: 'Cohort Analysis', description: 'Compare user groups' },
  { id: 'interventions', name: 'Interventions', description: 'Struggle detection impact' },
  { id: 'retention', name: 'Retention', description: 'Long-term learning proof' },
];

export default function AnalyticsDashboard() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Proof of adaptive learning efficacy
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From:</label>
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: new Date(e.target.value),
                    }))
                  }
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To:</label>
                <input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: new Date(e.target.value),
                    }))
                  }
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="mt-6 flex space-x-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewPanel dateRange={dateRange} />}
        {activeTab === 'experiments' && <ExperimentPanel />}
        {activeTab === 'cohorts' && <CohortAnalysis dateRange={dateRange} />}
        {activeTab === 'interventions' && (
          <InterventionEffectiveness dateRange={dateRange} />
        )}
        {activeTab === 'retention' && <RetentionAnalysis />}
      </main>
    </div>
  );
}
