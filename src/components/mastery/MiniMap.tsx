'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Map, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { MasteryMapData, SkillNodeStatus } from './types';
import { MINI_NODE_COLORS } from '@/lib/design-tokens';

/**
 * Mini Map Component
 *
 * Compact visualization for dashboard or sidebar showing:
 * - Overall progress summary
 * - Current position indicator
 * - Quick access to full map
 * - Simplified node representation
 *
 * Part of Phase 14: Mastery Map UX
 */

interface MiniMapProps {
  data: MasteryMapData | null;
  isLoading?: boolean;
  onViewFullMap?: () => void;
  position?: 'left' | 'right';
  className?: string;
}

export function MiniMap({
  data,
  isLoading = false,
  onViewFullMap,
  className = '',
}: MiniMapProps) {
  // Calculate stats
  const stats = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return {
        total: 0,
        mastered: 0,
        available: 0,
        locked: 0,
        decaying: 0,
        active: 0,
        progress: 0,
      };
    }

    const counts = {
      total: data.nodes.length,
      mastered: 0,
      available: 0,
      locked: 0,
      decaying: 0,
      active: 0,
    };

    data.nodes.forEach((node) => {
      counts[node.status]++;
    });

    return {
      ...counts,
      progress: Math.round((counts.mastered / counts.total) * 100),
    };
  }, [data]);

  // Get current skill info
  const currentSkill = useMemo(() => {
    if (!data?.currentSkillId) return null;
    return data.nodes.find((n) => n.id === data.currentSkillId);
  }, [data]);

  // Get recommended next skills (available, highest priority)
  const recommendedSkills = useMemo(() => {
    if (!data) return [];
    return data.nodes
      .filter((n) => n.status === 'available' && n.id !== data.currentSkillId)
      .sort((a, b) => b.pMastery - a.pMastery)
      .slice(0, 3);
  }, [data]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-grey/20 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-grey/20 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-grey">
          <Map className="w-5 h-5" />
          <span className="text-sm">No skill data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-grey/20 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-grey/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-teal" />
          <h3 className="font-semibold text-navy">Skill Map</h3>
        </div>
        {onViewFullMap ? (
          <button
            onClick={onViewFullMap}
            className="text-xs text-teal hover:text-teal-dark flex items-center gap-1 transition-colors"
          >
            View Full Map
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href="/mastery"
            className="text-xs text-teal hover:text-teal-dark flex items-center gap-1 transition-colors"
          >
            View Full Map
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Progress Summary */}
      <div className="px-4 py-3 border-b border-grey/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-grey">Overall Progress</span>
          <span className="text-sm font-semibold text-navy">{stats.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-grey">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {stats.mastered} mastered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal" />
            {stats.available} available
          </span>
          {stats.decaying > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {stats.decaying} review
            </span>
          )}
        </div>
      </div>

      {/* Mini Graph Visualization */}
      <div className="px-4 py-3 border-b border-grey/10">
        <MiniGraphView data={data} />
      </div>

      {/* Current Skill */}
      {currentSkill && (
        <div className="px-4 py-3 border-b border-grey/10 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">Currently Learning</span>
          </div>
          <p className="text-sm font-medium text-navy">{currentSkill.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentSkill.pMastery * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-amber-600">
              {Math.round(currentSkill.pMastery * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Recommended Next */}
      {recommendedSkills.length > 0 && (
        <div className="px-4 py-3">
          <span className="text-xs font-medium text-grey block mb-2">Up Next</span>
          <div className="space-y-2">
            {recommendedSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-navy truncate flex-1">{skill.name}</span>
                <span className="text-xs text-teal ml-2">
                  {Math.round(skill.pMastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mini Graph Visualization
 * Shows a simplified dot representation of the skill graph
 */
function MiniGraphView({
  data,
}: {
  data: MasteryMapData;
}) {
  // Calculate layout for mini dots
  const dotLayout = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(data.nodes.length * 1.5));
    const rows = Math.ceil(data.nodes.length / cols);
    const dotSize = 8;
    const gap = 4;

    return {
      cols,
      rows,
      dotSize,
      gap,
      width: cols * (dotSize + gap),
      height: rows * (dotSize + gap),
    };
  }, [data.nodes.length]);

  // Sort nodes by status priority for visual grouping
  const sortedNodes = useMemo(() => {
    const priority: Record<SkillNodeStatus, number> = {
      mastered: 0,
      active: 1,
      available: 2,
      decaying: 3,
      locked: 4,
    };
    return [...data.nodes].sort((a, b) => priority[a.status] - priority[b.status]);
  }, [data.nodes]);

  return (
    <div className="flex justify-center">
      <svg
        width={dotLayout.width}
        height={dotLayout.height}
        viewBox={`0 0 ${dotLayout.width} ${dotLayout.height}`}
      >
        {sortedNodes.map((node, index) => {
          const col = index % dotLayout.cols;
          const row = Math.floor(index / dotLayout.cols);
          const x = col * (dotLayout.dotSize + dotLayout.gap) + dotLayout.dotSize / 2;
          const y = row * (dotLayout.dotSize + dotLayout.gap) + dotLayout.dotSize / 2;

          const isCurrent = node.id === data.currentSkillId;

          return (
            <motion.circle
              key={node.id}
              cx={x}
              cy={y}
              r={isCurrent ? dotLayout.dotSize / 2 + 1 : dotLayout.dotSize / 2 - 1}
              fill={MINI_NODE_COLORS[node.status]}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: node.status === 'locked' ? 0.4 : 1,
              }}
              transition={{ duration: 0.3, delay: index * 0.01 }}
              style={{
                filter: isCurrent ? 'drop-shadow(0 0 3px #f59e0b)' : 'none',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Collapsible Sidebar MiniMap
 * For use in learning page sidebar
 */
interface CollapsibleMiniMapProps extends MiniMapProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CollapsibleMiniMap({
  data,
  isLoading,
  onViewFullMap,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}: CollapsibleMiniMapProps) {
  const stats = useMemo(() => {
    if (!data || data.nodes.length === 0) return { progress: 0, mastered: 0, total: 0 };

    const mastered = data.nodes.filter((n) => n.status === 'mastered').length;
    return {
      progress: Math.round((mastered / data.nodes.length) * 100),
      mastered,
      total: data.nodes.length,
    };
  }, [data]);

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`w-full bg-white rounded-lg border border-grey/20 p-3 flex items-center gap-3 hover:bg-light-grey/50 transition-colors ${className}`}
      >
        <div className="relative">
          <Map className="w-5 h-5 text-teal" />
          {stats.progress > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-grey">
          {stats.mastered}/{stats.total}
        </span>
        <ChevronRight className="w-4 h-4 text-grey" />
      </button>
    );
  }

  return (
    <div className={className}>
      <MiniMap
        data={data}
        isLoading={isLoading}
        onViewFullMap={onViewFullMap}
      />
    </div>
  );
}

export default MiniMap;
