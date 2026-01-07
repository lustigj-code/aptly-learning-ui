import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import type { Badge } from '../src/types';

/**
 * Seed script for populating initial badge definitions
 * Usage: npx ts-node scripts/seedBadges.ts
 */

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Try to use FIREBASE_ADMIN_SDK_JSON env var
  const adminSdkJson = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (adminSdkJson) {
    const credentials = JSON.parse(Buffer.from(adminSdkJson, 'base64').toString('utf-8'));
    adminApp = initializeApp({
      credential: cert(credentials),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Try to use GOOGLE_APPLICATION_CREDENTIALS file path
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    adminApp = initializeApp({
      credential: cert(credentials),
    });
  } else {
    throw new Error('No Firebase credentials found. Set FIREBASE_ADMIN_SDK_JSON or GOOGLE_APPLICATION_CREDENTIALS');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

const db = getFirestore(adminApp);

// Badge definitions to seed
const badges: Badge[] = [
  // Special badges
  {
    id: 'first-steps',
    type: 'special',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '👣',
    rarity: 'common',
    criteria: {
      type: 'completion',
      threshold: 1,
      relatedEntityId: 'lesson-intro-1',
    },
  },
  {
    id: 'course-champion',
    type: 'milestone',
    title: 'Course Champion',
    description: 'Complete an entire course',
    icon: '🏆',
    rarity: 'uncommon',
    criteria: {
      type: 'completion',
      threshold: 1,
      relatedEntityId: 'course-1',
    },
  },

  // Streak badges
  {
    id: 'week-warrior',
    type: 'streak',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    rarity: 'uncommon',
    criteria: {
      type: 'streak',
      threshold: 7,
    },
  },
  {
    id: 'month-master',
    type: 'streak',
    title: 'Month Master',
    description: 'Maintain a 30-day learning streak',
    icon: '🌟',
    rarity: 'rare',
    criteria: {
      type: 'streak',
      threshold: 30,
    },
  },
  {
    id: 'century-champion',
    type: 'streak',
    title: 'Century Champion',
    description: 'Maintain a 100-day learning streak',
    icon: '💎',
    rarity: 'legendary',
    criteria: {
      type: 'streak',
      threshold: 100,
    },
  },

  // Score badges
  {
    id: 'perfect-score',
    type: 'skill',
    title: 'Perfect Score',
    description: 'Achieve 100% on a quiz',
    icon: '💯',
    rarity: 'rare',
    criteria: {
      type: 'score',
      threshold: 100,
    },
  },
  {
    id: 'straight-a-student',
    type: 'skill',
    title: 'Straight A Student',
    description: 'Achieve 90%+ on multiple quizzes',
    icon: '🎓',
    rarity: 'uncommon',
    criteria: {
      type: 'score',
      threshold: 90,
    },
  },

  // Time badges
  {
    id: 'devoted-learner',
    type: 'milestone',
    title: 'Devoted Learner',
    description: 'Spend 5 hours learning',
    icon: '📚',
    rarity: 'common',
    criteria: {
      type: 'time',
      threshold: 5,
    },
  },
  {
    id: 'studious',
    type: 'milestone',
    title: 'Studious',
    description: 'Spend 10 hours learning',
    icon: '📖',
    rarity: 'uncommon',
    criteria: {
      type: 'time',
      threshold: 10,
    },
  },
  {
    id: 'scholar',
    type: 'milestone',
    title: 'Scholar',
    description: 'Spend 50 hours learning',
    icon: '🧠',
    rarity: 'rare',
    criteria: {
      type: 'time',
      threshold: 50,
    },
  },
  {
    id: 'lifelong-learner',
    type: 'milestone',
    title: 'Lifelong Learner',
    description: 'Spend 100 hours learning',
    icon: '🚀',
    rarity: 'legendary',
    criteria: {
      type: 'time',
      threshold: 100,
    },
  },

  // Completion badges
  {
    id: 'module-master',
    type: 'milestone',
    title: 'Module Master',
    description: 'Complete a full module',
    icon: '✨',
    rarity: 'common',
    criteria: {
      type: 'completion',
      threshold: 1,
      relatedEntityId: 'module-1',
    },
  },
];

async function seedBadges(): Promise<void> {
  console.log('Starting badge seeding...');

  try {
    let addedCount = 0;
    let skippedCount = 0;

    for (const badge of badges) {
      const badgeRef = db.collection('badges').doc(badge.id);
      const existingBadge = await badgeRef.get();

      if (existingBadge.exists) {
        console.log(`⚠️  Badge '${badge.id}' already exists, skipping...`);
        skippedCount++;
        continue;
      }

      await badgeRef.set({
        ...badge,
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
      });

      console.log(`✅ Created badge: ${badge.title} (${badge.id})`);
      addedCount++;
    }

    console.log(`\nSeeding complete!`);
    console.log(`Added: ${addedCount} badges`);
    console.log(`Skipped: ${skippedCount} badges`);
    console.log(`Total: ${badges.length} badges`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding badges:', error);
    process.exit(1);
  }
}

// Run the seeding
seedBadges();
