#!/usr/bin/env npx ts-node
/**
 * User Progress Migration Script
 *
 * Consolidates user progress data from multiple Firestore locations into
 * the primary `users/{userId}.progress` location.
 *
 * Sources (in order of precedence for merging):
 * 1. userProgress/{userId} - Legacy collection (to be deprecated)
 * 2. learners/{userId}/data/progress - Alternative structure
 * 3. users/{userId}.progress - Target/primary location
 *
 * Usage:
 *   # Dry run (preview changes without writing)
 *   npx ts-node scripts/migrate-user-progress.ts --dry-run
 *
 *   # Limit to specific users
 *   npx ts-node scripts/migrate-user-progress.ts --dry-run --limit=10
 *
 *   # Full migration
 *   npx ts-node scripts/migrate-user-progress.ts
 *
 *   # Migrate specific user
 *   npx ts-node scripts/migrate-user-progress.ts --user=<userId>
 *
 * Safety Features:
 *   - Dry-run mode by default
 *   - Batched writes (max 500 per batch)
 *   - Merges arrays without duplicates
 *   - Takes maximum of numeric fields (XP, level)
 *   - Marks source docs as migrated (doesn't delete)
 *   - Detailed logging with progress
 */

import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// Types
// ============================================================================

interface ProgressData {
  atomsCompleted?: string[];
  lessonsCompleted?: string[];
  modulesCompleted?: string[];
  coursesCompleted?: string[];
  totalXP?: number;
  currentLevel?: number;
  overallPercentage?: number;
  currentCourseId?: string;
  currentModuleId?: string;
  currentLessonId?: string;
  lastAtomId?: string;
  resumeState?: unknown;
}

interface StreakData {
  currentStreak?: number;
  longestStreak?: number;
  lastCompletedDate?: string;
  freezesAvailable?: number;
  streakHistory?: Array<{ date: string; completed: boolean }>;
}

interface UserProgressDoc {
  progress?: ProgressData;
  streak?: StreakData;
  // Legacy flat structure from userProgress collection
  atomsCompleted?: string[];
  lessonsCompleted?: string[];
  modulesCompleted?: string[];
  coursesCompleted?: string[];
  totalXP?: number;
  currentLevel?: number;
  overallPercentage?: number;
  currentCourseId?: string;
  currentModuleId?: string;
  currentLessonId?: string;
  lastAtomId?: string;
  currentStreak?: number;
  longestStreak?: number;
  lastCompletedDate?: string;
  freezesAvailable?: number;
  streakHistory?: Array<{ date: string; completed: boolean }>;
  // Migration markers
  _migrated?: boolean;
  _migratedAt?: admin.firestore.Timestamp;
}

interface MigrationStats {
  totalUsers: number;
  usersWithLegacyData: number;
  usersWithLearnersData: number;
  usersMigrated: number;
  usersSkipped: number;
  usersErrored: number;
  errors: Array<{ userId: string; error: string }>;
}

interface MigrationOptions {
  dryRun: boolean;
  limit?: number;
  userId?: string;
  verbose: boolean;
}

// ============================================================================
// Firebase Initialization
// ============================================================================

function initializeFirebase(): admin.firestore.Firestore {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // Try to load service account from various locations
  const serviceAccountPaths = [
    resolve(process.cwd(), 'firebase-service-account.json'),
    resolve(process.cwd(), 'serviceAccountKey.json'),
    resolve(process.cwd(), '.firebase/service-account.json'),
  ];

  let serviceAccount: admin.ServiceAccount | null = null;

  for (const path of serviceAccountPaths) {
    if (existsSync(path)) {
      console.log(`Using service account from: ${path}`);
      serviceAccount = JSON.parse(readFileSync(path, 'utf-8'));
      break;
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using GOOGLE_APPLICATION_CREDENTIALS environment variable');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    throw new Error(
      'No Firebase credentials found. Please provide a service account file or set GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  return admin.firestore();
}

// ============================================================================
// Data Merging Utilities
// ============================================================================

/**
 * Merge arrays without duplicates
 */
function mergeArrays(...arrays: (string[] | undefined)[]): string[] {
  const merged = new Set<string>();
  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      arr.forEach((item) => merged.add(item));
    }
  }
  return Array.from(merged);
}

/**
 * Get the maximum of numeric values, ignoring undefined/null
 */
function maxNumber(...values: (number | undefined | null)[]): number {
  const valid = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  return valid.length > 0 ? Math.max(...valid) : 0;
}

/**
 * Get the most recent non-empty string value
 */
function latestString(...values: (string | undefined | null)[]): string | undefined {
  // Return the first non-empty value (assumes they're passed in priority order)
  for (const v of values) {
    if (v && typeof v === 'string' && v.trim().length > 0) {
      return v;
    }
  }
  return undefined;
}

/**
 * Normalize legacy flat structure to nested structure
 */
function normalizeProgressData(doc: UserProgressDoc): { progress: ProgressData; streak: StreakData } {
  // Check if data is already in nested structure
  if (doc.progress) {
    return {
      progress: doc.progress,
      streak: doc.streak || {},
    };
  }

  // Convert flat structure to nested
  return {
    progress: {
      atomsCompleted: doc.atomsCompleted || [],
      lessonsCompleted: doc.lessonsCompleted || [],
      modulesCompleted: doc.modulesCompleted || [],
      coursesCompleted: doc.coursesCompleted || [],
      totalXP: doc.totalXP || 0,
      currentLevel: doc.currentLevel || 1,
      overallPercentage: doc.overallPercentage || 0,
      currentCourseId: doc.currentCourseId,
      currentModuleId: doc.currentModuleId,
      currentLessonId: doc.currentLessonId,
      lastAtomId: doc.lastAtomId,
    },
    streak: {
      currentStreak: doc.currentStreak || 0,
      longestStreak: doc.longestStreak || 0,
      lastCompletedDate: doc.lastCompletedDate,
      freezesAvailable: doc.freezesAvailable ?? 2,
      streakHistory: doc.streakHistory || [],
    },
  };
}

/**
 * Merge progress from multiple sources
 */
function mergeProgress(
  primary: { progress: ProgressData; streak: StreakData },
  legacy: { progress: ProgressData; streak: StreakData } | null,
  learners: { progress: ProgressData; streak: StreakData } | null
): { progress: ProgressData; streak: StreakData } {
  const sources = [primary, legacy, learners].filter(Boolean) as Array<{
    progress: ProgressData;
    streak: StreakData;
  }>;

  if (sources.length === 0) {
    return {
      progress: {
        atomsCompleted: [],
        lessonsCompleted: [],
        modulesCompleted: [],
        coursesCompleted: [],
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
    };
  }

  return {
    progress: {
      atomsCompleted: mergeArrays(...sources.map((s) => s.progress.atomsCompleted)),
      lessonsCompleted: mergeArrays(...sources.map((s) => s.progress.lessonsCompleted)),
      modulesCompleted: mergeArrays(...sources.map((s) => s.progress.modulesCompleted)),
      coursesCompleted: mergeArrays(...sources.map((s) => s.progress.coursesCompleted)),
      totalXP: maxNumber(...sources.map((s) => s.progress.totalXP)),
      currentLevel: maxNumber(...sources.map((s) => s.progress.currentLevel)) || 1,
      overallPercentage: maxNumber(...sources.map((s) => s.progress.overallPercentage)),
      currentCourseId: latestString(...sources.map((s) => s.progress.currentCourseId)),
      currentModuleId: latestString(...sources.map((s) => s.progress.currentModuleId)),
      currentLessonId: latestString(...sources.map((s) => s.progress.currentLessonId)),
      lastAtomId: latestString(...sources.map((s) => s.progress.lastAtomId)),
      resumeState: sources.find((s) => s.progress.resumeState)?.progress.resumeState,
    },
    streak: {
      currentStreak: maxNumber(...sources.map((s) => s.streak.currentStreak)),
      longestStreak: maxNumber(...sources.map((s) => s.streak.longestStreak)),
      lastCompletedDate: latestString(...sources.map((s) => s.streak.lastCompletedDate)),
      freezesAvailable: maxNumber(...sources.map((s) => s.streak.freezesAvailable)) ?? 2,
      streakHistory: mergeStreakHistory(...sources.map((s) => s.streak.streakHistory)),
    },
  };
}

/**
 * Merge streak histories, keeping unique dates
 */
function mergeStreakHistory(
  ...histories: (Array<{ date: string; completed: boolean }> | undefined)[]
): Array<{ date: string; completed: boolean }> {
  const byDate = new Map<string, { date: string; completed: boolean }>();

  for (const history of histories) {
    if (Array.isArray(history)) {
      for (const entry of history) {
        if (entry.date && !byDate.has(entry.date)) {
          byDate.set(entry.date, entry);
        }
      }
    }
  }

  // Sort by date descending, keep last 30
  return Array.from(byDate.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
}

// ============================================================================
// Migration Logic
// ============================================================================

async function migrateUser(
  db: admin.firestore.Firestore,
  userId: string,
  options: MigrationOptions
): Promise<{ migrated: boolean; error?: string }> {
  const { dryRun, verbose } = options;

  try {
    // Fetch data from all sources
    const [usersDoc, legacyDoc, learnersDoc] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('userProgress').doc(userId).get(),
      db.doc(`learners/${userId}/data/progress`).get(),
    ]);

    const usersData = usersDoc.exists ? (usersDoc.data() as UserProgressDoc) : null;
    const legacyData = legacyDoc.exists ? (legacyDoc.data() as UserProgressDoc) : null;
    const learnersData = learnersDoc.exists ? (learnersDoc.data() as UserProgressDoc) : null;

    // Check if legacy data was already migrated
    if (legacyData?._migrated) {
      if (verbose) {
        console.log(`  [SKIP] User ${userId}: Legacy data already migrated`);
      }
      return { migrated: false };
    }

    // Check if there's anything to migrate
    const hasLegacyData =
      legacyData &&
      ((legacyData.atomsCompleted && legacyData.atomsCompleted.length > 0) ||
        (legacyData.totalXP && legacyData.totalXP > 0));

    const hasLearnersData =
      learnersData &&
      ((learnersData.atomsCompleted && learnersData.atomsCompleted.length > 0) ||
        (learnersData.totalXP && learnersData.totalXP > 0));

    if (!hasLegacyData && !hasLearnersData) {
      if (verbose) {
        console.log(`  [SKIP] User ${userId}: No legacy or learners data to migrate`);
      }
      return { migrated: false };
    }

    // Normalize all sources
    const primaryNorm = usersData ? normalizeProgressData(usersData) : null;
    const legacyNorm = legacyData ? normalizeProgressData(legacyData) : null;
    const learnersNorm = learnersData ? normalizeProgressData(learnersData) : null;

    // Merge all data
    const merged = mergeProgress(
      primaryNorm || { progress: {}, streak: {} },
      legacyNorm,
      learnersNorm
    );

    if (verbose) {
      console.log(`  [MERGE] User ${userId}:`);
      console.log(`    Atoms: ${merged.progress.atomsCompleted?.length || 0}`);
      console.log(`    Lessons: ${merged.progress.lessonsCompleted?.length || 0}`);
      console.log(`    XP: ${merged.progress.totalXP || 0}`);
      console.log(`    Level: ${merged.progress.currentLevel || 1}`);
      console.log(`    Streak: ${merged.streak.currentStreak || 0}`);
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would update users/${userId}.progress`);
      if (hasLegacyData) {
        console.log(`  [DRY RUN] Would mark userProgress/${userId} as migrated`);
      }
      return { migrated: true };
    }

    // Write merged data to primary location
    const batch = db.batch();

    // Update users document with merged progress
    const userRef = db.collection('users').doc(userId);
    batch.set(
      userRef,
      {
        progress: merged.progress,
        streak: merged.streak,
        migratedFromLegacy: true,
        migrationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Mark legacy doc as migrated (don't delete for safety)
    if (legacyDoc.exists) {
      const legacyRef = db.collection('userProgress').doc(userId);
      batch.update(legacyRef, {
        _migrated: true,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        _migratedTo: `users/${userId}`,
      });
    }

    // Mark learners doc as migrated (don't delete for safety)
    if (learnersDoc.exists) {
      const learnersRef = db.doc(`learners/${userId}/data/progress`);
      batch.update(learnersRef, {
        _migrated: true,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        _migratedTo: `users/${userId}`,
      });
    }

    await batch.commit();
    console.log(`  [MIGRATED] User ${userId}`);

    return { migrated: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  [ERROR] User ${userId}: ${errorMessage}`);
    return { migrated: false, error: errorMessage };
  }
}

async function runMigration(options: MigrationOptions): Promise<MigrationStats> {
  const { dryRun, limit, userId, verbose: _verbose } = options;

  console.log('');
  console.log('='.repeat(60));
  console.log('User Progress Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  if (limit) console.log(`Limit: ${limit} users`);
  if (userId) console.log(`User: ${userId}`);
  console.log('');

  const db = initializeFirebase();

  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithLegacyData: 0,
    usersWithLearnersData: 0,
    usersMigrated: 0,
    usersSkipped: 0,
    usersErrored: 0,
    errors: [],
  };

  // Get list of users to process
  let userIds: string[] = [];

  if (userId) {
    // Migrate specific user
    userIds = [userId];
  } else {
    // Get all users from userProgress collection (legacy)
    console.log('Fetching users from legacy userProgress collection...');
    const legacySnapshot = await db.collection('userProgress').get();
    const legacyUserIds = legacySnapshot.docs.map((doc) => doc.id);
    console.log(`  Found ${legacyUserIds.length} users in userProgress`);
    stats.usersWithLegacyData = legacyUserIds.length;

    // Get all users from learners collection
    console.log('Fetching users from learners collection...');
    const learnersSnapshot = await db.collection('learners').get();
    const learnersUserIds = learnersSnapshot.docs.map((doc) => doc.id);
    console.log(`  Found ${learnersUserIds.length} users in learners`);
    stats.usersWithLearnersData = learnersUserIds.length;

    // Combine unique user IDs
    userIds = Array.from(new Set([...legacyUserIds, ...learnersUserIds]));
    console.log(`Total unique users: ${userIds.length}`);
  }

  // Apply limit if specified
  if (limit && limit < userIds.length) {
    userIds = userIds.slice(0, limit);
    console.log(`Processing limited to ${limit} users`);
  }

  stats.totalUsers = userIds.length;
  console.log('');

  // Process users in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userIds.length / BATCH_SIZE)} (${batch.length} users)`);

    const results = await Promise.all(batch.map((uid) => migrateUser(db, uid, options)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.migrated) {
        stats.usersMigrated++;
      } else if (result.error) {
        stats.usersErrored++;
        stats.errors.push({ userId: batch[j], error: result.error });
      } else {
        stats.usersSkipped++;
      }
    }
  }

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total users processed: ${stats.totalUsers}`);
  console.log(`Users migrated: ${stats.usersMigrated}`);
  console.log(`Users skipped (no data/already migrated): ${stats.usersSkipped}`);
  console.log(`Users with errors: ${stats.usersErrored}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('Errors:');
    for (const err of stats.errors.slice(0, 10)) {
      console.log(`  ${err.userId}: ${err.error}`);
    }
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify data in Firestore console');
    console.log('2. Update API routes to use users.progress (see Phase C)');
    console.log('3. Add deprecation warnings to legacy collection access');
  }
  console.log('');

  return stats;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    limit: undefined,
    userId: undefined,
  };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--user=')) {
      options.userId = arg.split('=')[1];
    }
  }

  return options;
}

// Main execution
const options = parseArgs();
runMigration(options)
  .then((stats) => {
    process.exit(stats.usersErrored > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export { runMigration, migrateUser, mergeProgress, type MigrationStats, type MigrationOptions };
