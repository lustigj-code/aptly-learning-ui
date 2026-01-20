/**
 * Progress Sync API
 *
 * Handles progress sync from CoachLearningView component.
 * Supports offline sync queue and real-time updates.
 *
 * Types handled:
 * - atom_complete: Mark an atom as completed
 * - quiz_result: Record quiz score and mark atom complete
 * - lesson_complete: Mark a lesson as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateAtomXP, calculateLevel } from '@/lib/utils/xpCalculator';
import { COURSES } from '@/data/mockData';
import type { Module, Course, Lesson } from '@/types';
import { CONTENT, QUIZ } from '@/config/constants';

const { serverTimestamp, arrayUnion } = FieldValue;

/**
 * Extract module and lesson IDs from an atom ID
 * Atom IDs follow pattern: c{courseNum}-m{moduleNum}-l{lessonNum}-a{atomNum}
 */
function extractIdsFromAtom(atomId: string): {
  moduleId: string;
  lessonId: string;
  courseId: string;
} | null {
  // atomId format: c1-m1-l1-a1
  const match = atomId.match(/^(c\d+)-(m\d+)-(l\d+)-a\d+$/);
  if (!match) return null;

  const coursePrefix = match[1]; // c1
  const modulePrefix = match[2]; // m1
  const lessonPrefix = match[3]; // l1

  return {
    courseId: `course-${coursePrefix.slice(1)}`, // course-1
    moduleId: `${coursePrefix}-${modulePrefix}`, // c1-m1
    lessonId: `${coursePrefix}-${modulePrefix}-${lessonPrefix}`, // c1-m1-l1
  };
}

/**
 * Get total atom count from course data for percentage calculation
 */
function getTotalAtomCount(): number {
  let total = 0;
  for (const course of COURSES) {
    if (course.modules) {
      for (const mod of course.modules) {
        if (mod.lessons) {
          for (const lesson of mod.lessons) {
            total += lesson.atoms?.length || 0;
          }
        }
      }
    }
  }
  // Fallback if course data isn't fully populated
  return total > 0 ? total : 150;
}

/**
 * Find the module and course a lesson belongs to
 * Lesson IDs follow pattern: c{courseNum}-m{moduleNum}-l{lessonNum}
 */
function findLessonContext(lessonId: string): {
  course: Course;
  lessonModule: Module;
  allLessonIds: string[];
} | null {
  // Parse lesson ID to find course number
  const match = lessonId.match(/^c(\d+)-m(\d+)-/);
  if (!match) return null;

  const courseNum = parseInt(match[1]);
  const moduleNum = parseInt(match[2]);

  // Find course
  const course = COURSES.find(c => c.number === courseNum);
  if (!course || !course.modules) return null;

  // Find module
  const lessonModule = course.modules.find(m => m.number === moduleNum);
  if (!lessonModule || !lessonModule.lessons) return null;

  // Get all lesson IDs in this module
  const allLessonIds = lessonModule.lessons.map((l: Lesson) => l.id);

  return { course, lessonModule, allLessonIds };
}

type SyncPayload = {
  type: 'atom_complete' | 'quiz_result' | 'lesson_complete';
  atomId?: string;
  lessonId?: string;
  courseId?: string;
  quizScore?: number;
  timestamp?: number;
};

export async function POST(request: NextRequest) {
  try {
    // Verify authentication via session cookie
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = auth.user.uid;
    const body: SyncPayload = await request.json();
    const { type, atomId, lessonId, courseId: _courseId, quizScore } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Missing type field' },
        { status: 400 }
      );
    }

    // Get or create user progress document
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      // Create initial user document if missing
      await userRef.set({
        createdAt: serverTimestamp(),
        progress: {
          lessonsCompleted: [],
          atomsCompleted: [],
          totalXP: 0,
          currentLevel: 1,
          overallPercentage: 0,
        },
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          freezesAvailable: 2,
          streakHistory: [],
        },
      });
    }

    const userData = userSnap.data() || {};
    const progress = userData.progress || {};
    const streak = userData.streak || { currentStreak: 0, longestStreak: 0 };

    // Handle based on type
    switch (type) {
      case 'atom_complete':
      case 'quiz_result': {
        if (!atomId) {
          return NextResponse.json(
            { error: 'Missing atomId for atom completion' },
            { status: 400 }
          );
        }

        // Check if already completed
        const atomsCompleted = progress.atomsCompleted || [];
        if (atomsCompleted.includes(atomId)) {
          return NextResponse.json({
            success: true,
            message: 'Already completed',
            xpEarned: 0,
          });
        }

        // Calculate XP
        const atomType = type === 'quiz_result' ? 'quiz' : 'video';
        const xpEarned = calculateAtomXP(atomType, streak.currentStreak || 0, quizScore);
        const currentTotalXP = progress.totalXP || 0;
        const newTotalXP = currentTotalXP + xpEarned;
        const levelInfo = calculateLevel(newTotalXP);

        // Calculate overall percentage based on atoms completed
        const totalAtoms = getTotalAtomCount();
        const newAtomsCount = atomsCompleted.length + 1;
        const overallPercentage = Math.round((newAtomsCount / totalAtoms) * 100);

        // Extract module and lesson IDs from atom ID
        const atomContext = extractIdsFromAtom(atomId);

        // Build update object
        const updateData: Record<string, unknown> = {
          'progress.atomsCompleted': arrayUnion(atomId),
          'progress.totalXP': newTotalXP,
          'progress.currentLevel': levelInfo.level,
          'progress.xp': newTotalXP,
          'progress.lastAtomId': atomId,
          'progress.overallPercentage': overallPercentage,
          lastActiveAt: serverTimestamp(),
        };

        // Add current position tracking if we can extract IDs
        if (atomContext) {
          updateData['progress.currentModuleId'] = atomContext.moduleId;
          updateData['progress.currentLessonId'] = atomContext.lessonId;
          updateData['progress.currentCourseId'] = atomContext.courseId;
        }

        // Update progress
        await userRef.update(updateData);

        // Update streak
        await updateStreak(userId, userRef);

        // Log interaction for progress tracking
        await logInteraction(userId, atomId, quizScore);

        return NextResponse.json({
          success: true,
          xpEarned,
          newLevel: levelInfo.level,
          overallPercentage,
          message: `Earned ${xpEarned} XP`,
        });
      }

      case 'lesson_complete': {
        if (!lessonId) {
          return NextResponse.json(
            { error: 'Missing lessonId for lesson completion' },
            { status: 400 }
          );
        }

        // Check if already completed
        const lessonsCompleted = progress.lessonsCompleted || [];
        if (lessonsCompleted.includes(lessonId)) {
          return NextResponse.json({
            success: true,
            message: 'Already completed',
          });
        }

        // Calculate new overall percentage (rough estimate)
        const newLessonsCount = lessonsCompleted.length + 1;
        const overallPercentage = Math.round((newLessonsCount / CONTENT.TOTAL_LESSONS) * 100);

        // Extract module ID from lesson ID (c1-m1-l1 → c1-m1)
        const lessonParts = lessonId.match(/^(c\d+-m\d+)-l\d+$/);
        const moduleIdFromLesson = lessonParts ? lessonParts[1] : null;
        const courseIdFromLesson = lessonParts ? `course-${lessonParts[1].split('-')[0].slice(1)}` : null;

        // Build update object
        const lessonUpdateData: Record<string, unknown> = {
          'progress.lessonsCompleted': arrayUnion(lessonId),
          'progress.overallPercentage': overallPercentage,
          'progress.currentLessonId': lessonId,
          'progress.lastAtomId': null, // Clear so next visit doesn't go to last quiz
          lastActiveAt: serverTimestamp(),
        };

        // Add module/course tracking
        if (moduleIdFromLesson) {
          lessonUpdateData['progress.currentModuleId'] = moduleIdFromLesson;
        }
        if (courseIdFromLesson) {
          lessonUpdateData['progress.currentCourseId'] = courseIdFromLesson;
        }

        // Update progress
        await userRef.update(lessonUpdateData);

        // Check for module and course completion
        const context = findLessonContext(lessonId);
        if (context) {
          const { course, lessonModule, allLessonIds } = context;
          const updatedLessons = [...lessonsCompleted, lessonId];
          const modulesCompleted = progress.modulesCompleted || [];

          // Check if all lessons in module are now complete
          const moduleComplete = allLessonIds.every(id => updatedLessons.includes(id));

          if (moduleComplete && !modulesCompleted.includes(lessonModule.id)) {
            await userRef.update({
              'progress.modulesCompleted': arrayUnion(lessonModule.id),
            });
            // Log completion without exposing user ID
            console.log(`[Progress Sync] Module ${lessonModule.id} completed`);

            // Check if all modules in course are complete
            const updatedModulesCompleted = [...modulesCompleted, lessonModule.id];
            const allModuleIds = course.modules.map(m => m.id);
            const courseComplete = allModuleIds.every(id => updatedModulesCompleted.includes(id));

            if (courseComplete) {
              const coursesCompleted = progress.coursesCompleted || [];
              if (!coursesCompleted.includes(course.id)) {
                await userRef.update({
                  'progress.coursesCompleted': arrayUnion(course.id),
                });
                // Log completion without exposing user ID
                console.log(`[Progress Sync] Course ${course.id} completed`);
              }
            }
          }
        }

        // Update streak
        await updateStreak(userId, userRef);

        return NextResponse.json({
          success: true,
          lessonsCompleted: newLessonsCount,
          overallPercentage,
          message: 'Lesson completed',
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Progress Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync progress' },
      { status: 500 }
    );
  }
}

/**
 * Update user's streak on activity
 * Wrapped in transaction to prevent race conditions
 */
async function updateStreak(
  _userId: string,
  userRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data() || {};
    const streak = userData.streak || {
      currentStreak: 0,
      longestStreak: 0,
      freezesAvailable: 2,
      streakHistory: [],
    };

    const lastDate = streak.lastCompletedDate || '';

    // If already completed today, don't update
    if (lastDate === today) {
      return;
    }

    let newStreak = streak.currentStreak || 0;

    if (lastDate === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak++;
    } else if (lastDate && lastDate !== today) {
      // Gap in activity - reset streak
      newStreak = 1;
    } else {
      // First activity
      newStreak = 1;
    }

    const longestStreak = Math.max(streak.longestStreak || 0, newStreak);

    // Update streak history
    const streakHistory = streak.streakHistory || [];
    streakHistory.push({ date: today, completed: true });
    // Keep last 30 days
    const recentHistory = streakHistory.slice(-30);

    transaction.update(userRef, {
      'streak.currentStreak': newStreak,
      'streak.longestStreak': longestStreak,
      'streak.lastCompletedDate': today,
      'streak.streakHistory': recentHistory,
    });
  });
}

/**
 * Log interaction for progress history
 */
async function logInteraction(
  userId: string,
  atomId: string,
  score?: number
): Promise<void> {
  try {
    await adminDb.collection('interactions').add({
      userId,
      atomId,
      timestamp: serverTimestamp(),
      isCorrect: score !== undefined ? score >= QUIZ.DEFAULT_PASSING_SCORE : true,
      pMasteryBefore: 0.5,
      pMasteryAfter: score !== undefined ? score / 100 : 0.7,
    });
  } catch (error) {
    console.error('[Progress Sync] Error logging interaction:', error);
    // Don't fail the request for logging errors
  }
}
