/**
 * Firestore Security Rules Test Suite
 *
 * Run with: npm run test:rules
 *
 * Tests all security rules defined in firestore.rules
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setLogLevel } from 'firebase/firestore';

// Silence expected rules rejections from logging
setLogLevel('error');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load Firestore rules from file
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  describe('Authentication Required', () => {
    test('Unauthenticated users cannot read any data', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthedDb.collection('users').doc('user1').get());
      await assertFails(unauthedDb.collection('courses').doc('course1').get());
      await assertFails(unauthedDb.collection('userProgress').doc('user1').get());
    });
  });

  describe('Users Collection', () => {
    test('Users can read their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          name: 'Alice',
          email: 'alice@example.com',
          role: 'student',
        });
      });

      await assertSucceeds(alice.collection('users').doc('alice').get());
    });

    test('Users cannot read other users profiles', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('bob').set({
          name: 'Bob',
          email: 'bob@example.com',
          role: 'student',
        });
      });

      await assertFails(alice.collection('users').doc('bob').get());
    });

    test('Users can create their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertSucceeds(
        alice.collection('users').doc('alice').set({
          name: 'Alice',
          email: 'alice@example.com',
          role: 'student',
        })
      );
    });

    test('Users cannot create profiles for other users', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('users').doc('bob').set({
          name: 'Bob',
          email: 'bob@example.com',
          role: 'student',
        })
      );
    });

    test('Users can update their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          name: 'Alice',
          email: 'alice@example.com',
          role: 'student',
        });
      });

      await assertSucceeds(
        alice.collection('users').doc('alice').update({ name: 'Alice Updated' })
      );
    });

    test('Users cannot update other users profiles', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('bob').set({
          name: 'Bob',
          email: 'bob@example.com',
          role: 'student',
        });
      });

      await assertFails(
        alice.collection('users').doc('bob').update({ name: 'Bob Hacked' })
      );
    });
  });

  describe('Courses Collection', () => {
    test('Authenticated users can read courses', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('courses').doc('course1').set({
          title: 'Test Course',
          description: 'A test course',
        });
      });

      await assertSucceeds(alice.collection('courses').doc('course1').get());
    });

    test('Non-admin users cannot create courses', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('courses').doc('course1').set({
          title: 'Unauthorized Course',
        })
      );
    });

    test('Admin users can create courses', async () => {
      const admin = testEnv.authenticatedContext('admin').firestore();
      // First create admin user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('admin').set({
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        });
      });

      await assertSucceeds(
        admin.collection('courses').doc('course1').set({
          title: 'Admin Created Course',
          description: 'Created by admin',
        })
      );
    });

    test('Admin users can update courses', async () => {
      const admin = testEnv.authenticatedContext('admin').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('users').doc('admin').set({
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        });
        await db.collection('courses').doc('course1').set({
          title: 'Test Course',
        });
      });

      await assertSucceeds(
        admin.collection('courses').doc('course1').update({
          title: 'Updated Course',
        })
      );
    });

    test('Non-admin users cannot update courses', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('courses').doc('course1').set({
          title: 'Test Course',
        });
      });

      await assertFails(
        alice.collection('courses').doc('course1').update({
          title: 'Hacked Course',
        })
      );
    });
  });

  describe('User Progress Collection', () => {
    test('Users can read their own progress', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userProgress').doc('alice').set({
          currentCourseId: 'course1',
          totalXP: 100,
        });
      });

      await assertSucceeds(alice.collection('userProgress').doc('alice').get());
    });

    test('Users cannot read other users progress', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userProgress').doc('bob').set({
          currentCourseId: 'course1',
          totalXP: 50,
        });
      });

      await assertFails(alice.collection('userProgress').doc('bob').get());
    });

    test('Users cannot write to their own progress (server-side only)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('userProgress').doc('alice').set({
          currentCourseId: 'course1',
          totalXP: 9999, // Trying to hack XP
        })
      );
    });

    test('Users cannot update their own progress (server-side only)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userProgress').doc('alice').set({
          currentCourseId: 'course1',
          totalXP: 100,
        });
      });

      await assertFails(
        alice.collection('userProgress').doc('alice').update({
          totalXP: 9999, // Trying to hack XP
        })
      );
    });
  });

  describe('Badges Collection', () => {
    test('Authenticated users can read badge definitions', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('badges').doc('badge1').set({
          title: 'First Steps',
          description: 'Complete your first lesson',
        });
      });

      await assertSucceeds(alice.collection('badges').doc('badge1').get());
    });

    test('Non-admin users cannot create badges', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('badges').doc('badge1').set({
          title: 'Fake Badge',
        })
      );
    });

    test('Admin users can create badges', async () => {
      const admin = testEnv.authenticatedContext('admin').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('admin').set({
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        });
      });

      await assertSucceeds(
        admin.collection('badges').doc('badge1').set({
          title: 'Admin Badge',
          description: 'Created by admin',
        })
      );
    });
  });

  describe('User Achievements', () => {
    test('Users can read their own achievements', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userAchievements').doc('alice').set({
          earnedBadges: ['badge1', 'badge2'],
        });
      });

      await assertSucceeds(alice.collection('userAchievements').doc('alice').get());
    });

    test('Users can read other users achievements (public)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userAchievements').doc('bob').set({
          earnedBadges: ['badge1'],
        });
      });

      await assertSucceeds(alice.collection('userAchievements').doc('bob').get());
    });

    test('Users cannot write to achievements (server-side only)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('userAchievements').doc('alice').set({
          earnedBadges: ['all-badges-hacked'],
        })
      );
    });
  });

  describe('Quiz Submissions', () => {
    test('Users can create quiz submissions for themselves', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertSucceeds(
        alice.collection('quizSubmissions').doc('sub1').set({
          userId: 'alice',
          quizId: 'quiz1',
          answers: ['a', 'b', 'c'],
          submittedAt: new Date().toISOString(),
        })
      );
    });

    test('Users cannot create quiz submissions for others', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(
        alice.collection('quizSubmissions').doc('sub1').set({
          userId: 'bob', // Trying to submit as Bob
          quizId: 'quiz1',
          answers: ['a', 'b', 'c'],
          submittedAt: new Date().toISOString(),
        })
      );
    });

    test('Users cannot update quiz submissions (immutable)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('quizSubmissions').doc('sub1').set({
          userId: 'alice',
          quizId: 'quiz1',
          answers: ['a', 'b', 'c'],
        });
      });

      await assertFails(
        alice.collection('quizSubmissions').doc('sub1').update({
          answers: ['d', 'e', 'f'], // Trying to change answers
        })
      );
    });

    test('Non-admin users cannot delete quiz submissions', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('quizSubmissions').doc('sub1').set({
          userId: 'alice',
          quizId: 'quiz1',
          answers: ['a', 'b', 'c'],
        });
      });

      await assertFails(alice.collection('quizSubmissions').doc('sub1').delete());
    });

    test('Admin users can delete quiz submissions', async () => {
      const admin = testEnv.authenticatedContext('admin').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('users').doc('admin').set({
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        });
        await db.collection('quizSubmissions').doc('sub1').set({
          userId: 'alice',
          quizId: 'quiz1',
          answers: ['a', 'b', 'c'],
        });
      });

      await assertSucceeds(admin.collection('quizSubmissions').doc('sub1').delete());
    });
  });

  describe('Learning Notes', () => {
    test('Users can read their own notes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .set({
            content: 'My study notes',
            lessonId: 'lesson1',
          });
      });

      await assertSucceeds(
        alice
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .get()
      );
    });

    test('Users cannot read other users notes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('learningNotes')
          .doc('bob')
          .collection('notes')
          .doc('note1')
          .set({
            content: "Bob's private notes",
            lessonId: 'lesson1',
          });
      });

      await assertFails(
        alice
          .collection('learningNotes')
          .doc('bob')
          .collection('notes')
          .doc('note1')
          .get()
      );
    });

    test('Users can create their own notes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertSucceeds(
        alice
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .set({
            content: 'My new note',
            lessonId: 'lesson1',
            createdAt: new Date().toISOString(),
          })
      );
    });

    test('Users can update their own notes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .set({
            content: 'Original note',
          });
      });

      await assertSucceeds(
        alice
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .update({
            content: 'Updated note',
          })
      );
    });

    test('Users can delete their own notes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .set({
            content: 'Note to delete',
          });
      });

      await assertSucceeds(
        alice
          .collection('learningNotes')
          .doc('alice')
          .collection('notes')
          .doc('note1')
          .delete()
      );
    });
  });

  describe('Default Deny Rule', () => {
    test('Unknown collections are denied', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await assertFails(alice.collection('unknownCollection').doc('doc1').get());
      await assertFails(
        alice.collection('unknownCollection').doc('doc1').set({ data: 'test' })
      );
    });
  });
});
