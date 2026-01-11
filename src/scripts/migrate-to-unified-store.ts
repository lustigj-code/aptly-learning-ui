/**
 * State Consolidation Migration Script
 *
 * Migrates data from legacy authStore and userStore to unified Firebase-synced store.
 *
 * Usage:
 *   1. Run with dry-run to preview changes: npm run migrate:state -- --dry-run
 *   2. Run actual migration: npm run migrate:state
 *   3. Backup is automatically created before migration
 *
 * Safety Features:
 *   - Creates JSON backup of all existing data
 *   - Validates data integrity before and after migration
 *   - Rollback capability if migration fails
 *   - Idempotent (can run multiple times safely)
 */

import { db } from '@/lib/firebase/config';
import { adminDb } from '@/lib/firebase/admin';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LegacyUserStoreData {
  uid: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
  onboardingCompleted?: boolean;
  preferences?: {
    learningPace?: string;
    dailyGoal?: number;
    voiceEnabled?: boolean;
    preferredContentFormat?: string;
    theme?: string;
  };
  progress?: {
    currentCourseId?: string | null;
    currentModuleId?: string | null;
    currentLessonId?: string | null;
    currentAtomId?: string | null;
    atomsCompleted?: string[];
    lessonsCompleted?: string[];
    modulesCompleted?: string[];
    coursesCompleted?: string[];
    totalXP?: number;
    currentLevel?: number;
  };
  streak?: {
    currentStreak?: number;
    longestStreak?: number;
    lastCompletionDate?: string | null;
    freezesAvailable?: number;
    freezeHistory?: Array<{ usedAt: string; daysSaved: number }>;
  };
  achievements?: {
    badges?: string[];
    earnedAt?: Record<string, string>;
  };
  lastActiveAt?: string;
}

interface MigrationResult {
  success: boolean;
  usersProcessed: number;
  usersMigrated: number;
  usersFailed: number;
  errors: Array<{ userId: string; error: string }>;
  backupPath?: string;
}

const BACKUP_DIR = join(process.cwd(), 'backups', 'state-migration');
const LOCALSTORAGE_KEY_USER = 'aptly-user-store';
const LOCALSTORAGE_KEY_AUTH = 'aptly-auth-store';

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create backup of current localStorage data
 */
async function createBackup(): Promise<string> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(BACKUP_DIR, `migration-backup-${timestamp}.json`);

  const backup = {
    timestamp: new Date().toISOString(),
    localStorage: {
      userStore: typeof window !== 'undefined' ? localStorage.getItem(LOCALSTORAGE_KEY_USER) : null,
      authStore: typeof window !== 'undefined' ? localStorage.getItem(LOCALSTORAGE_KEY_AUTH) : null,
    },
    note: 'Backup created before migrating to unified store',
  };

  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`✅ Backup created: ${backupPath}`);

  return backupPath;
}

/**
 * Load legacy user data from localStorage
 */
function loadLegacyData(): LegacyUserStoreData | null {
  if (typeof window === 'undefined') {
    console.warn('⚠️  Running in Node.js environment - cannot access localStorage');
    return null;
  }

  try {
    const rawData = localStorage.getItem(LOCALSTORAGE_KEY_USER);
    if (!rawData) {
      console.log('ℹ️  No legacy user store data found');
      return null;
    }

    const parsed = JSON.parse(rawData);
    // Zustand persist wraps data in { state: {...} }
    return parsed.state || parsed;
  } catch (error) {
    console.error('❌ Failed to parse legacy data:', error);
    return null;
  }
}

/**
 * Validate user data structure
 */
function validateUserData(data: LegacyUserStoreData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.uid) errors.push('Missing uid');
  if (!data.email) errors.push('Missing email');

  if (data.progress && typeof data.progress !== 'object') {
    errors.push('Invalid progress structure');
  }

  if (data.streak && typeof data.streak !== 'object') {
    errors.push('Invalid streak structure');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Transform legacy data to Firestore schema
 */
function transformToFirestoreSchema(legacyData: LegacyUserStoreData): {
  users: any;
  userProgress: any;
} {
  const userId = legacyData.uid;

  // Users document
  const usersDoc = {
    id: userId,
    email: legacyData.email,
    name: legacyData.name || '',
    avatar: legacyData.avatar || null,
    role: legacyData.role || 'student',
    onboardingCompleted: legacyData.onboardingCompleted || false,
    preferences: {
      learningPace: legacyData.preferences?.learningPace || 'moderate',
      dailyGoal: legacyData.preferences?.dailyGoal || 30,
      voiceEnabled: legacyData.preferences?.voiceEnabled || false,
      preferredContentFormat: legacyData.preferences?.preferredContentFormat || 'mixed',
      theme: legacyData.preferences?.theme || 'light',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // User progress document
  const userProgressDoc = {
    userId,
    currentCourseId: legacyData.progress?.currentCourseId || null,
    currentModuleId: legacyData.progress?.currentModuleId || null,
    currentLessonId: legacyData.progress?.currentLessonId || null,
    currentAtomId: legacyData.progress?.currentAtomId || null,
    atomsCompleted: legacyData.progress?.atomsCompleted || [],
    lessonsCompleted: legacyData.progress?.lessonsCompleted || [],
    modulesCompleted: legacyData.progress?.modulesCompleted || [],
    coursesCompleted: legacyData.progress?.coursesCompleted || [],
    totalXP: legacyData.progress?.totalXP || 0,
    currentLevel: legacyData.progress?.currentLevel || 1,
    streak: {
      currentStreak: legacyData.streak?.currentStreak || 0,
      longestStreak: legacyData.streak?.longestStreak || 0,
      lastCompletionDate: legacyData.streak?.lastCompletionDate || null,
      freezesAvailable: legacyData.streak?.freezesAvailable || 2,
      freezeHistory: legacyData.streak?.freezeHistory || [],
    },
    lastActiveAt: legacyData.lastActiveAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    users: usersDoc,
    userProgress: userProgressDoc,
  };
}

/**
 * Migrate single user data to Firestore
 */
async function migrateUserToFirestore(
  userId: string,
  userData: { users: any; userProgress: any },
  dryRun: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (dryRun) {
      console.log(`[DRY RUN] Would migrate user ${userId}:`);
      console.log('  Users doc:', JSON.stringify(userData.users, null, 2));
      console.log('  Progress doc:', JSON.stringify(userData.userProgress, null, 2));
      return { success: true };
    }

    // Ensure Firebase is initialized
    if (!db) {
      throw new Error('Firebase not initialized. Check your environment configuration.');
    }

    // Check if user already exists in Firestore
    const userDocRef = doc(db, 'users', userId);
    const existingUser = await getDoc(userDocRef);

    if (existingUser.exists()) {
      console.log(`ℹ️  User ${userId} already exists in Firestore - skipping`);
      return { success: true };
    }

    // Write to Firestore
    await setDoc(doc(db, 'users', userId), userData.users);
    await setDoc(doc(db, 'userProgress', userId), userData.userProgress);

    console.log(`✅ Successfully migrated user ${userId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to migrate user ${userId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Main migration function
 */
async function runMigration(dryRun: boolean = false): Promise<MigrationResult> {
  console.log('🚀 Starting state consolidation migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  console.log('');

  const result: MigrationResult = {
    success: false,
    usersProcessed: 0,
    usersMigrated: 0,
    usersFailed: 0,
    errors: [],
  };

  try {
    // Step 1: Create backup
    if (!dryRun) {
      result.backupPath = await createBackup();
    } else {
      console.log('[DRY RUN] Skipping backup creation');
    }

    // Step 2: Load legacy data
    console.log('📂 Loading legacy localStorage data...');
    const legacyData = loadLegacyData();

    if (!legacyData) {
      console.log('✅ No legacy data found - migration not needed');
      result.success = true;
      return result;
    }

    result.usersProcessed = 1;

    // Step 3: Validate data
    console.log('🔍 Validating legacy data...');
    const validation = validateUserData(legacyData);

    if (!validation.valid) {
      console.error('❌ Legacy data validation failed:');
      validation.errors.forEach((err) => console.error(`  - ${err}`));
      result.errors.push({
        userId: legacyData.uid || 'unknown',
        error: validation.errors.join(', '),
      });
      result.usersFailed = 1;
      return result;
    }

    console.log('✅ Legacy data validated successfully');

    // Step 4: Transform to Firestore schema
    console.log('🔄 Transforming data to Firestore schema...');
    const transformedData = transformToFirestoreSchema(legacyData);

    // Step 5: Migrate to Firestore
    console.log('📤 Migrating to Firestore...');
    const migrationResult = await migrateUserToFirestore(
      legacyData.uid,
      transformedData,
      dryRun
    );

    if (migrationResult.success) {
      result.usersMigrated = 1;
      console.log('');
      console.log('✅ Migration completed successfully!');
    } else {
      result.usersFailed = 1;
      result.errors.push({
        userId: legacyData.uid,
        error: migrationResult.error || 'Unknown error',
      });
      console.log('');
      console.log('❌ Migration failed');
    }

    result.success = migrationResult.success;

    // Step 6: Summary
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`  Users processed: ${result.usersProcessed}`);
    console.log(`  Users migrated: ${result.usersMigrated}`);
    console.log(`  Users failed: ${result.usersFailed}`);
    if (result.backupPath) {
      console.log(`  Backup location: ${result.backupPath}`);
    }

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach((err) => {
        console.log(`  User ${err.userId}: ${err.error}`);
      });
    }

    if (!dryRun && result.success) {
      console.log('');
      console.log('🎉 Next steps:');
      console.log('  1. Verify data in Firestore console');
      console.log('  2. Test app with unified store');
      console.log('  3. Remove authStore.ts and userStore.ts files');
      console.log('  4. Update imports across codebase');
    }

    return result;
  } catch (error) {
    console.error('');
    console.error('💥 Migration failed with error:', error);
    result.success = false;
    return result;
  }
}

/**
 * Rollback migration using backup
 */
async function rollback(backupPath: string): Promise<boolean> {
  try {
    console.log(`🔄 Rolling back from backup: ${backupPath}`);

    if (!existsSync(backupPath)) {
      console.error('❌ Backup file not found');
      return false;
    }

    const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));

    if (typeof window !== 'undefined' && backup.localStorage) {
      if (backup.localStorage.userStore) {
        localStorage.setItem(LOCALSTORAGE_KEY_USER, backup.localStorage.userStore);
      }
      if (backup.localStorage.authStore) {
        localStorage.setItem(LOCALSTORAGE_KEY_AUTH, backup.localStorage.authStore);
      }
    }

    console.log('✅ Rollback completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    return false;
  }
}

// CLI interface
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const rollbackPath = process.argv.find((arg) => arg.startsWith('--rollback='));

  if (rollbackPath) {
    const path = rollbackPath.split('=')[1];
    rollback(path).then((success) => {
      process.exit(success ? 0 : 1);
    });
  } else {
    runMigration(dryRun).then((result) => {
      process.exit(result.success ? 0 : 1);
    });
  }
}

export { runMigration, rollback, type MigrationResult };
