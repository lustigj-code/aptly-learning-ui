'use client';

import { useUser } from '@/store/unifiedStore';
import { useMasteryMap } from '@/hooks/useMasteryMap';
import { MasteryMap } from '@/components/mastery';
import { Loader2, RefreshCw, Map } from 'lucide-react';

/**
 * Mastery Map Page
 *
 * Visual skill prerequisite graph showing:
 * - All skills as nodes with mastery status
 * - Prerequisite relationships as edges
 * - Current learning position highlighted
 *
 * Part of Phase 14: Mastery Map UX
 */
export default function MasteryMapPage() {
  const { user } = useUser();
  const { data, stats, isLoading, error, refresh } = useMasteryMap(user?.id ?? null);

  if (!user) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <p className="text-grey">Please sign in to view your mastery map.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-grey p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="w-8 h-8 text-teal" />
            <div>
              <h1 className="text-2xl font-bold text-navy">Mastery Map</h1>
              <p className="text-grey text-sm">Track your learning journey</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Skills" value={stats.totalSkills} color="navy" />
            <StatCard label="Mastered" value={stats.mastered} color="green" />
            <StatCard label="Available" value={stats.available} color="teal" />
            <StatCard label="Locked" value={stats.locked} color="grey" />
            <StatCard label="Needs Review" value={stats.decaying} color="orange" />
          </div>
        )}

        {/* Map */}
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-grey/20">
            <Loader2 className="w-8 h-8 text-teal animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-red-200">
            <p className="text-red-500">{error}</p>
          </div>
        ) : data ? (
          <MasteryMap
            data={data}
            onNodeClick={(node) => {
              console.log('Clicked node:', node);
            }}
            className="min-h-[500px]"
          />
        ) : null}

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-grey/20 p-4">
          <h3 className="font-semibold text-navy mb-2">How to read this map</h3>
          <ul className="text-sm text-grey space-y-1">
            <li><span className="inline-block w-3 h-3 bg-gray-400 rounded mr-2" />Locked - Complete prerequisites first</li>
            <li><span className="inline-block w-3 h-3 bg-teal rounded mr-2" />Available - Ready to learn</li>
            <li><span className="inline-block w-3 h-3 bg-amber-500 rounded mr-2" />Active - Currently learning</li>
            <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2" />Mastered - Well learned</li>
            <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2" />Needs Review - Memory fading, review soon</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    navy: 'bg-navy/10 text-navy',
    green: 'bg-green-100 text-green-600',
    teal: 'bg-teal/10 text-teal',
    grey: 'bg-gray-100 text-gray-500',
    orange: 'bg-orange-100 text-orange-500',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}
