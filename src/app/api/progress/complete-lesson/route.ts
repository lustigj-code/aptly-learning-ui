/**
 * @deprecated Uses legacy `userProgress` collection.
 * Main learning flow uses `/api/progress/sync` instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';

const completeLessonSchema = z.object({
  lessonId: z.string().min(1),
  moduleId: z.string().min(1),
  courseId: z.string().min(1),
});

/**
 * POST /api/progress/complete-lesson
 * Mark a lesson as complete when all required atoms are done
 */
export async function POST(request: NextRequest) {
  try {
    // Get and verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);
    let userId: string;

    try {
      // SECURITY: Verify the Firebase ID token to prevent IDOR attacks
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = completeLessonSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, moduleId, courseId } = validation.data;

    // Get user progress
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();

    if (!userProgressSnap.exists) {
      return NextResponse.json(
        { error: 'User progress not found' },
        { status: 404 }
      );
    }

    const userProgress = userProgressSnap.data();

    if (!userProgress) {
      return NextResponse.json(
        { error: 'User progress data not found' },
        { status: 404 }
      );
    }

    // Get lesson to check required atoms
    let requiredAtoms: string[] = [];
    try {
      const lessonRef = adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .doc(moduleId)
        .collection('lessons')
        .doc(lessonId);

      const lessonSnap = await lessonRef.get();
      if (lessonSnap.exists) {
        const _lessonData = lessonSnap.data();
        // Get all atoms and filter for required ones
        const atomsSnap = await lessonRef.collection('atoms').get();
        requiredAtoms = atomsSnap.docs
          .filter((doc) => doc.data().isRequired !== false)
          .map((doc) => doc.id);
      }
    } catch (error) {
      console.error('Error fetching lesson atoms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lesson data' },
        { status: 500 }
      );
    }

    // Check if all required atoms are completed
    const atomsCompleted = (userProgress.atomsCompleted as string[] | undefined) || [];
    const allRequiredAtomsDone = requiredAtoms.every((atomId) =>
      atomsCompleted.includes(atomId)
    );

    if (!allRequiredAtomsDone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not all required atoms completed',
          completedCount: requiredAtoms.filter((id) =>
            atomsCompleted.includes(id)
          ).length,
          totalRequired: requiredAtoms.length,
        },
        { status: 400 }
      );
    }

    // Mark lesson as complete
    const lessonsCompleted = userProgress.lessonsCompleted || [];
    if (!lessonsCompleted.includes(lessonId)) {
      lessonsCompleted.push(lessonId);
    }

    await userProgressRef.update({
      lessonsCompleted,
      currentLessonId: lessonId,
    });

    // Check if all lessons in module are complete
    let allModuleLessonsCompleted = false;
    let nextModuleId: string | null = null;

    try {
      const moduleRef = adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .doc(moduleId);

      const lessonsSnap = await moduleRef.collection('lessons').get();
      const allLessonIds = lessonsSnap.docs.map((doc) => doc.id);
      allModuleLessonsCompleted = allLessonIds.every((id) =>
        lessonsCompleted.includes(id)
      );

      // If module complete, get next module
      if (allModuleLessonsCompleted) {
        const modulesSnap = await adminDb
          .collection('courses')
          .doc(courseId)
          .collection('modules')
          .orderBy('number')
          .get();

        const allModuleIds = modulesSnap.docs.map((doc) => doc.id);
        const currentModuleIndex = allModuleIds.indexOf(moduleId);
        nextModuleId =
          currentModuleIndex < allModuleIds.length - 1
            ? allModuleIds[currentModuleIndex + 1]
            : null;
      }
    } catch (error) {
      console.error('Error checking module completion:', error);
    }

    // Update module completion if needed
    const coursesCompleted = userProgress.coursesCompleted || [];
    const modulesCompleted = userProgress.modulesCompleted || [];

    if (allModuleLessonsCompleted && !modulesCompleted.includes(moduleId)) {
      modulesCompleted.push(moduleId);

      await userProgressRef.update({
        modulesCompleted,
        currentModuleId: nextModuleId || '',
      });

      // Check if all modules in course are complete
      try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const modulesSnap = await courseRef.collection('modules').get();
        const allCourseModuleIds = modulesSnap.docs.map((doc) => doc.id);

        const allModulesComplete = allCourseModuleIds.every((id) =>
          modulesCompleted.includes(id)
        );

        if (
          allModulesComplete &&
          !coursesCompleted.includes(courseId)
        ) {
          coursesCompleted.push(courseId);
          await userProgressRef.update({
            coursesCompleted,
            currentCourseId: '',
          });

          return NextResponse.json(
            {
              success: true,
              lessonComplete: true,
              moduleComplete: true,
              courseComplete: true,
              message: 'Course completed!',
              celebration: {
                type: 'course-complete',
                message: 'You completed the entire course!',
              },
            },
            { status: 200 }
          );
        }
      } catch (error) {
        console.error('Error checking course completion:', error);
      }

      return NextResponse.json(
        {
          success: true,
          lessonComplete: true,
          moduleComplete: true,
          courseComplete: false,
          nextModuleId,
          message: 'Module completed!',
          celebration: {
            type: 'module-complete',
            message: 'You completed the module!',
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        lessonComplete: true,
        moduleComplete: false,
        courseComplete: false,
        message: 'Lesson completed!',
        celebration: {
          type: 'lesson-complete',
          message: 'You completed the lesson!',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Complete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to complete lesson' },
      { status: 500 }
    );
  }
}
