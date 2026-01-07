/**
 * Content Management Service
 * Handles CRUD operations for courses, modules, lessons, and atoms
 * Supports both Firestore and mock data fallback
 */

import { adminDb } from '@/lib/firebase/admin'
import { COURSES, COURSE_3_MODULE_1 } from '@/data/mockData'
import type { Course, Module, Lesson, Atom } from '@/types'

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true'

// ============================================
// COURSES
// ============================================

export async function getAllCourses(): Promise<Course[]> {
  if (USE_MOCK_DATA) {
    return COURSES
  }

  try {
    const snapshot = await adminDb.collection('courses').orderBy('number').get()

    if (snapshot.empty) {
      // Fallback to mock data if Firestore is empty
      return COURSES
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[]
  } catch (error) {
    console.error('Error fetching courses:', error)
    return COURSES // Fallback to mock
  }
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  if (USE_MOCK_DATA) {
    return COURSES.find((c) => c.id === courseId) || null
  }

  try {
    const doc = await adminDb.collection('courses').doc(courseId).get()

    if (!doc.exists) {
      return COURSES.find((c) => c.id === courseId) || null
    }

    return { id: doc.id, ...doc.data() } as Course
  } catch (error) {
    console.error('Error fetching course:', error)
    return COURSES.find((c) => c.id === courseId) || null
  }
}

export async function createCourse(course: Omit<Course, 'id'>): Promise<string> {
  const docRef = await adminDb.collection('courses').add({
    ...course,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return docRef.id
}

export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
  await adminDb.collection('courses').doc(courseId).update({
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteCourse(courseId: string): Promise<void> {
  await adminDb.collection('courses').doc(courseId).delete()
}

// ============================================
// MODULES
// ============================================

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  if (USE_MOCK_DATA) {
    // Return sample module for course-3
    if (courseId === 'course-3') {
      return [COURSE_3_MODULE_1]
    }
    return []
  }

  try {
    const snapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .orderBy('number')
      .get()

    if (snapshot.empty && courseId === 'course-3') {
      return [COURSE_3_MODULE_1]
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Module[]
  } catch (error) {
    console.error('Error fetching modules:', error)
    if (courseId === 'course-3') {
      return [COURSE_3_MODULE_1]
    }
    return []
  }
}

export async function getModuleById(courseId: string, moduleId: string): Promise<Module | null> {
  if (USE_MOCK_DATA) {
    if (moduleId === 'c3-m1') {
      return COURSE_3_MODULE_1
    }
    return null
  }

  try {
    const doc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .get()

    if (!doc.exists) {
      if (moduleId === 'c3-m1') {
        return COURSE_3_MODULE_1
      }
      return null
    }

    return { id: doc.id, ...doc.data() } as Module
  } catch (error) {
    console.error('Error fetching module:', error)
    return null
  }
}

export async function createModule(courseId: string, module: Omit<Module, 'id'>): Promise<string> {
  const docRef = await adminDb
    .collection('courses')
    .doc(courseId)
    .collection('modules')
    .add({
      ...module,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  return docRef.id
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  updates: Partial<Module>
): Promise<void> {
  await adminDb
    .collection('courses')
    .doc(courseId)
    .collection('modules')
    .doc(moduleId)
    .update({
      ...updates,
      updatedAt: new Date(),
    })
}

// ============================================
// LESSONS
// ============================================

export async function getLessonsByModule(
  courseId: string,
  moduleId: string
): Promise<Lesson[]> {
  if (USE_MOCK_DATA) {
    if (moduleId === 'c3-m1') {
      return COURSE_3_MODULE_1.lessons
    }
    return []
  }

  try {
    const snapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .orderBy('number')
      .get()

    if (snapshot.empty && moduleId === 'c3-m1') {
      return COURSE_3_MODULE_1.lessons
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lesson[]
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return []
  }
}

export async function getLessonById(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Lesson | null> {
  if (USE_MOCK_DATA) {
    if (moduleId === 'c3-m1') {
      return COURSE_3_MODULE_1.lessons.find((l) => l.id === lessonId) || null
    }
    return null
  }

  try {
    const doc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .get()

    if (!doc.exists) {
      if (moduleId === 'c3-m1') {
        return COURSE_3_MODULE_1.lessons.find((l) => l.id === lessonId) || null
      }
      return null
    }

    return { id: doc.id, ...doc.data() } as Lesson
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return null
  }
}

export async function createLesson(
  courseId: string,
  moduleId: string,
  lesson: Omit<Lesson, 'id'>
): Promise<string> {
  const docRef = await adminDb
    .collection('courses')
    .doc(courseId)
    .collection('modules')
    .doc(moduleId)
    .collection('lessons')
    .add({
      ...lesson,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  return docRef.id
}

// ============================================
// ATOMS
// ============================================

export async function getAtomsByLesson(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Atom[]> {
  if (USE_MOCK_DATA) {
    if (moduleId === 'c3-m1') {
      const lesson = COURSE_3_MODULE_1.lessons.find((l) => l.id === lessonId)
      return lesson?.atoms || []
    }
    return []
  }

  try {
    const lessonDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .collection('lessons')
      .doc(lessonId)
      .get()

    if (!lessonDoc.exists) {
      if (moduleId === 'c3-m1') {
        const lesson = COURSE_3_MODULE_1.lessons.find((l) => l.id === lessonId)
        return lesson?.atoms || []
      }
      return []
    }

    const lessonData = lessonDoc.data() as Lesson
    return lessonData.atoms || []
  } catch (error) {
    console.error('Error fetching atoms:', error)
    return []
  }
}

// ============================================
// CONTENT SEEDING
// ============================================

export async function seedCoursesToFirestore(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = adminDb.batch()

    for (const course of COURSES) {
      const courseRef = adminDb.collection('courses').doc(course.id)
      batch.set(courseRef, {
        ...course,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Seed module for course-3
    const moduleRef = adminDb
      .collection('courses')
      .doc('course-3')
      .collection('modules')
      .doc(COURSE_3_MODULE_1.id)

    batch.set(moduleRef, {
      ...COURSE_3_MODULE_1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await batch.commit()

    return { success: true, message: `Seeded ${COURSES.length} courses and 1 module` }
  } catch (error) {
    console.error('Error seeding content:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// CONTENT STATS
// ============================================

export async function getContentStats(): Promise<{
  totalCourses: number
  totalModules: number
  totalLessons: number
  totalAtoms: number
}> {
  try {
    const coursesSnapshot = await adminDb.collection('courses').get()
    let totalModules = 0
    let totalLessons = 0
    let totalAtoms = 0

    for (const courseDoc of coursesSnapshot.docs) {
      const modulesSnapshot = await courseDoc.ref.collection('modules').get()
      totalModules += modulesSnapshot.size

      for (const moduleDoc of modulesSnapshot.docs) {
        const lessonsSnapshot = await moduleDoc.ref.collection('lessons').get()
        totalLessons += lessonsSnapshot.size

        for (const lessonDoc of lessonsSnapshot.docs) {
          const lessonData = lessonDoc.data() as Lesson
          totalAtoms += lessonData.atoms?.length || 0
        }
      }
    }

    return {
      totalCourses: coursesSnapshot.size || COURSES.length,
      totalModules: totalModules || 1,
      totalLessons,
      totalAtoms,
    }
  } catch (error) {
    console.error('Error getting content stats:', error)
    return {
      totalCourses: COURSES.length,
      totalModules: 1,
      totalLessons: COURSE_3_MODULE_1.lessons.length,
      totalAtoms: COURSE_3_MODULE_1.lessons.reduce((sum, l) => sum + l.atoms.length, 0),
    }
  }
}
