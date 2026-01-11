/**
 * Path Modifier - Coach Authority to Change Learning Path
 *
 * Gives the AI coach the ability to:
 * - Insert remedial content before current item
 * - Replace content with simpler variants
 * - Skip content user already knows
 * - Reorder learning path based on learner state
 */

import { adminDb } from '@/lib/firebase/admin';
import { getSkillName } from '@/data/skillMap';

// ============================================
// TYPES
// ============================================

export interface PathModification {
  type: 'insert' | 'replace' | 'skip' | 'reorder';
  reason: string;
  items: string[]; // Content IDs to insert/replace/skip
  targetPosition: 'before_current' | 'after_current' | 'replace_current';
}

export interface LearningPathItem {
  id: string;
  type: 'lesson' | 'atom' | 'review' | 'practice' | 'remediation';
  skillId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  insertedBy?: 'system' | 'coach' | 'user';
  reason?: string;
  order: number;
}

export interface LearningPath {
  userId: string;
  items: LearningPathItem[];
  currentIndex: number;
  lastModified: Date;
  modifications: PathModificationLog[];
}

export interface PathModificationLog {
  timestamp: Date;
  modification: PathModification;
  appliedBy: 'coach' | 'system' | 'user';
  success: boolean;
}

// ============================================
// MAIN PATH MODIFICATION FUNCTIONS
// ============================================

/**
 * Apply coach recommendation to modify the learning path
 */
export async function applyCoachModification(
  userId: string,
  modification: PathModification
): Promise<{ success: boolean; message: string }> {
  try {
    const path = await getLearningPath(userId);

    switch (modification.type) {
      case 'insert':
        await insertPathItems(userId, modification.items, modification.targetPosition, modification.reason);
        break;
      case 'replace':
        await replaceCurrentItem(userId, modification.items[0], modification.reason);
        break;
      case 'skip':
        await skipItems(userId, modification.items, modification.reason);
        break;
      case 'reorder':
        await reorderPath(userId, modification.items);
        break;
    }

    // Log the modification
    await logModification(userId, modification, 'coach', true);

    return {
      success: true,
      message: `Path modified: ${modification.reason}`,
    };
  } catch (error) {
    console.error('Failed to apply coach modification:', error);
    await logModification(userId, modification, 'coach', false);
    return {
      success: false,
      message: 'Failed to modify learning path',
    };
  }
}

/**
 * Insert remedial content before current item
 */
export async function insertRemediation(
  userId: string,
  contentId: string,
  skillId: string,
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);
  const currentIndex = path.currentIndex;

  // Create remediation item
  const remediationItem: LearningPathItem = {
    id: contentId,
    type: 'remediation',
    skillId,
    status: 'pending',
    insertedBy: 'coach',
    reason,
    order: currentIndex,
  };

  // Insert at current position, shift everything else
  const newItems = [...path.items];
  newItems.splice(currentIndex, 0, remediationItem);

  // Re-number items
  newItems.forEach((item, idx) => {
    item.order = idx;
  });

  // Save updated path
  await saveLearningPath(userId, {
    ...path,
    items: newItems,
    lastModified: new Date(),
  });

  console.log(`[PathModifier] Inserted remediation ${contentId} for user ${userId}`);
}

/**
 * Skip content user already knows
 */
export async function skipAhead(
  userId: string,
  skillIds: string[],
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);

  // Mark items for these skills as skipped
  const updatedItems = path.items.map(item => {
    if (skillIds.includes(item.skillId) && item.status === 'pending') {
      return {
        ...item,
        status: 'skipped' as const,
        reason,
      };
    }
    return item;
  });

  // Find next non-skipped item
  const nextIndex = updatedItems.findIndex(
    (item, idx) => idx >= path.currentIndex && item.status === 'pending'
  );

  await saveLearningPath(userId, {
    ...path,
    items: updatedItems,
    currentIndex: nextIndex >= 0 ? nextIndex : path.currentIndex,
    lastModified: new Date(),
  });

  console.log(`[PathModifier] Skipped skills ${skillIds.join(', ')} for user ${userId}`);
}

/**
 * Replace current content with simpler variant
 */
export async function replaceWithSimpler(
  userId: string,
  currentId: string,
  simplerId: string,
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);
  const currentIndex = path.currentIndex;

  if (path.items[currentIndex]?.id !== currentId) {
    console.warn('Current item mismatch, cannot replace');
    return;
  }

  // Replace the current item
  const updatedItems = [...path.items];
  updatedItems[currentIndex] = {
    ...updatedItems[currentIndex],
    id: simplerId,
    type: 'remediation',
    reason,
    insertedBy: 'coach',
  };

  await saveLearningPath(userId, {
    ...path,
    items: updatedItems,
    lastModified: new Date(),
  });

  console.log(`[PathModifier] Replaced ${currentId} with ${simplerId} for user ${userId}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user's learning path from Firestore
 */
export async function getLearningPath(userId: string): Promise<LearningPath> {
  try {
    const pathDoc = await adminDb.collection('learningPaths').doc(userId).get();

    if (pathDoc.exists) {
      const data = pathDoc.data();
      return {
        userId,
        items: data?.items || [],
        currentIndex: data?.currentIndex || 0,
        lastModified: data?.lastModified?.toDate() || new Date(),
        modifications: data?.modifications || [],
      };
    }

    // Return empty path if none exists
    return {
      userId,
      items: [],
      currentIndex: 0,
      lastModified: new Date(),
      modifications: [],
    };
  } catch (error) {
    console.error('Failed to get learning path:', error);
    return {
      userId,
      items: [],
      currentIndex: 0,
      lastModified: new Date(),
      modifications: [],
    };
  }
}

/**
 * Save learning path to Firestore
 */
async function saveLearningPath(userId: string, path: LearningPath): Promise<void> {
  await adminDb.collection('learningPaths').doc(userId).set({
    ...path,
    lastModified: new Date(),
  }, { merge: true });
}

/**
 * Insert items at a position in the path
 */
async function insertPathItems(
  userId: string,
  itemIds: string[],
  position: PathModification['targetPosition'],
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);
  let insertIndex = path.currentIndex;

  if (position === 'after_current') {
    insertIndex = path.currentIndex + 1;
  }

  // Create new items
  const newItems: LearningPathItem[] = itemIds.map((id, idx) => ({
    id,
    type: 'remediation' as const,
    skillId: extractSkillFromContentId(id),
    status: 'pending' as const,
    insertedBy: 'coach' as const,
    reason,
    order: insertIndex + idx,
  }));

  // Insert into path
  const updatedItems = [...path.items];
  updatedItems.splice(insertIndex, 0, ...newItems);

  // Re-number
  updatedItems.forEach((item, idx) => {
    item.order = idx;
  });

  await saveLearningPath(userId, {
    ...path,
    items: updatedItems,
  });
}

/**
 * Replace current item in path
 */
async function replaceCurrentItem(
  userId: string,
  newItemId: string,
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);
  const currentIndex = path.currentIndex;

  if (currentIndex >= path.items.length) return;

  const updatedItems = [...path.items];
  const currentItem = updatedItems[currentIndex];

  updatedItems[currentIndex] = {
    ...currentItem,
    id: newItemId,
    reason,
    insertedBy: 'coach',
  };

  await saveLearningPath(userId, {
    ...path,
    items: updatedItems,
  });
}

/**
 * Skip items in path
 */
async function skipItems(
  userId: string,
  itemIds: string[],
  reason: string
): Promise<void> {
  const path = await getLearningPath(userId);
  const skipSet = new Set(itemIds);

  const updatedItems = path.items.map(item => {
    if (skipSet.has(item.id)) {
      return {
        ...item,
        status: 'skipped' as const,
        reason,
      };
    }
    return item;
  });

  await saveLearningPath(userId, {
    ...path,
    items: updatedItems,
  });
}

/**
 * Reorder path items
 */
async function reorderPath(userId: string, newOrder: string[]): Promise<void> {
  const path = await getLearningPath(userId);
  const itemMap = new Map(path.items.map(item => [item.id, item]));

  const reorderedItems: LearningPathItem[] = [];

  // Add items in new order
  for (const id of newOrder) {
    const item = itemMap.get(id);
    if (item) {
      reorderedItems.push(item);
      itemMap.delete(id);
    }
  }

  // Add any remaining items at the end
  for (const item of itemMap.values()) {
    reorderedItems.push(item);
  }

  // Re-number
  reorderedItems.forEach((item, idx) => {
    item.order = idx;
  });

  await saveLearningPath(userId, {
    ...path,
    items: reorderedItems,
    currentIndex: 0, // Reset to start
  });
}

/**
 * Log path modification for analytics
 */
async function logModification(
  userId: string,
  modification: PathModification,
  appliedBy: 'coach' | 'system' | 'user',
  success: boolean
): Promise<void> {
  try {
    const log: PathModificationLog = {
      timestamp: new Date(),
      modification,
      appliedBy,
      success,
    };

    await adminDb.collection('pathModificationLogs').add({
      userId,
      ...log,
    });
  } catch (error) {
    console.warn('Failed to log modification:', error);
  }
}

/**
 * Extract skill ID from content ID
 */
function extractSkillFromContentId(contentId: string): string {
  // Content IDs have format like: remediation-M1-genai-definition, review-M2-prompt-components
  const parts = contentId.split('-');
  if (parts.length >= 3) {
    // Skip the prefix (remediation, review, etc.)
    return parts.slice(1).join('-');
  }
  return contentId;
}

/**
 * Advance to next item in path
 */
export async function advanceInPath(userId: string): Promise<LearningPathItem | null> {
  const path = await getLearningPath(userId);

  // Mark current as completed
  if (path.items[path.currentIndex]) {
    path.items[path.currentIndex].status = 'completed';
  }

  // Find next pending item
  const nextIndex = path.items.findIndex(
    (item, idx) => idx > path.currentIndex && item.status === 'pending'
  );

  if (nextIndex === -1) {
    return null; // No more items
  }

  await saveLearningPath(userId, {
    ...path,
    currentIndex: nextIndex,
  });

  return path.items[nextIndex];
}

/**
 * Get current item in path
 */
export async function getCurrentPathItem(userId: string): Promise<LearningPathItem | null> {
  const path = await getLearningPath(userId);

  if (path.currentIndex >= path.items.length) {
    return null;
  }

  return path.items[path.currentIndex];
}

// ============================================
// COACH INTEGRATION
// ============================================

/**
 * Generate path modification from coach response
 * Called when coach suggests a change to learning path
 */
export function parseCoachSuggestion(coachResponse: string): PathModification | null {
  // Look for modification markers in coach response
  const insertMatch = coachResponse.match(/\[INSERT:([^\]]+)\]/);
  const skipMatch = coachResponse.match(/\[SKIP:([^\]]+)\]/);
  const reviewMatch = coachResponse.match(/\[REVIEW:([^\]]+)\]/);

  if (insertMatch) {
    return {
      type: 'insert',
      reason: 'Coach recommended additional content',
      items: [insertMatch[1]],
      targetPosition: 'before_current',
    };
  }

  if (skipMatch) {
    return {
      type: 'skip',
      reason: 'Coach determined content can be skipped',
      items: [skipMatch[1]],
      targetPosition: 'replace_current',
    };
  }

  if (reviewMatch) {
    return {
      type: 'insert',
      reason: 'Coach recommended prerequisite review',
      items: [`review-${reviewMatch[1]}`],
      targetPosition: 'before_current',
    };
  }

  return null;
}

// Types are exported inline above (LearningPath, LearningPathItem, PathModificationLog)
