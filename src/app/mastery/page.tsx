'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/store/unifiedStore';
import { useMasteryMap } from '@/hooks/useMasteryMap';
import { EnhancedMasteryMap } from '@/components/mastery';
import type { SkillNodeData } from '@/components/mastery/types';
import { Loader2, RefreshCw, Map, TrendingUp, Target, Clock, Award } from 'lucide-react';

/**
 * Mastery Map Page
 *
 * Visual skill prerequisite graph showing:
 * - All skills as nodes with mastery status
 * - Prerequisite relationships as edges
 * - Current learning position highlighted
 * - Enhanced with Framer Motion animations
 *
 * Part of Phase 14: Mastery Map UX
 */
export default function MasteryMapPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data, stats, isLoading, error, refresh } = useMasteryMap(user?.id ?? null);

  const handleNodeClick = useCallback((node: SkillNodeData) => {
    console.log('Clicked node:', node);
  }, []);

  const handleNavigate = useCallback((skillId: string, lessonId: string) => {
    // Navigate to the lesson for this skill
    router.push(`/learn/${lessonId}`);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <div className="text-center">
          <Map className="w-16 h-16 text-grey mx-auto mb-4" />
          <p className="text-grey text-lg">Please sign in to view your mastery map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-grey">
      {/* Header */}
      <div className="bg-white border-b border-grey/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
                <Map className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-navy">Mastery Map</h1>
                <p className="text-grey text-sm md:text-base">Visualize your learning journey</p>
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 space-y-6 md:space-y-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <StatCard
              label="Total Skills"
              value={stats.totalSkills}
              icon={<Target className="w-5 h-5" />}
              color="navy"
            />
            <StatCard
              label="Mastered"
              value={stats.mastered}
              icon={<Award className="w-5 h-5" />}
              color="green"
              highlight
            />
            <StatCard
              label="Available"
              value={stats.available}
              icon={<TrendingUp className="w-5 h-5" />}
              color="teal"
            />
            <StatCard
              label="Locked"
              value={stats.locked}
              icon={<Clock className="w-5 h-5" />}
              color="grey"
            />
            <StatCard
              label="Needs Review"
              value={stats.decaying}
              icon={<RefreshCw className="w-5 h-5" />}
              color="orange"
              warning={stats.decaying > 0}
            />
          </div>
        )}

        {/* Progress Summary */}
        {stats && stats.totalSkills > 0 && (
          <div className="bg-white rounded-xl border border-grey/20 p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm md:text-base font-medium text-navy">Overall Progress</span>
              <span className="text-base md:text-lg font-bold text-teal">
                {Math.round((stats.mastered / stats.totalSkills) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.mastered / stats.totalSkills) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Map */}
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-grey/20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-teal animate-spin mx-auto mb-3" />
              <p className="text-grey">Loading your skill map...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-red-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">!</span>
              </div>
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 text-sm text-teal hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : data ? (
          <EnhancedMasteryMap
            data={data}
            onNodeClick={handleNodeClick}
            onNavigate={handleNavigate}
            showLegend
            showControls
            variant="full"
            className="h-[600px]"
          />
        ) : null}

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-grey/20 p-5 md:p-6 shadow-sm">
          <h3 className="font-semibold text-navy mb-4 md:mb-6">How to Use This Map</h3>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div>
              <h4 className="text-sm font-medium text-navy mb-2">Node States</h4>
              <ul className="text-sm text-grey space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-400 rounded-full flex-shrink-0" />
                  <span><strong>Locked</strong> - Complete prerequisites first</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-teal rounded-full flex-shrink-0" />
                  <span><strong>Available</strong> - Ready to learn</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-amber-500 rounded-full flex-shrink-0" />
                  <span><strong>Active</strong> - Currently learning</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0" />
                  <span><strong>Mastered</strong> - Well learned (95%+ mastery)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-orange-500 rounded-full flex-shrink-0" />
                  <span><strong>Review</strong> - Memory fading, review soon</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-navy mb-2">Navigation</h4>
              <ul className="text-sm text-grey space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">+/-</span>
                  <span>Zoom in/out</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">0</span>
                  <span>Fit to screen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">Drag</span>
                  <span>Pan around the map</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">Click</span>
                  <span>Select a skill for details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-teal/20 rounded flex items-center justify-center flex-shrink-0">
                    <Target className="w-2.5 h-2.5 text-teal" />
                  </span>
                  <span>Center on current skill</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  warning?: boolean;
}

function StatCard({ label, value, color, icon, highlight, warning }: StatCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    navy: { bg: 'bg-navy/10', text: 'text-navy', iconBg: 'bg-navy/20' },
    green: { bg: 'bg-green-100', text: 'text-green-600', iconBg: 'bg-green-200' },
    teal: { bg: 'bg-teal/10', text: 'text-teal', iconBg: 'bg-teal/20' },
    grey: { bg: 'bg-gray-100', text: 'text-gray-500', iconBg: 'bg-gray-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-500', iconBg: 'bg-orange-200' },
  };

  const colors = colorClasses[color] || colorClasses.grey;

  return (
    <div
      className={`rounded-xl p-4 md:p-5 transition-all ${colors.bg} ${
        highlight ? 'ring-2 ring-green-400 ring-offset-2' : ''
      } ${warning ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xl md:text-2xl font-bold ${colors.text} truncate`}>{value}</p>
          <p className={`text-xs md:text-sm opacity-80 ${colors.text}`}>{label}</p>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${colors.iconBg} ${colors.text} flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
