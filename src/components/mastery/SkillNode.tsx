'use client';

import { Lock, Play, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import type { SkillNodeData, SkillNodeStatus } from './types';

interface SkillNodeProps {
  node: SkillNodeData;
  isSelected?: boolean;
  onClick?: (node: SkillNodeData) => void;
  config: {
    nodeWidth: number;
    nodeHeight: number;
  };
}

/**
 * Skill Node Component
 *
 * Individual node in the mastery map visualization.
 * Shows skill name, status, and progress.
 *
 * Part of Phase 14: Mastery Map UX
 */

const STATUS_COLORS: Record<SkillNodeStatus, { fill: string; stroke: string; text: string }> = {
  locked: { fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280' },
  available: { fill: '#ccfbf1', stroke: '#14b8a6', text: '#0d9488' },
  active: { fill: '#fef3c7', stroke: '#f59e0b', text: '#d97706' },
  mastered: { fill: '#dcfce7', stroke: '#22c55e', text: '#16a34a' },
  decaying: { fill: '#fed7aa', stroke: '#f97316', text: '#ea580c' },
};

const STATUS_ICONS: Record<SkillNodeStatus, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  locked: Lock,
  available: Play,
  active: Star,
  mastered: CheckCircle,
  decaying: AlertTriangle,
};

export function SkillNode({ node, isSelected, onClick, config }: SkillNodeProps) {
  const colors = STATUS_COLORS[node.status];
  const Icon = STATUS_ICONS[node.status];

  const x = node.position.x - config.nodeWidth / 2;
  const y = node.position.y - config.nodeHeight / 2;

  return (
    <g
      style={{ cursor: onClick && node.status !== 'locked' ? 'pointer' : 'default' }}
      onClick={() => onClick?.(node)}
      className="skill-node"
    >
      {/* Node background */}
      <rect
        x={x}
        y={y}
        width={config.nodeWidth}
        height={config.nodeHeight}
        rx={8}
        fill={colors.fill}
        stroke={isSelected ? '#1e3a5f' : colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* Progress bar (for available/active nodes) */}
      {(node.status === 'available' || node.status === 'active') && node.pMastery > 0 && (
        <rect
          x={x + 4}
          y={y + config.nodeHeight - 8}
          width={(config.nodeWidth - 8) * Math.min(node.pMastery, 1)}
          height={4}
          rx={2}
          fill="#14b8a6"
        />
      )}

      {/* Decay indicator bar */}
      {node.status === 'decaying' && node.retrievability !== undefined && (
        <rect
          x={x + 4}
          y={y + config.nodeHeight - 8}
          width={(config.nodeWidth - 8) * node.retrievability}
          height={4}
          rx={2}
          fill="#f97316"
        />
      )}

      {/* Icon */}
      <foreignObject
        x={x + 8}
        y={y + config.nodeHeight / 2 - 10}
        width={20}
        height={20}
      >
        <Icon
          style={{ width: '16px', height: '16px', color: colors.text }}
        />
      </foreignObject>

      {/* Label */}
      <text
        x={x + 32}
        y={y + config.nodeHeight / 2 - 4}
        fill={colors.text}
        fontSize="11"
        fontWeight="500"
      >
        {truncateText(node.name, 14)}
      </text>

      {/* Mastery percentage */}
      <text
        x={x + config.nodeWidth - 8}
        y={y + 14}
        textAnchor="end"
        fill="#9ca3af"
        fontSize="10"
      >
        {Math.round(node.pMastery * 100)}%
      </text>

      {/* Module indicator */}
      <text
        x={x + 8}
        y={y + 14}
        fill="#9ca3af"
        fontSize="9"
      >
        M{node.moduleId}
      </text>
    </g>
  );
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength - 2) + '...' : text;
}

export default SkillNode;
