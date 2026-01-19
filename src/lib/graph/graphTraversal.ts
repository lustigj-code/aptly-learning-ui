/**
 * Graph Traversal Algorithms
 *
 * Provides path-finding and traversal operations for the knowledge graph.
 * Used for learning path generation, prerequisite checking, and visualization.
 */

import {
  Concept,
  ConceptId,
  ConceptMastery,
  GraphNode,
  NodeStatus,
  TraversalResult,
} from './types';
import {
  getAllConcepts,
  getConcept,
  getUserMastery,
} from './KnowledgeGraphService';

// ============================================
// PREREQUISITE OPERATIONS
// ============================================

/**
 * Get all direct prerequisites for a concept
 */
export async function getDirectPrerequisites(
  courseId: string,
  conceptId: ConceptId
): Promise<ConceptId[]> {
  const concept = await getConcept(courseId, conceptId);
  return concept?.prerequisites || [];
}

/**
 * Get all prerequisites for a concept, including transitive dependencies
 * Uses depth-first traversal with cycle detection
 */
export async function getAllPrerequisites(
  courseId: string,
  conceptId: ConceptId,
  visited: Set<ConceptId> = new Set()
): Promise<ConceptId[]> {
  if (visited.has(conceptId)) {
    // Cycle detected, return empty to prevent infinite loop
    return [];
  }
  visited.add(conceptId);

  const concept = await getConcept(courseId, conceptId);
  if (!concept) return [];

  const directPrereqs = concept.prerequisites;
  const allPrereqs = [...directPrereqs];

  // Recursively get transitive prerequisites
  for (const prereqId of directPrereqs) {
    const transitivePrereqs = await getAllPrerequisites(
      courseId,
      prereqId,
      new Set(visited) // Clone to allow separate branches
    );
    allPrereqs.push(...transitivePrereqs);
  }

  // Deduplicate while preserving order
  return Array.from(new Set(allPrereqs));
}

/**
 * Get all concepts that depend on a given concept (reverse prerequisites)
 */
export async function getDependents(
  courseId: string,
  conceptId: ConceptId
): Promise<ConceptId[]> {
  const allConcepts = await getAllConcepts(courseId);

  return allConcepts
    .filter((concept) => concept.prerequisites.includes(conceptId))
    .map((concept) => concept.id);
}

/**
 * Get all transitive dependents (concepts that eventually depend on this one)
 */
export async function getAllDependents(
  courseId: string,
  conceptId: ConceptId,
  visited: Set<ConceptId> = new Set()
): Promise<ConceptId[]> {
  if (visited.has(conceptId)) return [];
  visited.add(conceptId);

  const directDependents = await getDependents(courseId, conceptId);
  const allDependents = [...directDependents];

  for (const depId of directDependents) {
    const transitiveDeps = await getAllDependents(courseId, depId, new Set(visited));
    allDependents.push(...transitiveDeps);
  }

  return Array.from(new Set(allDependents));
}

// ============================================
// UNLOCK STATUS
// ============================================

/**
 * Check if a concept is unlocked based on user mastery
 * A concept is unlocked if all prerequisites meet their mastery threshold
 */
export async function isConceptUnlocked(
  courseId: string,
  conceptId: ConceptId,
  masteryLevels: Record<ConceptId, number>
): Promise<boolean> {
  const concept = await getConcept(courseId, conceptId);
  if (!concept) return false;

  // No prerequisites = always unlocked
  if (concept.prerequisites.length === 0) return true;

  // Check each prerequisite
  for (const prereqId of concept.prerequisites) {
    const prereq = await getConcept(courseId, prereqId);
    if (!prereq) continue;

    const mastery = masteryLevels[prereqId] || 0;
    if (mastery < prereq.masteryThreshold) {
      return false;
    }
  }

  return true;
}

/**
 * Get detailed unlock status with progress info
 */
export async function getUnlockStatus(
  courseId: string,
  conceptId: ConceptId,
  masteryLevels: Record<ConceptId, number>
): Promise<{
  isUnlocked: boolean;
  prerequisitesMet: number;
  prerequisitesTotal: number;
  blockingPrereqs: ConceptId[];
}> {
  const concept = await getConcept(courseId, conceptId);
  if (!concept) {
    return {
      isUnlocked: false,
      prerequisitesMet: 0,
      prerequisitesTotal: 0,
      blockingPrereqs: [],
    };
  }

  const prerequisitesTotal = concept.prerequisites.length;
  if (prerequisitesTotal === 0) {
    return {
      isUnlocked: true,
      prerequisitesMet: 0,
      prerequisitesTotal: 0,
      blockingPrereqs: [],
    };
  }

  let prerequisitesMet = 0;
  const blockingPrereqs: ConceptId[] = [];

  for (const prereqId of concept.prerequisites) {
    const prereq = await getConcept(courseId, prereqId);
    if (!prereq) continue;

    const mastery = masteryLevels[prereqId] || 0;
    if (mastery >= prereq.masteryThreshold) {
      prerequisitesMet++;
    } else {
      blockingPrereqs.push(prereqId);
    }
  }

  return {
    isUnlocked: prerequisitesMet === prerequisitesTotal,
    prerequisitesMet,
    prerequisitesTotal,
    blockingPrereqs,
  };
}

// ============================================
// CONCEPT DISCOVERY
// ============================================

/**
 * Get concepts ready to be learned (unlocked but not mastered)
 */
export async function getReadyConcepts(
  courseId: string,
  masteryLevels: Record<ConceptId, number>
): Promise<Concept[]> {
  const allConcepts = await getAllConcepts(courseId);
  const ready: Concept[] = [];

  for (const concept of allConcepts) {
    const mastery = masteryLevels[concept.id] || 0;

    // Skip already mastered concepts
    if (mastery >= concept.masteryThreshold) continue;

    // Check if unlocked
    const unlocked = await isConceptUnlocked(courseId, concept.id, masteryLevels);
    if (unlocked) {
      ready.push(concept);
    }
  }

  // Sort by difficulty (easier first)
  return ready.sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * Get concepts that need review (mastery decaying or overdue)
 */
export async function getDecayingConcepts(
  courseId: string,
  userId: string
): Promise<{ concept: Concept; mastery: ConceptMastery; daysOverdue: number }[]> {
  const allConcepts = await getAllConcepts(courseId);
  const masteryRecords = await getUserMastery(userId);
  const masteryMap = new Map(masteryRecords.map((m) => [m.conceptId, m]));
  const now = new Date();

  const decaying: { concept: Concept; mastery: ConceptMastery; daysOverdue: number }[] = [];

  for (const concept of allConcepts) {
    const mastery = masteryMap.get(concept.id);
    if (!mastery) continue;

    // Check if review is due
    if (mastery.nextReviewAt <= now) {
      const daysOverdue = Math.floor(
        (now.getTime() - mastery.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      decaying.push({ concept, mastery, daysOverdue });
    }
  }

  // Sort by how overdue (most overdue first)
  return decaying.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Get the next concept to review
 */
export async function getNextReviewConcept(
  courseId: string,
  userId: string
): Promise<Concept | null> {
  const decaying = await getDecayingConcepts(courseId, userId);
  return decaying[0]?.concept || null;
}

// ============================================
// LEARNING PATHS
// ============================================

/**
 * Generate a learning path from current state to a target concept
 * Returns concepts in optimal learning order
 */
export async function getLearningPath(
  courseId: string,
  targetConceptId: ConceptId,
  masteryLevels: Record<ConceptId, number>
): Promise<Concept[]> {
  const allPrereqs = await getAllPrerequisites(courseId, targetConceptId);
  const conceptMap = new Map<ConceptId, Concept>();

  // Fetch all concepts we need
  for (const prereqId of allPrereqs) {
    const concept = await getConcept(courseId, prereqId);
    if (concept) conceptMap.set(prereqId, concept);
  }

  const target = await getConcept(courseId, targetConceptId);
  if (target) conceptMap.set(targetConceptId, target);

  // Filter to only unmastered concepts
  const unmasteredIds = [...allPrereqs, targetConceptId].filter((id) => {
    const concept = conceptMap.get(id);
    if (!concept) return false;
    const mastery = masteryLevels[id] || 0;
    return mastery < concept.masteryThreshold;
  });

  // Topological sort for optimal order
  const sorted = await topologicalSort(courseId, unmasteredIds);

  return sorted
    .map((id) => conceptMap.get(id))
    .filter((c): c is Concept => c !== undefined);
}

/**
 * Get the shortest learning path between two concepts
 * Uses BFS to find the minimum number of concepts to learn
 */
export async function getShortestPath(
  courseId: string,
  fromConceptId: ConceptId,
  toConceptId: ConceptId
): Promise<TraversalResult> {
  const allConcepts = await getAllConcepts(courseId);
  const conceptMap = new Map(allConcepts.map((c) => [c.id, c]));

  // BFS
  const queue: { conceptId: ConceptId; path: ConceptId[] }[] = [
    { conceptId: fromConceptId, path: [fromConceptId] },
  ];
  const visited = new Set<ConceptId>([fromConceptId]);

  while (queue.length > 0) {
    const { conceptId, path } = queue.shift()!;

    if (conceptId === toConceptId) {
      return {
        path,
        totalDistance: path.length - 1,
        visitedNodes: visited,
      };
    }

    const concept = conceptMap.get(conceptId);
    if (!concept) continue;

    // Add all related concepts (dependents)
    const dependents = allConcepts.filter((c) =>
      c.prerequisites.includes(conceptId)
    );

    for (const dep of dependents) {
      if (!visited.has(dep.id)) {
        visited.add(dep.id);
        queue.push({
          conceptId: dep.id,
          path: [...path, dep.id],
        });
      }
    }
  }

  // No path found
  return {
    path: [],
    totalDistance: -1,
    visitedNodes: visited,
  };
}

// ============================================
// GRAPH ANALYSIS
// ============================================

/**
 * Topological sort of concepts (prerequisites come before dependents)
 */
export async function topologicalSort(
  courseId: string,
  conceptIds?: ConceptId[]
): Promise<ConceptId[]> {
  const allConcepts = await getAllConcepts(courseId);
  const conceptMap = new Map(allConcepts.map((c) => [c.id, c]));

  // Filter to specified concepts if provided
  const targetIds = conceptIds
    ? new Set(conceptIds)
    : new Set(allConcepts.map((c) => c.id));

  const sorted: ConceptId[] = [];
  const visited = new Set<ConceptId>();
  const visiting = new Set<ConceptId>(); // For cycle detection

  const visit = (id: ConceptId) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      console.warn(`Cycle detected in knowledge graph at concept: ${id}`);
      return;
    }

    visiting.add(id);

    const concept = conceptMap.get(id);
    if (concept) {
      // Visit prerequisites first
      for (const prereqId of concept.prerequisites) {
        if (targetIds.has(prereqId)) {
          visit(prereqId);
        }
      }
    }

    visiting.delete(id);
    visited.add(id);

    if (targetIds.has(id)) {
      sorted.push(id);
    }
  };

  Array.from(targetIds).forEach((id) => visit(id));

  return sorted;
}

/**
 * Find concepts with no prerequisites (entry points)
 */
export async function getEntryPoints(courseId: string): Promise<Concept[]> {
  const allConcepts = await getAllConcepts(courseId);
  return allConcepts.filter((c) => c.prerequisites.length === 0);
}

/**
 * Find concepts with no dependents (leaf nodes)
 */
export async function getLeafConcepts(courseId: string): Promise<Concept[]> {
  const allConcepts = await getAllConcepts(courseId);
  const hasDependent = new Set<ConceptId>();

  for (const concept of allConcepts) {
    for (const prereqId of concept.prerequisites) {
      hasDependent.add(prereqId);
    }
  }

  return allConcepts.filter((c) => !hasDependent.has(c.id));
}

/**
 * Calculate the depth of a concept (longest path from any entry point)
 */
export async function getConceptDepth(
  courseId: string,
  conceptId: ConceptId,
  memo: Map<ConceptId, number> = new Map()
): Promise<number> {
  if (memo.has(conceptId)) {
    return memo.get(conceptId)!;
  }

  const concept = await getConcept(courseId, conceptId);
  if (!concept || concept.prerequisites.length === 0) {
    memo.set(conceptId, 0);
    return 0;
  }

  let maxDepth = 0;
  for (const prereqId of concept.prerequisites) {
    const prereqDepth = await getConceptDepth(courseId, prereqId, memo);
    maxDepth = Math.max(maxDepth, prereqDepth + 1);
  }

  memo.set(conceptId, maxDepth);
  return maxDepth;
}

// ============================================
// VISUALIZATION HELPERS
// ============================================

/**
 * Build graph nodes with status for visualization
 */
export async function buildGraphNodes(
  courseId: string,
  userId: string
): Promise<GraphNode[]> {
  const allConcepts = await getAllConcepts(courseId);
  const masteryRecords = await getUserMastery(userId);
  const masteryLevels: Record<ConceptId, number> = {};
  const masteryMap = new Map(masteryRecords.map((m) => [m.conceptId, m]));

  // Build mastery levels map
  for (const mastery of masteryRecords) {
    masteryLevels[mastery.conceptId] = mastery.masteryLevel;
  }

  const nodes: GraphNode[] = [];

  for (const concept of allConcepts) {
    const masteryLevel = masteryLevels[concept.id] || 0;
    const unlockStatus = await getUnlockStatus(courseId, concept.id, masteryLevels);
    const mastery = masteryMap.get(concept.id);

    // Determine status
    let status: NodeStatus;
    if (!unlockStatus.isUnlocked) {
      status = 'locked';
    } else if (masteryLevel >= concept.masteryThreshold) {
      // Check if needs review
      if (mastery && mastery.nextReviewAt <= new Date()) {
        status = 'needs_review';
      } else {
        status = 'mastered';
      }
    } else if (masteryLevel > 0) {
      status = 'active';
    } else {
      status = 'available';
    }

    nodes.push({
      concept,
      status,
      masteryLevel,
      isUnlocked: unlockStatus.isUnlocked,
      prerequisitesMet: unlockStatus.prerequisitesMet,
      prerequisitesTotal: unlockStatus.prerequisitesTotal,
    });
  }

  return nodes;
}

/**
 * Get related concepts for visualization (within N hops)
 */
export async function getRelatedWithinHops(
  courseId: string,
  conceptId: ConceptId,
  maxHops: number = 2
): Promise<ConceptId[]> {
  const allConcepts = await getAllConcepts(courseId);
  const conceptMap = new Map(allConcepts.map((c) => [c.id, c]));

  const related = new Set<ConceptId>();
  const queue: { id: ConceptId; hops: number }[] = [{ id: conceptId, hops: 0 }];
  const visited = new Set<ConceptId>([conceptId]);

  while (queue.length > 0) {
    const { id, hops } = queue.shift()!;

    if (hops > maxHops) continue;

    const concept = conceptMap.get(id);
    if (!concept) continue;

    // Add to result (except the starting node)
    if (id !== conceptId) {
      related.add(id);
    }

    if (hops < maxHops) {
      // Add prerequisites
      for (const prereqId of concept.prerequisites) {
        if (!visited.has(prereqId)) {
          visited.add(prereqId);
          queue.push({ id: prereqId, hops: hops + 1 });
        }
      }

      // Add related concepts
      for (const relatedId of concept.relatedConcepts) {
        if (!visited.has(relatedId)) {
          visited.add(relatedId);
          queue.push({ id: relatedId, hops: hops + 1 });
        }
      }

      // Add dependents
      for (const other of allConcepts) {
        if (other.prerequisites.includes(id) && !visited.has(other.id)) {
          visited.add(other.id);
          queue.push({ id: other.id, hops: hops + 1 });
        }
      }
    }
  }

  return Array.from(related);
}
