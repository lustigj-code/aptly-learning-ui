import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAllCourses } from '@/data/courseRegistry';
import { getAtomsCompleted } from '@/lib/data/userProgressLayer';
import { LRUCache } from '@/lib/cache/LRUCache';
import type { Course } from '@/types';

type CourseResponse = {
  id: string;
  number: number;
  title: string;
  description: string;
  objectives: string[];
  estimatedHours: number;
  isLocked: boolean;
  prerequisites: string[];
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
};

// Type for denormalized course with atom metadata
interface CourseWithMeta extends Course {
  isPublished: boolean;
  // Denormalized counts to avoid N+1 queries
  totalAtomCount?: number;
  atomIds?: string[];
}

/**
 * Course metadata cache
 *
 * Caches course atom counts and IDs to avoid repeated deep reads.
 * TTL: 10 minutes (courses don't change often)
 * Max: 50 courses
 */
const courseMetaCache = new LRUCache<
  string,
  { totalAtomCount: number; atomIds: string[] }
>({
  maxSize: 50,
  ttlMs: 10 * 60 * 1000, // 10 minutes
  cleanupIntervalMs: 2 * 60 * 1000, // Cleanup every 2 minutes
});

/**
 * Get atom metadata for a course
 *
 * Uses cache first, falls back to Firestore read.
 * This is the expensive operation we want to minimize.
 *
 * OPTIMIZATION: In production, this data should be denormalized
 * onto the course document itself. Run a Cloud Function to update
 * course.totalAtomCount and course.atomIds whenever lessons change.
 */
async function getCourseAtomMeta(
  courseId: string
): Promise<{ totalAtomCount: number; atomIds: string[] }> {
  // Check cache first
  const cached = courseMetaCache.get(courseId);
  if (cached) {
    return cached;
  }

  // Fetch from Firestore (expensive - minimize this)
  const atomIds: string[] = [];

  try {
    // Batch fetch: Get all modules for this course
    const modulesSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .get();

    if (modulesSnapshot.empty) {
      const result = { totalAtomCount: 0, atomIds: [] };
      courseMetaCache.set(courseId, result);
      return result;
    }

    // Batch fetch: Get all lessons for all modules in parallel
    const lessonPromises = modulesSnapshot.docs.map((moduleDoc) =>
      moduleDoc.ref.collection('lessons').get()
    );
    const lessonSnapshots = await Promise.all(lessonPromises);

    // Extract atom IDs from all lessons
    for (const lessonsSnapshot of lessonSnapshots) {
      for (const lessonDoc of lessonsSnapshot.docs) {
        const lessonData = lessonDoc.data();
        const atoms = lessonData.atoms || [];
        for (const atom of atoms) {
          if (atom.id) {
            atomIds.push(atom.id);
          }
        }
      }
    }

    const result = { totalAtomCount: atomIds.length, atomIds };
    courseMetaCache.set(courseId, result);
    return result;
  } catch (error) {
    console.error(`[Courses API] Error fetching atom meta for ${courseId}:`, error);
    return { totalAtomCount: 0, atomIds: [] };
  }
}

/**
 * Calculate course progress efficiently
 *
 * Uses Set for O(1) lookups instead of array includes.
 */
function calculateProgress(
  atomIds: string[],
  completedAtoms: string[]
): { completed: number; total: number; percentage: number } {
  if (atomIds.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  // Use Set for O(1) lookups
  const completedSet = new Set(completedAtoms);
  let completedCount = 0;

  for (const atomId of atomIds) {
    if (completedSet.has(atomId)) {
      completedCount++;
    }
  }

  return {
    completed: completedCount,
    total: atomIds.length,
    percentage: Math.round((completedCount / atomIds.length) * 100),
  };
}

/**
 * GET /api/courses
 * List all published courses with optional user progress overlay
 *
 * Query params:
 * - userId (optional): to get user's progress for courses
 *
 * OPTIMIZATIONS (Phase 5):
 * 1. Uses LRU cache for course atom metadata
 * 2. Batches Firestore reads with Promise.all()
 * 3. Uses unified user progress layer with caching
 * 4. Uses Set for O(1) completion lookups
 *
 * Previous: O(n*m*l) reads where n=courses, m=modules, l=lessons
 * Now: O(1) cache hit or O(n) parallel reads on cache miss
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // Fetch all published courses from Firestore
    const coursesSnapshot = await adminDb
      .collection('courses')
      .where('isPublished', '==', true)
      .orderBy('number', 'asc')
      .get();

    // Fall back to registry data if Firestore is empty
    if (coursesSnapshot.empty) {
      const registryCourses = getAllCourses();
      const mockCourses: CourseResponse[] = registryCourses.map((course) => ({
        id: course.id,
        number: course.number,
        title: course.title,
        description: course.description,
        objectives: course.objectives,
        estimatedHours: course.estimatedHours,
        isLocked: course.isLocked,
        prerequisites: course.prerequisites || [],
      }));

      return NextResponse.json({ courses: mockCourses }, { status: 200 });
    }

    // Get user's completed atoms once (if userId provided)
    let completedAtoms: string[] = [];
    if (userId) {
      try {
        // Uses unified progress layer with caching
        completedAtoms = await getAtomsCompleted(userId);
      } catch (error) {
        console.error(`[Courses API] Error fetching user progress:`, error);
        // Continue without progress data
      }
    }

    // Process courses in parallel with batch atom metadata fetch
    const coursePromises = coursesSnapshot.docs.map(async (courseDoc) => {
      const courseData = courseDoc.data() as CourseWithMeta;
      const courseId = courseDoc.id;

      const courseResponse: CourseResponse = {
        id: courseId,
        number: courseData.number,
        title: courseData.title,
        description: courseData.description,
        objectives: courseData.objectives,
        estimatedHours: courseData.estimatedHours,
        isLocked: courseData.isLocked,
        prerequisites: courseData.prerequisites,
      };

      // Calculate progress if userId provided
      if (userId && completedAtoms.length >= 0) {
        try {
          // Check if course has denormalized counts first
          if (
            courseData.totalAtomCount !== undefined &&
            courseData.atomIds !== undefined
          ) {
            // Use denormalized data (fastest path)
            courseResponse.progress = calculateProgress(
              courseData.atomIds,
              completedAtoms
            );
          } else {
            // Fall back to cached/fetched atom metadata
            const atomMeta = await getCourseAtomMeta(courseId);
            courseResponse.progress = calculateProgress(
              atomMeta.atomIds,
              completedAtoms
            );
          }
        } catch (error) {
          console.error(`[Courses API] Error calculating progress for ${courseId}:`, error);
          // Continue without progress
        }
      }

      return courseResponse;
    });

    const courses = await Promise.all(coursePromises);

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error) {
    console.error('[Courses API] Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

/**
 * Clear course metadata cache
 * Call when course content changes
 * Note: Kept internal to route file - move to @/lib/cache/courseCache.ts if needed elsewhere
 */
function _clearCourseCache(courseId?: string): void {
  if (courseId) {
    courseMetaCache.delete(courseId);
  } else {
    courseMetaCache.clear();
  }
}
