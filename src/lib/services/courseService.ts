/**
 * Course Service
 * Handles all Firestore operations for course content
 * Read-only service for client to access published courses
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import type { Course, Module, Lesson, Atom } from '@/lib/auth/schemas';
import { withErrorHandling, validateString, validateRequired } from '@/lib/errors/handlers';

/**
 * Get all published courses with basic info
 * @returns Array of courses sorted by course number
 * @throws Error if database operation fails
 */
export async function getCourses(): Promise<Course[]> {
  return withErrorHandling('fetch courses', async () => {
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
  });
}

/**
 * Get a single course with all modules
 * @param courseId - The course's ID
 * @returns Course with all modules or null if not found
 * @throws Error if database operation fails
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  return withErrorHandling(`fetch course ${courseId}`, async () => {
    validateString('courseId', courseId);

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
  });
}

/**
 * Get a single module with all lessons
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @returns Module with all lessons or null if not found
 * @throws Error if database operation fails
 */
export async function getModule(courseId: string, moduleId: string): Promise<Module | null> {
  return withErrorHandling(`fetch module ${moduleId}`, async () => {
    validateRequired({ courseId, moduleId });

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
  });
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
  return withErrorHandling(`fetch lesson ${lessonId}`, async () => {
    validateRequired({ courseId, moduleId, lessonId });

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
  });
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
  return withErrorHandling(`fetch atom ${atomId}`, async () => {
    validateRequired({ courseId, moduleId, lessonId, atomId });

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
  });
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
): Promise<(Course & { userProgress: { completedAtoms: string[]; completedLessons: string[]; completedModules: string[]; atomsCompletedCount: number; lessonsCompletedCount: number; modulesCompletedCount: number } }) | null> {
  return withErrorHandling(`fetch course with progress ${courseId}`, async () => {
    validateRequired({ courseId, uid });

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

    return enrichedCourse;
  });
}

/**
 * Check if a course exists
 * @param courseId - The course's ID
 * @returns Boolean indicating if course exists
 * @throws Error if database operation fails
 */
export async function courseExists(courseId: string): Promise<boolean> {
  return withErrorHandling(`check course existence for ${courseId}`, async () => {
    validateString('courseId', courseId);

    const doc = await adminDb.collection('courses').doc(courseId).get();
    return doc.exists;
  });
}

/**
 * Get all lessons for a module
 * @param courseId - The course's ID
 * @param moduleId - The module's ID
 * @returns Array of lessons
 * @throws Error if database operation fails
 */
export async function getModuleLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  return withErrorHandling(`fetch lessons for module ${moduleId}`, async () => {
    validateRequired({ courseId, moduleId });

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
  });
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
  return withErrorHandling(`fetch atoms for lesson ${lessonId}`, async () => {
    validateRequired({ courseId, moduleId, lessonId });

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
  });
}
