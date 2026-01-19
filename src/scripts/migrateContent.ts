/**
 * Content Migration Script
 *
 * Migrates course data from mockData.ts to Firestore collections.
 * Run with: npx ts-node --esm src/scripts/migrateContent.ts
 *
 * Collections created:
 * - courses/{courseId}
 * - modules/{moduleId}
 * - lessons/{lessonId}
 * - atoms/{atomId}
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import {
  COURSES,
  COURSE_1_MODULE_1,
  COURSE_3_MODULE_1,
  BADGES,
} from '../data/mockData';

// Initialize Firebase Admin if not already initialized
function initializeFirebase() {
  if (getApps().length === 0) {
    // For local development, use service account


    const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
      : null;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Fallback: try to use default credentials
      initializeApp();
    }
  }

  return getFirestore();
}

interface MigrationResult {
  courses: number;
  modules: number;
  lessons: number;
  atoms: number;
  badges: number;
  errors: string[];
}

async function migrateContent(): Promise<MigrationResult> {
  const db = initializeFirebase();
  const batch = db.batch();
  const result: MigrationResult = {
    courses: 0,
    modules: 0,
    lessons: 0,
    atoms: 0,
    badges: 0,
    errors: [],
  };

  console.log('Starting content migration...\n');

  // Collect all modules for migration
  const allModules = [COURSE_1_MODULE_1, COURSE_3_MODULE_1];

  try {
    // 1. Migrate Courses
    console.log('Migrating courses...');
    for (const course of COURSES) {
      const courseRef = db.collection('courses').doc(course.id);

      // Find related modules
      const courseModules = allModules.filter(m => m.courseId === course.id);
      const moduleIds = courseModules.map(m => m.id);

      batch.set(courseRef, {
        id: course.id,
        number: course.number,
        title: course.title,
        description: course.description,
        objectives: course.objectives,
        estimatedHours: course.estimatedHours,
        isLocked: course.isLocked,
        prerequisites: course.prerequisites,
        moduleIds: moduleIds,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      result.courses++;
      console.log(`  - ${course.title}`);
    }

    // 2. Migrate Modules
    console.log('\nMigrating modules...');
    for (const mod of allModules) {
      const moduleRef = db.collection('modules').doc(mod.id);

      // Extract lesson IDs
      const lessonIds = mod.lessons.map(l => l.id);

      batch.set(moduleRef, {
        id: mod.id,
        courseId: mod.courseId,
        number: mod.number,
        title: mod.title,
        objectives: mod.objectives,
        estimatedMinutes: mod.estimatedMinutes,
        isLocked: mod.isLocked,
        lessonIds: lessonIds,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      result.modules++;
      console.log(`  - ${mod.title}`);

      // 3. Migrate Lessons
      for (const lesson of mod.lessons) {
        const lessonRef = db.collection('lessons').doc(lesson.id);

        // Extract atom IDs
        const atomIds = lesson.atoms.map(a => a.id);

        batch.set(lessonRef, {
          id: lesson.id,
          moduleId: lesson.moduleId,
          number: lesson.number,
          title: lesson.title,
          objectives: lesson.objectives,
          estimatedMinutes: lesson.estimatedMinutes,
          isLocked: lesson.isLocked,
          atomIds: atomIds,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        result.lessons++;
        console.log(`    - Lesson: ${lesson.title}`);

        // 4. Migrate Atoms
        for (const atom of lesson.atoms) {
          const atomRef = db.collection('atoms').doc(atom.id);

          batch.set(atomRef, {
            id: atom.id,
            lessonId: atom.lessonId,
            type: atom.type,
            title: atom.title,
            content: atom.content, // Store the entire content object
            estimatedMinutes: atom.estimatedMinutes,
            isRequired: atom.isRequired,
            masteryThreshold: atom.masteryThreshold,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          result.atoms++;
          console.log(`      - Atom: ${atom.title} (${atom.type})`);
        }
      }
    }

    // 5. Migrate Badges
    console.log('\nMigrating badges...');
    for (const badge of BADGES) {
      const badgeRef = db.collection('badges').doc(badge.id);

      batch.set(badgeRef, {
        id: badge.id,
        type: badge.type,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        criteria: badge.criteria,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      result.badges++;
      console.log(`  - ${badge.title}`);
    }

    // Commit the batch
    console.log('\nCommitting changes to Firestore...');
    await batch.commit();

    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('========================================');
    console.log(`Courses migrated: ${result.courses}`);
    console.log(`Modules migrated: ${result.modules}`);
    console.log(`Lessons migrated: ${result.lessons}`);
    console.log(`Atoms migrated: ${result.atoms}`);
    console.log(`Badges migrated: ${result.badges}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);
    console.error('\nMigration failed:', errorMessage);
    throw error;
  }
}

// Validation function to verify migration
async function validateMigration(): Promise<boolean> {
  const db = initializeFirebase();

  console.log('\nValidating migration...');

  try {
    // Check courses
    const coursesSnap = await db.collection('courses').get();
    console.log(`  - Courses in Firestore: ${coursesSnap.size}`);

    // Check modules
    const modulesSnap = await db.collection('modules').get();
    console.log(`  - Modules in Firestore: ${modulesSnap.size}`);

    // Check lessons
    const lessonsSnap = await db.collection('lessons').get();
    console.log(`  - Lessons in Firestore: ${lessonsSnap.size}`);

    // Check atoms
    const atomsSnap = await db.collection('atoms').get();
    console.log(`  - Atoms in Firestore: ${atomsSnap.size}`);

    // Verify a specific course exists
    const course1 = await db.collection('courses').doc('course-1').get();
    if (!course1.exists) {
      console.error('  ERROR: course-1 not found!');
      return false;
    }
    console.log(`  - Verified course-1: ${course1.data()?.title}`);

    // Verify a specific lesson exists
    const lesson1 = await db.collection('lessons').doc('c1-m1-l1').get();
    if (!lesson1.exists) {
      console.error('  ERROR: c1-m1-l1 not found!');
      return false;
    }
    console.log(`  - Verified c1-m1-l1: ${lesson1.data()?.title}`);

    console.log('\nValidation passed!');
    return true;
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate');

  if (validateOnly) {
    await validateMigration();
  } else {
    await migrateContent();
    await validateMigration();
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export { migrateContent, validateMigration };
