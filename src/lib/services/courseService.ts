/**
 * Course Service
 * Handles all Firestore operations for course content
 * Read-only service for client to access published courses
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import type { Course, Module, Lesson, Atom } from '@/lib/auth/schemas';

/**
 * Get all published courses with basic info
 * @returns Array of courses sorted by course number
 * @throws Error if database operation fails
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const snapshot = await adminDb
      .collection('courses')
      .orderBy('number', 'asc')
      .get();

    const courses: Course[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      courses.push({
        id: doc.id,
        ...data,
      } as Course);
    });

    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error(
      `Failed to fetch courses: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a single course with all modules
 * @param courseId - The course's ID
 * @returns Course with all modules or null if not found
 * @throws Error if database operation fails
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  try {
    if (!courseId || typeof courseId !== 'string') {
      throw new Error('Invalid courseId provided');
    }

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();

    if (!courseDoc.exists) {
      return null;
    }

    const courseData = courseDoc.data();
    if (!courseData) {
      return null;
    }

    // Fetch all modules for this course
    const modulesSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .orderBy('number', 'asc')
      .get();

    const modules: Module[] = [];

    for (const moduleDoc of modulesSnapshot.docs) {
      const moduleData = moduleDoc.data();

      // Fetch all lessons for this module
      const lessonsSnapshot = await adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .doc(moduleDoc.id)
        .collection('lessons')
        .orderBy('number', 'asc')
        .get();

      const lessons: Lesson[] = [];

      for (const lessonDoc of lessonsSnapshot.docs) {
        const lessonData = lessonDoc.data();

        // Fetch all atoms for this lesson
        const atomsSnapshot = await adminDb
          .collection('courses')
          .doc(courseId)
          .collection('modules')
          .doc(moduleDoc.id)
          .collection('lessons')
          .doc(lessonDoc.id)
          .collection('atoms')
          .get();

        const atoms: Atom[] = atomsSnapshot.docs.map(atomDoc => ({
          id: atomDoc.id,
          ...atomDoc.data(),
        })) as Atom[];

        lessons.push({
          id: lessonDoc.id,
          ...lessonData,
          atoms,
        } as Lesson);
      }

      modules.push({
        id: moduleDoc.id,
        ...moduleData,
        lessons,
      } as Module);
    }

    return {
      id: courseDoc.id,
      ...courseData,
      modules,
    } as Course;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    throw new Error(
      `Failed to fetch course: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a single module with all lessons
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @returns Module with all lessons or null if not found
 * @throws Error if database operation fails
 */
export async function getModule(courseId: string, moduleId: string): Promise<Module | null> {
  try {
    if (!courseId || !moduleId) {
      throw new Error('courseId and moduleId are required');
    }

    const moduleDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .get();

    if (!moduleDoc.exists) {
      return null;
    }

    const moduleData = moduleDoc.data();
    if (!moduleData) {
      return null;
    }

    // Fetch all lessons for this module
    const lessonsSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .orderBy('number', 'asc')
      .get();

    const lessons: Lesson[] = [];

    for (const lessonDoc of lessonsSnapshot.docs) {
      const lessonData = lessonDoc.data();

      // Fetch all atoms for this lesson
      const atomsSnapshot = await adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .doc(moduleId)
        .collection('lessons')
        .doc(lessonDoc.id)
        .collection('atoms')
        .get();

      const atoms: Atom[] = atomsSnapshot.docs.map(atomDoc => ({
        id: atomDoc.id,
        ...atomDoc.data(),
      })) as Atom[];

      lessons.push({
        id: lessonDoc.id,
        ...lessonData,
        atoms,
      } as Lesson);
    }

    return {
      id: moduleDoc.id,
      ...moduleData,
      lessons,
    } as Module;
  } catch (error) {
    console.error(`Error fetching module ${moduleId}:`, error);
    throw new Error(
      `Failed to fetch module: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a single lesson with all atoms
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @param lessonId - The lesson's ID
 * @returns Lesson with all atoms or null if not found
 * @throws Error if database operation fails
 */
export async function getLesson(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Lesson | null> {
  try {
    if (!courseId || !moduleId || !lessonId) {
      throw new Error('courseId, moduleId, and lessonId are required');
    }

    const lessonDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .get();

    if (!lessonDoc.exists) {
      return null;
    }

    const lessonData = lessonDoc.data();
    if (!lessonData) {
      return null;
    }

    // Fetch all atoms for this lesson
    const atomsSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .collection('atoms')
      .get();

    const atoms: Atom[] = atomsSnapshot.docs.map(atomDoc => ({
      id: atomDoc.id,
      ...atomDoc.data(),
    })) as Atom[];

    return {
      id: lessonDoc.id,
      ...lessonData,
      atoms,
    } as Lesson;
  } catch (error) {
    console.error(`Error fetching lesson ${lessonId}:`, error);
    throw new Error(
      `Failed to fetch lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a single atom
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @param lessonId - The lesson's ID
 * @param atomId - The atom's ID
 * @returns Atom or null if not found
 * @throws Error if database operation fails
 */
export async function getAtom(
  courseId: string,
  moduleId: string,
  lessonId: string,
  atomId: string
): Promise<Atom | null> {
  try {
    if (!courseId || !moduleId || !lessonId || !atomId) {
      throw new Error('All IDs (courseId, moduleId, lessonId, atomId) are required');
    }

    const atomDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .collection('atoms')
      .doc(atomId)
      .get();

    if (!atomDoc.exists) {
      return null;
    }

    const atomData = atomDoc.data();
    if (!atomData) {
      return null;
    }

    return {
      id: atomDoc.id,
      ...atomData,
    } as Atom;
  } catch (error) {
    console.error(`Error fetching atom ${atomId}:`, error);
    throw new Error(
      `Failed to fetch atom: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get courses with user's completion status overlaid
 * Returns course data with user's progress information
 * @param courseId - The course's ID
 * @param uid - User's Firebase UID
 * @param completedAtoms - Array of atom IDs completed by user
 * @param completedLessons - Array of lesson IDs completed by user
 * @param completedModules - Array of module IDs completed by user
 * @returns Course with completion status or null if not found
 * @throws Error if database operation fails
 */
export async function getCourseWithProgress(
  courseId: string,
  uid: string,
  completedAtoms: string[],
  completedLessons: string[],
  completedModules: string[]
): Promise<(Course & { userProgress: any }) | null> {
  try {
    if (!courseId || !uid) {
      throw new Error('courseId and uid are required');
    }

    const course = await getCourse(courseId);

    if (!course) {
      return null;
    }

    // Overlay completion status
    const enrichedCourse = {
      ...course,
      userProgress: {
        completedAtoms,
        completedLessons,
        completedModules,
        atomsCompletedCount: completedAtoms.length,
        lessonsCompletedCount: completedLessons.length,
        modulesCompletedCount: completedModules.length,
      },
    };

    return enrichedCourse as Course & { userProgress: any };
  } catch (error) {
    console.error(`Error fetching course with progress ${courseId}:`, error);
    throw new Error(
      `Failed to fetch course with progress: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a course exists
 * @param courseId - The course's ID
 * @returns Boolean indicating if course exists
 * @throws Error if database operation fails
 */
export async function courseExists(courseId: string): Promise<boolean> {
  try {
    if (!courseId || typeof courseId !== 'string') {
      throw new Error('Invalid courseId provided');
    }

    const doc = await adminDb.collection('courses').doc(courseId).get();
    return doc.exists;
  } catch (error) {
    console.error(`Error checking course existence for ${courseId}:`, error);
    throw new Error(
      `Failed to check course existence: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all lessons for a module
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @returns Array of lessons
 * @throws Error if database operation fails
 */
export async function getModuleLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  try {
    if (!courseId || !moduleId) {
      throw new Error('courseId and moduleId are required');
    }

    const lessonsSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .orderBy('number', 'asc')
      .get();

    const lessons: Lesson[] = lessonsSnapshot.docs.map(lessonDoc => {
      const data = lessonDoc.data();
      return {
        id: lessonDoc.id,
        moduleId: data.moduleId || '',
        number: data.number || 0,
        title: data.title || '',
        objectives: data.objectives || [],
        estimatedMinutes: data.estimatedMinutes || 0,
        atoms: [],
        isLocked: data.isLocked || false,
      } as Lesson;
    });

    return lessons;
  } catch (error) {
    console.error(
      `Error fetching lessons for module ${moduleId}:`,
      error
    );
    throw new Error(
      `Failed to fetch lessons: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all atoms for a lesson
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @param lessonId - The lesson's ID
 * @returns Array of atoms
 * @throws Error if database operation fails
 */
export async function getLessonAtoms(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Atom[]> {
  try {
    if (!courseId || !moduleId || !lessonId) {
      throw new Error('courseId, moduleId, and lessonId are required');
    }

    const atomsSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .collection('atoms')
      .get();

    const atoms: Atom[] = atomsSnapshot.docs.map(atomDoc => ({
      id: atomDoc.id,
      ...atomDoc.data(),
    })) as Atom[];

    return atoms;
  } catch (error) {
    console.error(`Error fetching atoms for lesson ${lessonId}:`, error);
    throw new Error(
      `Failed to fetch atoms: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
