'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Target,
  Maximize2,
  ChevronRight,
  List,
} from 'lucide-react';
import { MasteryMapNode } from './MasteryMapNode';
import type { MasteryMapData, SkillNodeData, MasteryMapConfig } from './types';
import { DEFAULT_MAP_CONFIG } from './types';
import {
  calculateFitZoom,
  calculateCenterPan,
  shouldUseVerticalList,
  type LayoutResult,
} from '@/lib/mastery/mapLayout';
import { SPRING } from '@/lib/motion/springs';
import { COLORS_RAW } from '@/lib/design-tokens';

/**
 * Enhanced Mastery Map Component
 *
 * Features:
 * - Framer Motion animations for smooth transitions
 * - Touch-enabled zoom and pan
 * - Mobile-responsive with vertical list fallback
 * - Legend with status indicators
 * - Navigation to current skill
 * - Keyboard navigation support
 *
 * Part of Phase 14: Mastery Map UX
 */

interface EnhancedMasteryMapProps {
  data: MasteryMapData;
  config?: Partial<MasteryMapConfig>;
  onNodeClick?: (node: SkillNodeData) => void;
  onNavigate?: (skillId: string, lessonId: string) => void;
  className?: string;
  showLegend?: boolean;
  showControls?: boolean;
  variant?: 'full' | 'compact' | 'sidebar';
  darkMode?: boolean;
}

// Zoom constraints
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

export function EnhancedMasteryMap({
  data,
  config: customConfig,
  onNodeClick,
  onNavigate,
  className = '',
  showLegend = true,
  showControls = true,
  variant = 'full',
  darkMode = false,
}: EnhancedMasteryMapProps) {
  // Memoize config to avoid recreating on every render
  const config = useMemo(
    () => ({ ...DEFAULT_MAP_CONFIG, ...customConfig }),
    [customConfig]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  // Viewport state - initialized from layout calculation
  const [viewportInitialized, setViewportInitialized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Mobile state
  const [showMobileList, setShowMobileList] = useState(false);

  // Calculate layout dimensions
  const layout = useMemo<LayoutResult>(() => {
    if (data.nodes.length === 0) {
      return {
        positions: {},
        width: 400,
        height: 300,
        layerCount: 0,
        layerSizes: [],
        bounds: { minX: 0, maxX: 400, minY: 0, maxY: 300 },
      };
    }

    const maxX = Math.max(...data.nodes.map((n) => n.position.x)) + config.nodeWidth;
    const maxY = Math.max(...data.nodes.map((n) => n.position.y)) + config.nodeHeight;

    // Convert nodes to positions format
    const positions: Record<string, { x: number; y: number; layer: number; indexInLayer: number }> = {};
    data.nodes.forEach((node, i) => {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        layer: Math.floor(node.position.y / (config.nodeHeight + config.verticalGap)),
        indexInLayer: i,
      };
    });

    return {
      positions,
      width: Math.max(maxX + 80, 400),
      height: Math.max(maxY + 80, 300),
      layerCount: Math.max(...Object.values(positions).map((p) => p.layer)) + 1,
      layerSizes: [],
      bounds: { minX: 0, maxX: maxX + 80, minY: 0, maxY: maxY + 80 },
    };
  }, [data.nodes, config]);

  // Responsive layout check
  const useVerticalList = useMemo(() => {
    return shouldUseVerticalList(layout, containerSize.width) || showMobileList;
  }, [layout, containerSize.width, showMobileList]);

  // Observe container size with debounce for performance
  useEffect(() => {
    if (!containerRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const entry = entries[0];
        if (entry) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }, 100); // 100ms debounce
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate initial viewport values (computed, not in effect)
  const initialViewport = useMemo(() => {
    if (data.nodes.length === 0 || containerSize.width === 0) {
      return { zoom: 1, pan: { x: 0, y: 0 } };
    }
    const fitZoom = calculateFitZoom(layout, containerSize);
    const centerPan = calculateCenterPan(layout, containerSize, fitZoom);
    return { zoom: fitZoom, pan: centerPan };
  }, [data.nodes.length, containerSize, layout]);

  // Apply initial viewport on first render or when data changes significantly
  useEffect(() => {
    if (!viewportInitialized && data.nodes.length > 0 && containerSize.width > 0) {
      // Use requestAnimationFrame to batch the updates
      requestAnimationFrame(() => {
        setZoom(initialViewport.zoom);
        setPan(initialViewport.pan);
        setViewportInitialized(true);
      });
    }
  }, [viewportInitialized, data.nodes.length, containerSize.width, initialViewport]);

  // Handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleFitToScreen = useCallback(() => {
    const fitZoom = calculateFitZoom(layout, containerSize);
    const centerPan = calculateCenterPan(layout, containerSize, fitZoom);
    setZoom(fitZoom);
    setPan(centerPan);
  }, [layout, containerSize]);

  const handleCenterOnCurrent = useCallback(() => {
    if (!data.currentSkillId) return;

    const currentNode = data.nodes.find((n) => n.id === data.currentSkillId);
    if (!currentNode) return;

    // Calculate pan to center on current node
    const targetX = containerSize.width / 2 - currentNode.position.x * zoom;
    const targetY = containerSize.height / 2 - currentNode.position.y * zoom;

    setPan({ x: targetX, y: targetY });
    setSelectedNodeId(data.currentSkillId);
  }, [data.currentSkillId, data.nodes, containerSize, zoom]);

  const handleNodeClick = useCallback(
    (node: SkillNodeData) => {
      if (node.status === 'locked') return;

      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
      onNodeClick?.(node);
    },
    [selectedNodeId, onNodeClick]
  );

  const handlePan = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setPan((p) => ({
        x: p.x + info.delta.x,
        y: p.y + info.delta.y,
      }));
    },
    []
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleFitToScreen();
      if (e.key === 'c' && e.ctrlKey) handleCenterOnCurrent();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleFitToScreen, handleCenterOnCurrent]);

  // Styling based on dark mode
  const bgColor = darkMode ? '#0A004A' : '#ffffff';
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  if (data.nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center p-8 rounded-xl border ${className}`}
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          No skills to display
        </p>
      </div>
    );
  }

  // Variant sizing
  const minHeight = variant === 'sidebar' ? '300px' : variant === 'compact' ? '400px' : '500px';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border ${className}`}
      style={{ backgroundColor: bgColor, borderColor, minHeight }}
    >
      {/* Controls */}
      {showControls && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* Mobile list toggle */}
          <button
            onClick={() => setShowMobileList(!showMobileList)}
            className={`p-1.5 rounded-lg border transition-colors md:hidden ${
              darkMode
                ? 'bg-navy-light border-gray-600 hover:bg-purple'
                : 'bg-white border-gray-300 hover:bg-gray-100'
            }`}
            title="Toggle list view"
          >
            <List className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          {/* Zoom controls */}
          <div className={`hidden sm:flex items-center gap-1 rounded-lg border p-1 ${
            darkMode ? 'bg-navy-light border-gray-600' : 'bg-white border-gray-300'
          }`}>
            <button
              onClick={handleZoomOut}
              className={`p-1 rounded transition-colors ${
                darkMode ? 'hover:bg-purple' : 'hover:bg-gray-100'
              }`}
              title="Zoom out (-)"
            >
              <ZoomOut className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <span className={`text-xs w-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className={`p-1 rounded transition-colors ${
                darkMode ? 'hover:bg-purple' : 'hover:bg-gray-100'
              }`}
              title="Zoom in (+)"
            >
              <ZoomIn className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Fit to screen */}
          <button
            onClick={handleFitToScreen}
            className={`p-1.5 rounded-lg border transition-colors hidden sm:block ${
              darkMode
                ? 'bg-navy-light border-gray-600 hover:bg-purple'
                : 'bg-white border-gray-300 hover:bg-gray-100'
            }`}
            title="Fit to screen (0)"
          >
            <Maximize2 className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          {/* Center on current */}
          {data.currentSkillId && (
            <button
              onClick={handleCenterOnCurrent}
              className={`p-1.5 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-teal/20 border-teal/50 hover:bg-teal/30'
                  : 'bg-teal/10 border-teal/30 hover:bg-teal/20'
              }`}
              title="Go to current skill (Ctrl+C)"
            >
              <Target className="w-4 h-4 text-teal" />
            </button>
          )}
        </div>
      )}

      {/* Graph or List View */}
      <AnimatePresence mode="wait">
        {useVerticalList ? (
          <MobileListView
            key="list"
            data={data}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            darkMode={darkMode}
          />
        ) : (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
          >
            <motion.svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
              drag
              dragConstraints={{ left: -layout.width, right: layout.width, top: -layout.height, bottom: layout.height }}
              dragElastic={0.1}
              onDrag={handlePan}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            >
              {/* Definitions */}
              <defs>
                <marker
                  id="arrowhead-default"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill={darkMode ? COLORS_RAW.grey : COLORS_RAW.lightGrey}
                  />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={COLORS_RAW.teal} />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              <g className="edges">
                {data.edges.map((edge, i) => {
                  const fromNode = data.nodes.find((n) => n.id === edge.from);
                  const toNode = data.nodes.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const isActive = toNode.status !== 'locked';
                  const isHighlighted =
                    selectedNodeId === edge.from || selectedNodeId === edge.to;

                  // Calculate curved path
                  const midY = (fromNode.position.y + toNode.position.y) / 2;
                  const path = `M ${fromNode.position.x} ${fromNode.position.y + 30}
                               C ${fromNode.position.x} ${midY},
                                 ${toNode.position.x} ${midY},
                                 ${toNode.position.x} ${toNode.position.y - 30}`;

                  return (
                    <motion.path
                      key={`edge-${i}`}
                      d={path}
                      fill="none"
                      stroke={isActive ? COLORS_RAW.teal : (darkMode ? COLORS_RAW.grey : COLORS_RAW.lightGrey)}
                      strokeWidth={isHighlighted ? 3 : 2}
                      strokeDasharray={toNode.status === 'locked' ? '6 4' : 'none'}
                      markerEnd={
                        isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead-default)'
                      }
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.6 }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g className="nodes">
                {data.nodes.map((node, i) => (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: i * 0.03,
                      ...SPRING.gentle,
                    }}
                  >
                    <MasteryMapNode
                      node={node}
                      isSelected={node.id === selectedNodeId}
                      isCurrent={node.id === data.currentSkillId}
                      onClick={!isDragging ? handleNodeClick : undefined}
                      size={variant === 'sidebar' ? 'sm' : 'md'}
                    />
                  </motion.g>
                ))}
              </g>
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {showLegend && !useVerticalList && (
        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center gap-4 px-4 py-2 border-t flex-wrap ${
            darkMode
              ? 'bg-navy-light/80 border-gray-700'
              : 'bg-white/80 border-gray-200'
          }`}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <LegendItem color={COLORS_RAW.grey} label="Locked" darkMode={darkMode} />
          <LegendItem color={COLORS_RAW.teal} label="Available" darkMode={darkMode} />
          <LegendItem color={COLORS_RAW.yellow} label="Active" darkMode={darkMode} />
          <LegendItem color={COLORS_RAW.success} label="Mastered" darkMode={darkMode} />
          <LegendItem color={COLORS_RAW.warning} label="Review" darkMode={darkMode} />
        </div>
      )}

      {/* Selected node details panel */}
      <AnimatePresence>
        {selectedNodeId && (
          <SelectedNodePanel
            node={data.nodes.find((n) => n.id === selectedNodeId)!}
            onClose={() => setSelectedNodeId(null)}
            onNavigate={onNavigate}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function LegendItem({
  color,
  label,
  darkMode,
}: {
  color: string;
  label: string;
  darkMode: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
        {label}
      </span>
    </div>
  );
}

function MobileListView({
  data,
  selectedNodeId,
  onNodeClick,
  darkMode,
}: {
  data: MasteryMapData;
  selectedNodeId: string | null;
  onNodeClick: (node: SkillNodeData) => void;
  darkMode: boolean;
}) {
  // Group nodes by layer/module
  const groupedNodes = useMemo(() => {
    const groups: Record<string, SkillNodeData[]> = {};
    data.nodes.forEach((node) => {
      const key = node.moduleId || '1';
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    });
    return groups;
  }, [data.nodes]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full overflow-y-auto p-4 space-y-4"
    >
      {Object.entries(groupedNodes).map(([moduleId, nodes]) => (
        <div key={moduleId}>
          <h3
            className={`text-sm font-semibold mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Module {moduleId}
          </h3>
          <div className="space-y-2">
            {nodes.map((node) => (
              <MobileNodeCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isCurrent={node.id === data.currentSkillId}
                onClick={onNodeClick}
              />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function MobileNodeCard({
  node,
  isSelected,
  isCurrent,
  onClick,
}: {
  node: SkillNodeData;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: (node: SkillNodeData) => void;
}) {
  const statusColors = {
    locked: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500' },
    available: { bg: 'bg-teal/10', border: 'border-teal', text: 'text-teal' },
    active: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-600' },
    mastered: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600' },
    decaying: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-600' },
  };

  const colors = statusColors[node.status];

  return (
    <button
      onClick={() => node.status !== 'locked' && onClick(node)}
      disabled={node.status === 'locked'}
      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
        colors.bg
      } ${colors.border} ${
        isSelected ? 'ring-2 ring-navy ring-offset-2' : ''
      } ${isCurrent ? 'shadow-md' : ''} ${
        node.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-medium ${colors.text}`}>{node.name}</span>
        <span className={`text-sm ${colors.text}`}>
          {Math.round(node.pMastery * 100)}%
        </span>
      </div>
      {isCurrent && (
        <span className="text-xs text-amber-600 mt-1 block">Currently Learning</span>
      )}
    </button>
  );
}

function SelectedNodePanel({
  node,
  onClose,
  onNavigate,
  darkMode,
}: {
  node: SkillNodeData;
  onClose: () => void;
  onNavigate?: (skillId: string, lessonId: string) => void;
  darkMode: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`absolute top-12 right-3 w-64 rounded-lg border shadow-lg ${
        darkMode ? 'bg-navy-light border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3
            className={`font-semibold ${
              darkMode ? 'text-white' : 'text-navy'
            }`}
          >
            {node.name}
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 ${
              darkMode ? 'hover:bg-gray-700' : ''
            }`}
          >
            <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Mastery
            </span>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>
              {Math.round(node.pMastery * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Status
            </span>
            <span className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-navy'}`}>
              {node.status}
            </span>
          </div>
          {node.retrievability !== undefined && (
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                Retention
              </span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>
                {Math.round(node.retrievability * 100)}%
              </span>
            </div>
          )}
        </div>

        {node.status !== 'locked' && onNavigate && (
          <button
            onClick={() => onNavigate(node.id, node.lessonId)}
            className="w-full mt-4 py-2 px-4 bg-teal text-white rounded-lg font-medium hover:bg-teal-dark transition-colors"
          >
            {node.status === 'mastered' || node.status === 'decaying'
              ? 'Review'
              : 'Start Learning'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default EnhancedMasteryMap;
