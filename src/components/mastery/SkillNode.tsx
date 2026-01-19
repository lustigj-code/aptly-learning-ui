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
 * Enhanced in Phase 6: Research-backed visualization (decay cracks, gold glow)
 */

// ============================================================================
// ENHANCED STATUS CONFIGURATION (Research-backed)
// ============================================================================

interface StatusStyle {
  fill: string;
  stroke: string;
  text: string;
  effect?: 'none' | 'pulse' | 'glow' | 'cracked';
}

/**
 * Enhanced status colors with visual effects
 *
 * Research shows:
 * - Gold glow for high-stability mastery increases motivation
 * - Cracked effect for decay creates urgency without discouragement
 * - Bright teal for active creates focus
 */
const STATUS_STYLES: Record<SkillNodeStatus | 'mastered_stable', StatusStyle> = {
  locked: {
    fill: '#f3f4f6',
    stroke: '#9ca3af',
    text: '#6b7280',
    effect: 'none',
  },
  available: {
    fill: '#ccfbf1',
    stroke: '#14b8a6',
    text: '#0d9488',
    effect: 'none',
  },
  active: {
    fill: '#67e8f9', // Bright teal
    stroke: '#06b6d4',
    text: '#0891b2',
    effect: 'pulse',
  },
  mastered: {
    fill: '#dcfce7',
    stroke: '#22c55e',
    text: '#16a34a',
    effect: 'none',
  },
  mastered_stable: {
    fill: '#fef3c7', // Gold
    stroke: '#f59e0b',
    text: '#d97706',
    effect: 'glow',
  },
  decaying: {
    fill: '#fed7aa',
    stroke: '#f97316',
    text: '#ea580c',
    effect: 'cracked',
  },
};

// Legacy compatibility
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

  // Check for high-stability mastery
  const isStableMastery = node.status === 'mastered' && node.pMastery >= 0.98;
  const displayColors = isStableMastery ? STATUS_STYLES.mastered_stable : colors;

  return (
    <g
      style={{ cursor: onClick && node.status !== 'locked' ? 'pointer' : 'default' }}
      onClick={() => onClick?.(node)}
      className="skill-node transition-transform hover:translate-y-[-2px]"
    >
      {/* Shadow layer */}
      <rect
        x={x + 2}
        y={y + 2}
        width={config.nodeWidth}
        height={config.nodeHeight}
        rx={10}
        fill="black"
        opacity={0.1}
        style={{
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Node background with gradient */}
      <defs>
        <linearGradient id={`node-gradient-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={displayColors.fill} stopOpacity="1" />
          <stop offset="100%" stopColor={displayColors.fill} stopOpacity="0.9" />
        </linearGradient>
        {isStableMastery && (
          <filter id={`gold-glow-${node.id}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feFlood floodColor="#f59e0b" floodOpacity="0.4" />
            <feComposite in2="coloredBlur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <rect
        x={x}
        y={y}
        width={config.nodeWidth}
        height={config.nodeHeight}
        rx={10}
        fill={`url(#node-gradient-${node.id})`}
        stroke={isSelected ? '#0A004A' : displayColors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        filter={isStableMastery ? `url(#gold-glow-${node.id})` : undefined}
        style={{
          transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
        }}
      />

      {/* Progress bar background track */}
      {(node.status === 'available' || node.status === 'active' || node.status === 'decaying') && (
        <rect
          x={x + 6}
          y={y + config.nodeHeight - 10}
          width={config.nodeWidth - 12}
          height={6}
          rx={3}
          fill={displayColors.fill}
          opacity={0.3}
        />
      )}

      {/* Progress bar (for available/active nodes) */}
      {(node.status === 'available' || node.status === 'active') && node.pMastery > 0 && (
        <g>
          <rect
            x={x + 6}
            y={y + config.nodeHeight - 10}
            width={(config.nodeWidth - 12) * Math.min(node.pMastery, 1)}
            height={6}
            rx={3}
            fill="#14b8a6"
          >
            <animate
              attributeName="width"
              from="0"
              to={`${(config.nodeWidth - 12) * Math.min(node.pMastery, 1)}`}
              dur="0.8s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
            />
          </rect>
          {/* Shimmer effect */}
          <rect
            x={x + 6}
            y={y + config.nodeHeight - 10}
            width={(config.nodeWidth - 12) * Math.min(node.pMastery, 1)}
            height={6}
            rx={3}
            fill="white"
            opacity={0.3}
          >
            <animate
              attributeName="opacity"
              values="0;0.3;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      )}

      {/* Decay indicator bar with warning pulse */}
      {node.status === 'decaying' && node.retrievability !== undefined && (
        <g>
          <rect
            x={x + 6}
            y={y + config.nodeHeight - 10}
            width={(config.nodeWidth - 12) * node.retrievability}
            height={6}
            rx={3}
            fill="#f97316"
          >
            <animate
              attributeName="opacity"
              values="1;0.6;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
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

// ============================================================================
// VISUAL EFFECT COMPONENTS (Research-backed Enhancement)
// ============================================================================

/**
 * Cracked Overlay Component
 *
 * Shows decay visually with a subtle crack pattern.
 * Intensity scales with decay severity.
 */
interface CrackedOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number; // 0-1, higher = more visible cracks
}

export function CrackedOverlay({ x, y, width, height, intensity }: CrackedOverlayProps) {
  return (
    <g opacity={intensity * 0.5}>
      <defs>
        <pattern id="cracks" patternUnits="userSpaceOnUse" width="20" height="20">
          <path
            d="M0,10 L10,0 M10,20 L20,10 M5,5 L15,15"
            stroke="#78350f"
            strokeWidth="0.5"
            fill="none"
          />
        </pattern>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="url(#cracks)"
        pointerEvents="none"
      />
    </g>
  );
}

/**
 * Gold Glow Filter
 *
 * Applied to mastered_stable nodes to show high stability.
 */
export function GoldGlowFilter() {
  return (
    <defs>
      <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feFlood floodColor="#f59e0b" floodOpacity="0.4" />
        <feComposite in2="coloredBlur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/**
 * Pulse Animation Style
 *
 * For active nodes to draw attention.
 */
export const pulseAnimationStyle = `
  @keyframes nodePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .skill-node-pulse {
    animation: nodePulse 2s ease-in-out infinite;
  }
`;

// ============================================================================
// STATUS DERIVATION (Research-backed Logic)
// ============================================================================

/**
 * Derive node status from mastery and stability
 *
 * Research-backed thresholds:
 * - mastered_stable: mastery >= 95% AND stability >= 30 days
 * - mastered: mastery >= 95%
 * - decaying: stability < 7 days AND mastery > 50%
 *
 * @param mastery - Current mastery level (0-1)
 * @param stability - FSRS stability in days
 * @param isUnlocked - Whether prerequisites are met
 * @param isActive - Whether currently being worked on
 */
export function deriveNodeStatus(
  mastery: number,
  stability: number,
  isUnlocked: boolean,
  isActive: boolean
): SkillNodeStatus | 'mastered_stable' {
  if (!isUnlocked) return 'locked';
  if (isActive) return 'active';

  // High mastery checks
  if (mastery >= 0.95) {
    // High stability = gold glow (mastered_stable)
    if (stability >= 30) return 'mastered_stable';
    return 'mastered';
  }

  // Decaying: low stability with partial mastery
  if (stability < 7 && mastery > 0.5) {
    return 'decaying';
  }

  return 'available';
}

/**
 * Calculate decay intensity for visual effect
 *
 * @param stability - FSRS stability in days
 * @param retrievability - Current retrievability (0-1)
 */
export function calculateDecayIntensity(
  stability: number,
  retrievability: number
): number {
  // Stability below 7 days shows cracks
  // Retrievability below 70% intensifies cracks
  if (stability >= 7) return 0;

  const stabilityFactor = 1 - (stability / 7);
  const retrievabilityFactor = retrievability < 0.7 ? (0.7 - retrievability) / 0.7 : 0;

  return Math.min(1, stabilityFactor + retrievabilityFactor * 0.5);
}

/**
 * Get status style including enhanced visual effects
 */
export function getStatusStyle(
  status: SkillNodeStatus,
  stability?: number
): StatusStyle {
  // Check for mastered_stable upgrade
  if (status === 'mastered' && stability !== undefined && stability >= 30) {
    return STATUS_STYLES.mastered_stable;
  }

  return STATUS_STYLES[status] || STATUS_STYLES.available;
}

export default SkillNode;
