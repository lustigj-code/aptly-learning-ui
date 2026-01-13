#!/usr/bin/env npx tsx
/**
 * Seed FSM Course and Reset User Progress
 *
 * Run with: npx tsx src/scripts/seed-and-reset.ts
 * Or with user reset: npx tsx src/scripts/seed-and-reset.ts --reset-user YOUR_USER_ID
 */

import * as admin from 'firebase-admin';
import { FSM_COURSE, FSM_MODULE_1 } from '../data/fsmCourse';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_COURSE_ID = 'fsm-course';

// ============================================
// INITIALIZATION
// ============================================

function initializeFirebase(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_ADMIN_SDK_JSON) {
      let credential: Record<string, unknown>;
      try {
        const decodedJson = Buffer.from(
          process.env.FIREBASE_ADMIN_SDK_JSON,
          'base64'
        ).toString('utf-8');
        credential = JSON.parse(decodedJson) as Record<string, unknown>;
      } catch {
        credential = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON) as Record<string, unknown>;
      }
      admin.initializeApp({
        credential: admin.credential.cert(credential as admin.ServiceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      throw new Error('No Firebase credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_SDK_JSON');
    }
  }

  return admin.firestore();
}

// ============================================
// SEED COURSE
// ============================================

async function seedFSMCourse(db: admin.firestore.Firestore): Promise<void> {
  console.log('\n📚 Seeding FSM Course to Firestore...\n');

  // Create course document
  const courseRef = db.collection('courses').doc(FSM_COURSE.id);
  const courseData = {
    id: FSM_COURSE.id,
    number: FSM_COURSE.number,
    title: FSM_COURSE.title,
    description: FSM_COURSE.description,
    objectives: FSM_COURSE.objectives,
    estimatedHours: FSM_COURSE.estimatedHours,
    isLocked: FSM_COURSE.isLocked,
    prerequisites: FSM_COURSE.prerequisites,
    domain: FSM_COURSE.domain,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await courseRef.set(courseData);
  console.log(`✅ Created course: ${FSM_COURSE.title}`);

  // Create module
  const moduleRef = courseRef.collection('modules').doc(FSM_MODULE_1.id);
  const moduleData = {
    id: FSM_MODULE_1.id,
    courseId: FSM_MODULE_1.courseId,
    number: FSM_MODULE_1.number,
    title: FSM_MODULE_1.title,
    objectives: FSM_MODULE_1.objectives || [],
    estimatedMinutes: FSM_MODULE_1.estimatedMinutes,
    isLocked: FSM_MODULE_1.isLocked,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await moduleRef.set(moduleData);
  console.log(`✅ Created module: ${FSM_MODULE_1.title}`);

  // Create lessons with atoms
  let lessonCount = 0;
  let atomCount = 0;

  for (const lesson of FSM_MODULE_1.lessons || []) {
    const lessonRef = moduleRef.collection('lessons').doc(lesson.id);
    const lessonData = {
      id: lesson.id,
      moduleId: lesson.moduleId,
      number: lesson.number,
      title: lesson.title,
      objectives: lesson.objectives || [],
      estimatedMinutes: lesson.estimatedMinutes,
      isLocked: lesson.isLocked,
      atoms: (lesson.atoms || []).map(atom => ({
        id: atom.id,
        lessonId: atom.lessonId,
        type: atom.type,
        title: atom.title,
        content: atom.content,
        estimatedMinutes: atom.estimatedMinutes,
        isRequired: atom.isRequired,
        masteryThreshold: atom.masteryThreshold,
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await lessonRef.set(lessonData);
    lessonCount++;
    atomCount += lesson.atoms?.length || 0;
    console.log(`  📖 Lesson ${lesson.number}: ${lesson.title} (${lesson.atoms?.length || 0} atoms)`);
  }

  console.log(`\n✅ Seeded FSM course with 1 module, ${lessonCount} lessons, and ${atomCount} atoms\n`);
}

// ============================================
// RESET USER PROGRESS
// ============================================

async function resetUserProgress(db: admin.firestore.Firestore, userId: string): Promise<void> {
  console.log(`\n🔄 Resetting progress for user: ${userId}...\n`);

  const progressRef = db.collection('userProgress').doc(userId);
  const progressDoc = await progressRef.get();

  if (!progressDoc.exists) {
    console.log('⚠️  No existing progress found. Creating new progress document...');
  }

  const resetData = {
    currentCourseId: DEFAULT_COURSE_ID,
    currentModuleId: null,
    currentLessonId: null,
    currentAtomId: null,
    completedCourses: [],
    completedModules: [],
    completedLessons: [],
    completedAtoms: [],
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakFreezes: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    resetAt: admin.firestore.FieldValue.serverTimestamp(),
    resetReason: 'Script reset for FSM course migration',
  };

  await progressRef.set(resetData, { merge: true });
  console.log(`✅ Reset progress. User will start at course: ${DEFAULT_COURSE_ID}\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const resetIndex = args.indexOf('--reset-user');
  const userId = resetIndex >= 0 ? args[resetIndex + 1] : null;

  console.log('='.repeat(50));
  console.log('FSM Course Seeder & Progress Reset');
  console.log('='.repeat(50));

  try {
    const db = initializeFirebase();

    // Always seed the course
    await seedFSMCourse(db);

    // Optionally reset user progress
    if (userId) {
      await resetUserProgress(db, userId);
    } else {
      console.log('💡 To reset user progress, run with: --reset-user YOUR_USER_ID\n');
    }

    console.log('✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
