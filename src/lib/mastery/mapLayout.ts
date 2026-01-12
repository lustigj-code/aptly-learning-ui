/**
 * Map Layout Algorithm for Mastery Map
 *
 * Provides hierarchical layout with:
 * - Topological sorting by prerequisite depth
 * - Edge crossing minimization using barycentric method
 * - Responsive sizing based on viewport
 * - Support for zoom and pan calculations
 *
 * Part of Phase 14: Mastery Map UX
 */

import type { SkillMap } from './bkt';

// ============================================
// TYPES
// ============================================

export interface LayoutConfig {
  /** Width of each node */
  nodeWidth: number;
  /** Height of each node */
  nodeHeight: number;
  /** Horizontal gap between nodes in same layer */
  horizontalGap: number;
  /** Vertical gap between layers */
  verticalGap: number;
  /** Padding around the entire graph */
  padding: number;
  /** Whether to use circular nodes (affects collision detection) */
  circular: boolean;
  /** Node radius for circular nodes */
  nodeRadius: number;
}

export interface NodePosition {
  x: number;
  y: number;
  layer: number;
  indexInLayer: number;
}

export interface LayoutResult {
  /** Position for each node by ID */
  positions: Record<string, NodePosition>;
  /** Total width of the layout */
  width: number;
  /** Total height of the layout */
  height: number;
  /** Number of layers */
  layerCount: number;
  /** Nodes per layer */
  layerSizes: number[];
  /** Bounding box for the graph */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface ViewportConfig {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 140,
  nodeHeight: 60,
  horizontalGap: 60,
  verticalGap: 100,
  padding: 40,
  circular: true,
  nodeRadius: 32,
};

export const CIRCULAR_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 80,
  nodeHeight: 80,
  horizontalGap: 40,
  verticalGap: 120,
  padding: 60,
  circular: true,
  nodeRadius: 32,
};

// ============================================
// LAYOUT ALGORITHM
// ============================================

/**
 * Calculate hierarchical layout for skill map
 *
 * Algorithm:
 * 1. Calculate depth (layer) for each node using topological sort
 * 2. Group nodes by layer
 * 3. Apply barycentric method to minimize edge crossings
 * 4. Position nodes with centered alignment per layer
 */
export function calculateHierarchicalLayout(
  skillMap: SkillMap,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): LayoutResult {
  const skills = Object.values(skillMap.skills);

  if (skills.length === 0) {
    return {
      positions: {},
      width: 400,
      height: 300,
      layerCount: 0,
      layerSizes: [],
      bounds: { minX: 0, maxX: 400, minY: 0, maxY: 300 },
    };
  }

  // Step 1: Calculate layers using longest path algorithm
  const layers = calculateLayers(skillMap);

  // Step 2: Apply barycentric ordering to minimize crossings
  const orderedLayers = minimizeEdgeCrossings(layers, skillMap);

  // Step 3: Calculate positions
  const positions = calculatePositions(orderedLayers, skillMap, config);

  // Calculate bounds
  const allPositions = Object.values(positions);
  const nodeSize = config.circular ? config.nodeRadius * 2 : config.nodeWidth;

  const minX = Math.min(...allPositions.map((p) => p.x)) - nodeSize / 2;
  const maxX = Math.max(...allPositions.map((p) => p.x)) + nodeSize / 2;
  const minY = Math.min(...allPositions.map((p) => p.y)) - nodeSize / 2;
  const maxY = Math.max(...allPositions.map((p) => p.y)) + nodeSize / 2;

  const width = maxX - minX + config.padding * 2;
  const height = maxY - minY + config.padding * 2;

  // Adjust positions to include padding
  for (const id of Object.keys(positions)) {
    positions[id].x += config.padding - minX;
    positions[id].y += config.padding - minY;
  }

  return {
    positions,
    width: Math.max(width, 400),
    height: Math.max(height, 300),
    layerCount: orderedLayers.length,
    layerSizes: orderedLayers.map((layer) => layer.length),
    bounds: {
      minX: config.padding,
      maxX: width - config.padding,
      minY: config.padding,
      maxY: height - config.padding,
    },
  };
}

/**
 * Calculate layer assignments using longest path algorithm
 */
function calculateLayers(skillMap: SkillMap): string[][] {
  const depths: Record<string, number> = {};

  // Recursive depth calculation with memoization
  function calculateDepth(skillId: string, ancestors: Set<string> = new Set()): number {
    if (depths[skillId] !== undefined) return depths[skillId];
    if (ancestors.has(skillId)) return 0; // Cycle detected

    const skill = skillMap.skills[skillId];
    if (!skill) return 0;

    ancestors.add(skillId);

    if (skill.prerequisites.length === 0) {
      depths[skillId] = 0;
      return 0;
    }

    const validPrereqs = skill.prerequisites.filter((p) => skillMap.skills[p]);
    if (validPrereqs.length === 0) {
      depths[skillId] = 0;
      return 0;
    }

    const maxPrereqDepth = Math.max(
      ...validPrereqs.map((prereqId) => calculateDepth(prereqId, new Set(ancestors)))
    );

    depths[skillId] = maxPrereqDepth + 1;
    return depths[skillId];
  }

  // Calculate depths for all skills
  for (const skill of Object.values(skillMap.skills)) {
    calculateDepth(skill.id);
  }

  // Group by layer
  const layerMap: Record<number, string[]> = {};
  for (const [skillId, depth] of Object.entries(depths)) {
    if (!layerMap[depth]) layerMap[depth] = [];
    layerMap[depth].push(skillId);
  }

  // Convert to array of layers
  const maxDepth = Math.max(...Object.keys(layerMap).map(Number), 0);
  const layers: string[][] = [];
  for (let i = 0; i <= maxDepth; i++) {
    layers.push(layerMap[i] || []);
  }

  return layers;
}

/**
 * Minimize edge crossings using barycentric method
 *
 * The barycentric method orders nodes in a layer based on
 * the average position of their connected nodes in adjacent layers.
 */
function minimizeEdgeCrossings(
  layers: string[][],
  skillMap: SkillMap,
  iterations: number = 4
): string[][] {
  const result = layers.map((layer) => [...layer]);

  for (let iter = 0; iter < iterations; iter++) {
    // Sweep down: order based on predecessors
    for (let i = 1; i < result.length; i++) {
      result[i] = orderByBarycenter(result[i], result[i - 1], skillMap, 'predecessors');
    }

    // Sweep up: order based on successors
    for (let i = result.length - 2; i >= 0; i--) {
      result[i] = orderByBarycenter(result[i], result[i + 1], skillMap, 'successors');
    }
  }

  return result;
}

/**
 * Order nodes in a layer by barycenter of connected nodes
 */
function orderByBarycenter(
  layer: string[],
  adjacentLayer: string[],
  skillMap: SkillMap,
  direction: 'predecessors' | 'successors'
): string[] {
  const positionMap: Record<string, number> = {};
  adjacentLayer.forEach((id, index) => {
    positionMap[id] = index;
  });

  const barycenters: { id: string; barycenter: number }[] = layer.map((skillId) => {
    const skill = skillMap.skills[skillId];
    let connectedNodes: string[] = [];

    if (direction === 'predecessors') {
      // Get predecessors (prerequisites)
      connectedNodes = skill?.prerequisites.filter((p) => positionMap[p] !== undefined) || [];
    } else {
      // Get successors (skills that depend on this one)
      connectedNodes = Object.values(skillMap.skills)
        .filter((s) => s.prerequisites.includes(skillId) && positionMap[s.id] !== undefined)
        .map((s) => s.id);
    }

    if (connectedNodes.length === 0) {
      // No connections, keep original position
      return { id: skillId, barycenter: layer.indexOf(skillId) };
    }

    const sum = connectedNodes.reduce((acc, id) => acc + (positionMap[id] ?? 0), 0);
    return { id: skillId, barycenter: sum / connectedNodes.length };
  });

  // Sort by barycenter
  barycenters.sort((a, b) => a.barycenter - b.barycenter);

  return barycenters.map((b) => b.id);
}

/**
 * Calculate final positions for all nodes
 */
function calculatePositions(
  layers: string[][],
  skillMap: SkillMap,
  config: LayoutConfig
): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const nodeSpacing = config.circular
    ? config.nodeRadius * 2 + config.horizontalGap
    : config.nodeWidth + config.horizontalGap;
  const layerSpacing = config.verticalGap + (config.circular ? config.nodeRadius * 2 : config.nodeHeight);

  // Find the widest layer for centering
  const maxLayerWidth = Math.max(...layers.map((layer) => layer.length * nodeSpacing));

  layers.forEach((layer, layerIndex) => {
    const layerWidth = layer.length * nodeSpacing;
    const xOffset = (maxLayerWidth - layerWidth) / 2 + nodeSpacing / 2;

    layer.forEach((skillId, nodeIndex) => {
      positions[skillId] = {
        x: xOffset + nodeIndex * nodeSpacing,
        y: layerIndex * layerSpacing + layerSpacing / 2,
        layer: layerIndex,
        indexInLayer: nodeIndex,
      };
    });
  });

  return positions;
}

// ============================================
// VIEWPORT UTILITIES
// ============================================

/**
 * Calculate optimal zoom to fit graph in viewport
 */
export function calculateFitZoom(
  layout: LayoutResult,
  viewport: { width: number; height: number },
  padding: number = 40
): number {
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;

  const scaleX = availableWidth / layout.width;
  const scaleY = availableHeight / layout.height;

  // Use the smaller scale to ensure everything fits
  const scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x zoom

  return Math.max(scale, 0.3); // Minimum 0.3x zoom
}

/**
 * Calculate pan offset to center graph in viewport
 */
export function calculateCenterPan(
  layout: LayoutResult,
  viewport: { width: number; height: number },
  zoom: number
): { x: number; y: number } {
  const scaledWidth = layout.width * zoom;
  const scaledHeight = layout.height * zoom;

  return {
    x: (viewport.width - scaledWidth) / 2,
    y: (viewport.height - scaledHeight) / 2,
  };
}

/**
 * Transform screen coordinates to graph coordinates
 */
export function screenToGraph(
  screenX: number,
  screenY: number,
  viewport: ViewportConfig
): { x: number; y: number } {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

/**
 * Transform graph coordinates to screen coordinates
 */
export function graphToScreen(
  graphX: number,
  graphY: number,
  viewport: ViewportConfig
): { x: number; y: number } {
  return {
    x: graphX * viewport.zoom + viewport.panX,
    y: graphY * viewport.zoom + viewport.panY,
  };
}

/**
 * Find node at screen position
 */
export function findNodeAtPosition(
  screenX: number,
  screenY: number,
  positions: Record<string, NodePosition>,
  viewport: ViewportConfig,
  nodeRadius: number
): string | null {
  const graphPos = screenToGraph(screenX, screenY, viewport);

  for (const [nodeId, pos] of Object.entries(positions)) {
    const dx = graphPos.x - pos.x;
    const dy = graphPos.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= nodeRadius) {
      return nodeId;
    }
  }

  return null;
}

// ============================================
// EDGE PATH CALCULATION
// ============================================

/**
 * Calculate curved edge path between two nodes
 */
export function calculateEdgePath(
  fromPos: NodePosition,
  toPos: NodePosition,
  config: LayoutConfig
): string {
  const nodeOffset = config.circular ? config.nodeRadius : config.nodeHeight / 2;

  // Start from bottom of source node
  const startX = fromPos.x;
  const startY = fromPos.y + nodeOffset;

  // End at top of target node
  const endX = toPos.x;
  const endY = toPos.y - nodeOffset;

  // Calculate control points for smooth curve
  const midY = (startY + endY) / 2;

  // Use bezier curve for smooth edges
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

/**
 * Calculate straight edge path (for debugging or simple layouts)
 */
export function calculateStraightEdgePath(
  fromPos: NodePosition,
  toPos: NodePosition,
  config: LayoutConfig
): string {
  const nodeOffset = config.circular ? config.nodeRadius : config.nodeHeight / 2;

  return `M ${fromPos.x} ${fromPos.y + nodeOffset} L ${toPos.x} ${toPos.y - nodeOffset}`;
}

// ============================================
// RESPONSIVE LAYOUT
// ============================================

/**
 * Get responsive layout config based on viewport width
 */
export function getResponsiveConfig(viewportWidth: number): LayoutConfig {
  if (viewportWidth < 640) {
    // Mobile
    return {
      ...CIRCULAR_LAYOUT_CONFIG,
      nodeRadius: 24,
      horizontalGap: 24,
      verticalGap: 80,
      padding: 20,
    };
  } else if (viewportWidth < 1024) {
    // Tablet
    return {
      ...CIRCULAR_LAYOUT_CONFIG,
      nodeRadius: 28,
      horizontalGap: 32,
      verticalGap: 100,
      padding: 32,
    };
  } else {
    // Desktop
    return CIRCULAR_LAYOUT_CONFIG;
  }
}

/**
 * Check if layout should use vertical list on mobile
 */
export function shouldUseVerticalList(
  layout: LayoutResult,
  viewportWidth: number
): boolean {
  // Use vertical list if graph is too wide for mobile
  return viewportWidth < 640 && layout.width > viewportWidth * 1.5;
}
