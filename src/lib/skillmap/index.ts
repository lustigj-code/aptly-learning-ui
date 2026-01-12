/**
 * Skill Map Module
 *
 * Provides AI-powered dynamic skill map generation, storage, and management.
 * This is the public API for the skill map system.
 */

// Re-export types
export * from './types';

// Re-export course parser
export { parseCourse, parseAllCourses } from './courseParser';

// Re-export skill map generator
export {
  generateSkillMap,
  validateSkillMap,
  mergeSkillMaps,
} from './skillMapGenerator';

// Re-export storage functions
export {
  saveSkillMap,
  getSkillMap,
  getAllSkillMaps,
  getSkillMapsByStatus,
  updateSkillMapStatus,
  deleteSkillMap,
  hasSkillMap,
  incrementSkillMapVersion,
} from './skillMapStorage';

// Re-export sequencer cache control
export { clearSkillMapCache } from '@/lib/adaptive/sequencer';

// Import for internal use
import { parseCourse, parseAllCourses } from './courseParser';
import { generateSkillMap } from './skillMapGenerator';
import { saveSkillMap, hasSkillMap } from './skillMapStorage';
import { clearSkillMapCache } from '@/lib/adaptive/sequencer';
import type { DynamicSkillMap } from './types';

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Generate and save skill map for a course
 *
 * @param courseId - The course ID to generate skill map for
 * @param autoApprove - If true, set status to 'active' immediately
 * @returns The generated skill map
 */
export async function generateAndSaveSkillMap(
  courseId: string,
  autoApprove: boolean = false
): Promise<DynamicSkillMap> {
  // Parse course content
  const courseContent = parseCourse(courseId);
  if (!courseContent) {
    throw new Error(`Course not found: ${courseId}`);
  }

  console.log(`[SkillMap] Generating skill map for ${courseId}...`);

  // Generate skill map using AI
  const skillMap = await generateSkillMap(courseContent);

  // Auto-approve if requested
  if (autoApprove) {
    skillMap.status = 'active';
  }

  // Save to Firestore
  await saveSkillMap(skillMap);

  // Clear cache so new map is loaded
  clearSkillMapCache(courseId);

  console.log(`[SkillMap] Saved skill map for ${courseId} (${Object.keys(skillMap.skills).length} skills)`);

  return skillMap;
}

/**
 * Generate skill maps for all courses that don't have one
 *
 * @returns Object with lists of generated and failed course IDs
 */
export async function generateMissingSkillMaps(): Promise<{
  generated: string[];
  failed: string[];
  skipped: string[];
}> {
  const courses = parseAllCourses();
  const generated: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  console.log(`[SkillMap] Checking ${courses.length} courses for missing skill maps...`);

  for (const course of courses) {
    try {
      const exists = await hasSkillMap(course.courseId);
      if (exists) {
        skipped.push(course.courseId);
        continue;
      }

      await generateAndSaveSkillMap(course.courseId, false); // Don't auto-approve
      generated.push(course.courseId);
    } catch (error) {
      console.error(`[SkillMap] Failed to generate skill map for ${course.courseId}:`, error);
      failed.push(course.courseId);
    }
  }

  console.log(`[SkillMap] Complete: ${generated.length} generated, ${skipped.length} skipped, ${failed.length} failed`);

  return { generated, failed, skipped };
}

/**
 * Regenerate skill map for a course (increments version)
 *
 * @param courseId - The course ID to regenerate
 * @returns The regenerated skill map
 */
export async function regenerateSkillMap(courseId: string): Promise<DynamicSkillMap> {
  const courseContent = parseCourse(courseId);
  if (!courseContent) {
    throw new Error(`Course not found: ${courseId}`);
  }

  console.log(`[SkillMap] Regenerating skill map for ${courseId}...`);

  // Generate new skill map
  const skillMap = await generateSkillMap(courseContent);

  // Keep as draft until approved
  skillMap.status = 'draft';

  // Save (will increment version if exists)
  await saveSkillMap(skillMap);

  // Clear cache
  clearSkillMapCache(courseId);

  return skillMap;
}
