/**
 * Skill Map Storage Service
 *
 * Handles Firestore persistence of dynamically generated skill maps.
 * Provides CRUD operations with proper timestamp handling.
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DynamicSkillMap, SkillMapStatus, SkillMapMetadata } from './types';

const COLLECTION = 'skillMaps';

// ============================================
// HELPERS
// ============================================

/**
 * Convert Firestore document to DynamicSkillMap
 */
function docToSkillMap(doc: FirebaseFirestore.DocumentSnapshot): DynamicSkillMap | null {
  if (!doc.exists) return null;

  const data = doc.data()!;

  // Convert Firestore Timestamps to Dates
  const metadata: SkillMapMetadata = {
    ...data.metadata,
    generatedAt: data.metadata?.generatedAt?.toDate?.() || new Date(),
    approvedAt: data.metadata?.approvedAt?.toDate?.(),
  };

  return {
    id: doc.id,
    courseId: data.courseId,
    version: data.version || 1,
    status: data.status || 'draft',
    skills: data.skills || {},
    metadata,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
}

/**
 * Convert DynamicSkillMap to Firestore document format
 */
function skillMapToDoc(skillMap: DynamicSkillMap): Record<string, unknown> {
  return {
    courseId: skillMap.courseId,
    version: skillMap.version,
    status: skillMap.status,
    skills: skillMap.skills,
    metadata: {
      ...skillMap.metadata,
      generatedAt: Timestamp.fromDate(skillMap.metadata.generatedAt),
      approvedAt: skillMap.metadata.approvedAt
        ? Timestamp.fromDate(skillMap.metadata.approvedAt)
        : null,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Save skill map to Firestore
 * Uses courseId as document ID for easy retrieval
 */
export async function saveSkillMap(skillMap: DynamicSkillMap): Promise<void> {
  const docRef = adminDb.collection(COLLECTION).doc(skillMap.courseId);

  // Check if exists to determine if this is update
  const existing = await docRef.get();
  const isUpdate = existing.exists;

  const docData = skillMapToDoc(skillMap);

  if (isUpdate) {
    // Keep original createdAt on updates
    delete docData.createdAt;
    await docRef.update({
      ...docData,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await docRef.set(docData);
  }

  const skillCount = Object.keys(skillMap.skills).length;
  console.log(
    `${isUpdate ? 'Updated' : 'Saved'} skill map for ${skillMap.courseId} (v${skillMap.version}, ${skillCount} skills)`
  );
}

/**
 * Get skill map by course ID
 */
export async function getSkillMap(courseId: string): Promise<DynamicSkillMap | null> {
  const doc = await adminDb.collection(COLLECTION).doc(courseId).get();
  return docToSkillMap(doc);
}

/**
 * Get all skill maps
 */
export async function getAllSkillMaps(): Promise<DynamicSkillMap[]> {
  const snapshot = await adminDb.collection(COLLECTION).get();
  return snapshot.docs
    .map(docToSkillMap)
    .filter((map): map is DynamicSkillMap => map !== null);
}

/**
 * Get skill maps by status
 */
export async function getSkillMapsByStatus(
  status: SkillMapStatus
): Promise<DynamicSkillMap[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('status', '==', status)
    .get();

  return snapshot.docs
    .map(docToSkillMap)
    .filter((map): map is DynamicSkillMap => map !== null);
}

/**
 * Update skill map status
 */
export async function updateSkillMapStatus(
  courseId: string,
  status: SkillMapStatus,
  approvedBy?: string
): Promise<void> {
  const docRef = adminDb.collection(COLLECTION).doc(courseId);

  const updates: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Track approval metadata
  if (status === 'approved' || status === 'active') {
    updates['metadata.approvedAt'] = FieldValue.serverTimestamp();
    if (approvedBy) {
      updates['metadata.approvedBy'] = approvedBy;
    }
  }

  await docRef.update(updates);
  console.log(`Updated skill map status for ${courseId} to ${status}`);
}

/**
 * Delete skill map
 */
export async function deleteSkillMap(courseId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(courseId).delete();
  console.log(`Deleted skill map for ${courseId}`);
}

/**
 * Check if skill map exists for course
 */
export async function hasSkillMap(courseId: string): Promise<boolean> {
  const doc = await adminDb.collection(COLLECTION).doc(courseId).get();
  return doc.exists;
}

/**
 * Increment skill map version (for regeneration)
 */
export async function incrementSkillMapVersion(courseId: string): Promise<number> {
  const docRef = adminDb.collection(COLLECTION).doc(courseId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error(`Skill map not found for course: ${courseId}`);
  }

  const currentVersion = doc.data()?.version || 1;
  const newVersion = currentVersion + 1;

  await docRef.update({
    version: newVersion,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return newVersion;
}
