/**
 * Layout Algorithm for Mastery Map
 *
 * Uses topological sort to arrange nodes by prerequisite depth.
 * Nodes with no prerequisites appear at the top, dependents below.
 *
 * Part of Phase 14: Mastery Map UX
 */

import type { SkillMap, SkillState } from '@/lib/mastery/bkt';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';
import type {
  SkillNodeData,
  SkillEdge,
  MasteryMapData,
  SkillNodeStatus,
  MasteryMapConfig,
} from './types';
import { DEFAULT_MAP_CONFIG } from './types';

// ============================================
// STATUS CALCULATION
// ============================================

/**
 * Calculate node status based on mastery data
 */
export function calculateNodeStatus(
  skillId: string,
  skillMap: SkillMap,
  skillStates: Record<string, SkillState>,
  fsrsStates: ConceptMastery[],
  currentSkillId?: string
): SkillNodeStatus {
  const state = skillStates[skillId];
  const pMastery = state?.pMastery ?? 0;

  // Check if current
  if (skillId === currentSkillId) return 'active';

  // Check if mastered
  if (pMastery >= 0.95) {
    // Check for decay using FSRS
    const fsrs = fsrsStates.find(f => f.conceptId === skillId);
    if (fsrs) {
      const retrievability = calculateRetrievabilityFromFSRS(fsrs);
      if (retrievability < 0.90) return 'decaying';
    }
    return 'mastered';
  }

  // Check if prerequisites met
  const skill = skillMap.skills[skillId];
  if (!skill) return 'locked';

  // Skills with no prerequisites are always available
  if (skill.prerequisites.length === 0) {
    return pMastery > 0 ? 'available' : 'available';
  }

  const prereqsMet = skill.prerequisites.every(prereqId => {
    const prereqState = skillStates[prereqId];
    return prereqState && prereqState.pMastery >= 0.95;
  });

  if (!prereqsMet) return 'locked';

  return 'available';
}

/**
 * Calculate retrievability from FSRS state
 */
function calculateRetrievabilityFromFSRS(fsrs: ConceptMastery): number {
  const now = new Date();
  const elapsed = (now.getTime() - fsrs.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
  const stability = fsrs.fsrsState.stability;
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsed / (9 * stability), -1);
}

// ============================================
// LAYOUT CALCULATION
// ============================================

/**
 * Calculate node positions using topological layers
 *
 * Nodes are arranged in horizontal layers by their prerequisite depth:
 * - Layer 0: Nodes with no prerequisites
 * - Layer 1: Nodes whose prerequisites are all in Layer 0
 * - etc.
 */
export function calculateLayout(
  skillMap: SkillMap,
  config: MasteryMapConfig = DEFAULT_MAP_CONFIG
): { positions: Record<string, { x: number; y: number }>; width: number; height: number } {
  const skills = Object.values(skillMap.skills);
  const positions: Record<string, { x: number; y: number }> = {};

  if (skills.length === 0) {
    return { positions, width: 400, height: 300 };
  }

  // Calculate depth (layer) for each node using memoization
  const depths: Record<string, number> = {};

  const calculateDepth = (skillId: string, visited: Set<string>): number => {
    if (depths[skillId] !== undefined) return depths[skillId];
    if (visited.has(skillId)) return 0; // Prevent cycles

    visited.add(skillId);
    const skill = skillMap.skills[skillId];

    if (!skill || skill.prerequisites.length === 0) {
      depths[skillId] = 0;
      return 0;
    }

    const maxPrereqDepth = Math.max(
      0,
      ...skill.prerequisites
        .filter(p => skillMap.skills[p]) // Only count valid prerequisites
        .map(p => calculateDepth(p, new Set(visited)))
    );

    depths[skillId] = maxPrereqDepth + 1;
    return depths[skillId];
  };

  // Calculate depths for all skills
  skills.forEach(skill => calculateDepth(skill.id, new Set()));

  // Group by depth
  const layers: Record<number, string[]> = {};
  Object.entries(depths).forEach(([skillId, depth]) => {
    if (!layers[depth]) layers[depth] = [];
    layers[depth].push(skillId);
  });

  // Position nodes
  const maxDepth = Math.max(...Object.keys(layers).map(Number), 0);
  let maxWidth = 0;

  Object.entries(layers).forEach(([depth, skillIds]) => {
    const layerWidth = skillIds.length * (config.nodeWidth + config.horizontalGap);
    maxWidth = Math.max(maxWidth, layerWidth);

    // Sort skills within layer alphabetically for consistency
    const sortedSkillIds = [...skillIds].sort((a, b) => {
      const skillA = skillMap.skills[a];
      const skillB = skillMap.skills[b];
      return (skillA?.name || a).localeCompare(skillB?.name || b);
    });

    sortedSkillIds.forEach((skillId, index) => {
      positions[skillId] = {
        x: (index + 0.5) * (config.nodeWidth + config.horizontalGap),
        y: Number(depth) * (config.nodeHeight + config.verticalGap) + config.nodeHeight / 2 + 20,
      };
    });
  });

  // Center each layer
  Object.entries(layers).forEach(([, skillIds]) => {
    const layerWidth = skillIds.length * (config.nodeWidth + config.horizontalGap);
    const offset = (maxWidth - layerWidth) / 2;
    skillIds.forEach(skillId => {
      if (positions[skillId]) {
        positions[skillId].x += offset;
      }
    });
  });

  return {
    positions,
    width: Math.max(maxWidth + config.nodeWidth, 400),
    height: Math.max((maxDepth + 1) * (config.nodeHeight + config.verticalGap) + config.nodeHeight + 40, 300),
  };
}

// ============================================
// MAP DATA GENERATION
// ============================================

/**
 * Generate complete map data from skill map and user state
 */
export function generateMasteryMapData(
  skillMap: SkillMap,
  skillStates: Record<string, SkillState>,
  fsrsStates: ConceptMastery[],
  currentSkillId?: string,
  config: MasteryMapConfig = DEFAULT_MAP_CONFIG
): MasteryMapData {
  const { positions } = calculateLayout(skillMap, config);

  const nodes: SkillNodeData[] = Object.values(skillMap.skills).map(skill => {
    const status = calculateNodeStatus(
      skill.id,
      skillMap,
      skillStates,
      fsrsStates,
      currentSkillId
    );
    const state = skillStates[skill.id];
    const fsrs = fsrsStates.find(f => f.conceptId === skill.id);

    return {
      id: skill.id,
      name: skill.name,
      lessonId: skill.lessonId,
      moduleId: skill.lessonId.split('.')[0] || '1',
      status,
      pMastery: state?.pMastery ?? 0,
      retrievability: fsrs ? calculateRetrievabilityFromFSRS(fsrs) : undefined,
      prerequisites: skill.prerequisites,
      position: positions[skill.id] || { x: 100, y: 100 },
    };
  });

  // Generate edges from prerequisites
  const edges: SkillEdge[] = [];
  Object.values(skillMap.skills).forEach(skill => {
    skill.prerequisites.forEach(prereqId => {
      // Only add edge if both nodes exist
      if (skillMap.skills[prereqId]) {
        edges.push({ from: prereqId, to: skill.id });
      }
    });
  });

  return { nodes, edges, currentSkillId };
}

// ============================================
// EXPORTS
// ============================================

export { calculateRetrievabilityFromFSRS as calculateRetrievability };
