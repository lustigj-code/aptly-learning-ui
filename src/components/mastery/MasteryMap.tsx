'use client';

import { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, Target } from 'lucide-react';
import { SkillNode } from './SkillNode';
import type { MasteryMapData, MasteryMapConfig, SkillNodeData } from './types';
import { DEFAULT_MAP_CONFIG } from './types';

interface MasteryMapProps {
  data: MasteryMapData;
  config?: Partial<MasteryMapConfig>;
  onNodeClick?: (node: SkillNodeData) => void;
  className?: string;
  showLegend?: boolean;
}

/**
 * Mastery Map Component
 *
 * Visual skill prerequisite graph showing:
 * - All skills as nodes with mastery status
 * - Prerequisite relationships as edges
 * - Current learning position highlighted
 *
 * Part of Phase 14: Mastery Map UX
 */
export function MasteryMap({
  data,
  config: customConfig,
  onNodeClick,
  className = '',
  showLegend = true,
}: MasteryMapProps) {
  const config = { ...DEFAULT_MAP_CONFIG, ...customConfig };
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Calculate SVG dimensions
  const dimensions = useMemo(() => {
    if (data.nodes.length === 0) return { width: 400, height: 300 };

    const maxX = Math.max(...data.nodes.map(n => n.position.x)) + config.nodeWidth;
    const maxY = Math.max(...data.nodes.map(n => n.position.y)) + config.nodeHeight;

    return {
      width: Math.max(maxX + 40, 400),
      height: Math.max(maxY + 40, 300),
    };
  }, [data.nodes, config.nodeWidth, config.nodeHeight]);

  const handleNodeClick = (node: SkillNodeData) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    onNodeClick?.(node);
  };

  const centerOnCurrent = () => {
    if (data.currentSkillId) {
      setSelectedNodeId(data.currentSkillId);
    }
  };

  if (data.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-white rounded-xl border border-grey/20 ${className}`}>
        <p className="text-grey">No skills to display</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white border border-grey/20 ${className}`}>
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          className="p-1.5 bg-white border border-grey/30 rounded-lg hover:bg-light-grey transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-grey" />
        </button>
        <span className="text-xs text-grey w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          className="p-1.5 bg-white border border-grey/30 rounded-lg hover:bg-light-grey transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-grey" />
        </button>
        {data.currentSkillId && (
          <button
            onClick={centerOnCurrent}
            className="p-1.5 bg-teal/10 border border-teal/30 rounded-lg hover:bg-teal/20 transition-colors"
            title="Go to current skill"
          >
            <Target className="w-4 h-4 text-teal" />
          </button>
        )}
      </div>

      {/* Map */}
      <div className="overflow-auto" style={{ maxHeight: '500px' }}>
        <svg
          width={dimensions.width * zoom}
          height={dimensions.height * zoom}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="select-none"
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#14b8a6" />
            </marker>
          </defs>

          {/* Edges (draw first so they appear behind nodes) */}
          <g className="edges">
            {data.edges.map((edge, i) => {
              const fromNode = data.nodes.find(n => n.id === edge.from);
              const toNode = data.nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const isActive = toNode.status !== 'locked';

              return (
                <path
                  key={`edge-${i}`}
                  d={`M ${fromNode.position.x} ${fromNode.position.y + config.nodeHeight / 2}
                      C ${fromNode.position.x} ${fromNode.position.y + config.nodeHeight / 2 + 40},
                        ${toNode.position.x} ${toNode.position.y - config.nodeHeight / 2 - 40},
                        ${toNode.position.x} ${toNode.position.y - config.nodeHeight / 2}`}
                  fill="none"
                  stroke={isActive ? '#14b8a6' : '#d1d5db'}
                  strokeWidth={2}
                  strokeDasharray={toNode.status === 'locked' ? '4 4' : 'none'}
                  markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {data.nodes.map(node => (
              <SkillNode
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId || node.id === data.currentSkillId}
                onClick={config.interactive ? handleNodeClick : undefined}
                config={config}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-grey/20 bg-light-grey/30 flex-wrap">
          <LegendItem color="#9ca3af" label="Locked" />
          <LegendItem color="#14b8a6" label="Available" />
          <LegendItem color="#f59e0b" label="Active" />
          <LegendItem color="#22c55e" label="Mastered" />
          <LegendItem color="#f97316" label="Needs Review" />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-grey">
      <div
        className="w-3 h-3 rounded"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

export default MasteryMap;
