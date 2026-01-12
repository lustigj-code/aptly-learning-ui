'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Play, CheckCircle, AlertTriangle, Star, Zap } from 'lucide-react';
import type { SkillNodeData, SkillNodeStatus } from './types';
import { STATUS_COLORS, COLORS_RAW } from '@/lib/design-tokens';

/**
 * Mastery Map Node Component
 *
 * Circular node design with:
 * - Progress ring showing P(mastery) 0-100%
 * - Skill icon/letter in center
 * - Tooltip with skill details
 * - Pulse animation for current skill
 * - Visual states: locked, available, active, mastered, decaying
 *
 * Part of Phase 14: Mastery Map UX
 */

interface MasteryMapNodeProps {
  node: SkillNodeData;
  isSelected?: boolean;
  isCurrent?: boolean;
  onClick?: (node: SkillNodeData) => void;
  size?: 'sm' | 'md' | 'lg';
}

// Node size configurations
const NODE_SIZES = {
  sm: { outer: 48, inner: 36, stroke: 4, iconSize: 16, fontSize: 10 },
  md: { outer: 64, inner: 50, stroke: 5, iconSize: 20, fontSize: 12 },
  lg: { outer: 80, inner: 64, stroke: 6, iconSize: 24, fontSize: 14 },
} as const;

// Status-based icons (colors from design-tokens)
const STATUS_ICONS: Record<
  SkillNodeStatus,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  locked: Lock,
  available: Play,
  active: Zap,
  mastered: CheckCircle,
  decaying: AlertTriangle,
};

// Get status config from design tokens
const getStatusConfig = (status: SkillNodeStatus) => ({
  bgColor: STATUS_COLORS[status].bg,
  ringColor: STATUS_COLORS[status].ring,
  progressColor: STATUS_COLORS[status].progress,
  iconColor: STATUS_COLORS[status].icon,
  glowColor: STATUS_COLORS[status].glow,
  Icon: STATUS_ICONS[status],
});

export function MasteryMapNode({
  node,
  isSelected = false,
  isCurrent = false,
  onClick,
  size = 'md',
}: MasteryMapNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeConfig = NODE_SIZES[size];
  const statusConfig = getStatusConfig(node.status);
  const { Icon } = statusConfig;

  // Calculate progress ring
  const circumference = 2 * Math.PI * (sizeConfig.outer / 2 - sizeConfig.stroke / 2);
  const progress = Math.min(Math.max(node.pMastery, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);

  // Determine if clickable
  const isClickable = onClick && node.status !== 'locked';

  // Animation variants
  const nodeVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.08 },
    tap: { scale: 0.95 },
    selected: { scale: 1.1 },
  };

  const progressVariants = {
    initial: { strokeDashoffset: circumference },
    animate: {
      strokeDashoffset,
      transition: { duration: 0.8, ease: 'easeOut' as const },
    },
  };

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => isClickable && onClick(node)}
    >
      {/* Glow effect for active/current nodes */}
      {(isCurrent || node.status === 'active') && (
        <motion.circle
          r={sizeConfig.outer / 2 + 4}
          fill="none"
          stroke={statusConfig.glowColor}
          strokeWidth={8}
          opacity={0.5}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            r: [sizeConfig.outer / 2 + 4, sizeConfig.outer / 2 + 8, sizeConfig.outer / 2 + 4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Background ring (track) */}
      <circle
        r={sizeConfig.outer / 2 - sizeConfig.stroke / 2}
        fill="none"
        stroke={statusConfig.ringColor}
        strokeWidth={sizeConfig.stroke}
        opacity={0.2}
      />

      {/* Progress ring */}
      <motion.circle
        r={sizeConfig.outer / 2 - sizeConfig.stroke / 2}
        fill="none"
        stroke={statusConfig.progressColor}
        strokeWidth={sizeConfig.stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial="initial"
        animate="animate"
        variants={progressVariants}
        transform={`rotate(-90)`}
      />

      {/* Inner circle (main node body) */}
      <motion.circle
        r={sizeConfig.inner / 2}
        fill={statusConfig.bgColor}
        stroke={isSelected ? COLORS_RAW.navy : statusConfig.ringColor}
        strokeWidth={isSelected ? 3 : 2}
        variants={nodeVariants}
        initial="idle"
        whileHover={isClickable ? 'hover' : undefined}
        whileTap={isClickable ? 'tap' : undefined}
        animate={isSelected ? 'selected' : 'idle'}
      />

      {/* Icon */}
      <foreignObject
        x={-sizeConfig.iconSize / 2}
        y={-sizeConfig.iconSize / 2}
        width={sizeConfig.iconSize}
        height={sizeConfig.iconSize}
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex items-center justify-center w-full h-full" style={{ color: statusConfig.iconColor }}>
          <Icon
            size={sizeConfig.iconSize * 0.75}
            className="transition-colors"
          />
        </div>
      </foreignObject>

      {/* Mastery percentage (below node) */}
      <text
        y={sizeConfig.outer / 2 + 12}
        textAnchor="middle"
        fontSize={sizeConfig.fontSize}
        fontWeight="600"
        fill={statusConfig.iconColor}
        style={{ pointerEvents: 'none' }}
      >
        {Math.round(node.pMastery * 100)}%
      </text>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <foreignObject
              x={-100}
              y={-sizeConfig.outer / 2 - 70}
              width={200}
              height={60}
              style={{ pointerEvents: 'none', overflow: 'visible' }}
            >
              <div className="flex justify-center">
                <div className="bg-navy text-white px-3 py-2 rounded-lg shadow-lg max-w-[180px]">
                  <p className="text-xs font-semibold truncate">{node.name}</p>
                  <p className="text-xs opacity-80 mt-0.5">
                    {getStatusLabel(node.status)}
                    {node.retrievability !== undefined && node.status === 'decaying' && (
                      <span className="ml-1">({Math.round(node.retrievability * 100)}% retention)</span>
                    )}
                  </p>
                </div>
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Module badge */}
      <g transform={`translate(${sizeConfig.inner / 2 - 4}, ${-sizeConfig.inner / 2 + 4})`}>
        <circle r={10} fill="white" stroke={statusConfig.ringColor} strokeWidth={1.5} />
        <text
          textAnchor="middle"
          dy="0.35em"
          fontSize={8}
          fontWeight="600"
          fill={statusConfig.iconColor}
        >
          {node.moduleId}
        </text>
      </g>

      {/* Star indicator for high-stability mastery */}
      {node.status === 'mastered' && node.pMastery >= 0.98 && (
        <motion.g
          transform={`translate(${-sizeConfig.inner / 2 + 4}, ${-sizeConfig.inner / 2 + 4})`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Star
            size={14}
            fill={COLORS_RAW.yellow}
            stroke={COLORS_RAW.yellowDark}
            strokeWidth={1.5}
          />
        </motion.g>
      )}
    </g>
  );
}

function getStatusLabel(status: SkillNodeStatus): string {
  switch (status) {
    case 'locked':
      return 'Locked - Complete prerequisites';
    case 'available':
      return 'Available - Ready to learn';
    case 'active':
      return 'Active - Currently learning';
    case 'mastered':
      return 'Mastered';
    case 'decaying':
      return 'Needs Review';
    default:
      return status;
  }
}

export default MasteryMapNode;
