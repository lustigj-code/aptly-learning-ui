/**
 * Mastery Map Types
 *
 * Types for visual skill prerequisite graph
 *
 * Part of Phase 14: Mastery Map UX
 */

export type SkillNodeStatus =
  | 'locked'     // Prerequisites not met
  | 'available'  // Ready to learn
  | 'active'     // Currently learning
  | 'mastered'   // P(mastery) >= 0.95
  | 'decaying';  // Retrievability < 90%

export type SkillNodeData = {
  id: string;
  name: string;
  lessonId: string;
  moduleId: string;
  status: SkillNodeStatus;
  pMastery: number;       // 0-1
  retrievability?: number; // 0-1, from FSRS
  prerequisites: string[];
  position: {
    x: number;
    y: number;
  };
};

export type SkillEdge = {
  from: string; // prerequisite skill ID
  to: string;   // dependent skill ID
};

export type MasteryMapData = {
  nodes: SkillNodeData[];
  edges: SkillEdge[];
  currentSkillId?: string;
};

export type MasteryMapConfig = {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  showLabels: boolean;
  interactive: boolean;
};

export const DEFAULT_MAP_CONFIG: MasteryMapConfig = {
  nodeWidth: 140,
  nodeHeight: 60,
  horizontalGap: 60,
  verticalGap: 80,
  showLabels: true,
  interactive: true,
};
