/**
 * Progress Report API
 *
 * Returns complete progress data for export/visualization
 *
 * Part of Phase: Progress & Mastery Visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import type { ProgressReportData } from '@/components/progress/ExportProgressReport';
import { COURSES } from '@/data/mockData';

// Calculate total lessons from actual course data
function getTotalLessons(): number {
  let total = 0;
  for (const course of COURSES) {
    for (const mod of course.modules) {
      total += mod.lessons.length;
    }
  }
  // If modules not fully populated in COURSES, use estimate based on course structure
  return total > 0 ? total : 47;
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedUserId = searchParams.get('userId');

  if (!requestedUserId) {
    return NextResponse.json(
      { error: 'userId query param required' },
      { status: 400 }
    );
  }

  // IDOR Protection: Users can only access their own data
  if (requestedUserId !== authenticatedUserId) {
    return NextResponse.json(
      { error: 'Cannot access other users data' },
      { status: 403 }
    );
  }

  const userId = authenticatedUserId;

  try {
    // Fetch user document
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const userProgress = userData.progress || {};
    const userStreak = userData.streak || {};

    // Social Media Marketing skill definitions
    const SMM_SKILLS: Record<string, string> = {
      'smm-fundamentals': 'Social Media Fundamentals',
      'platform-overview': 'Platform Overview',
      'campaign-objectives': 'Campaign Objectives',
      'campaign-structure': 'Campaign Structure',
      'social-strategy': 'Social Strategy',
      'content-creation': 'Content Creation',
      'meta-ads': 'Meta Advertising',
      'analytics': 'Analytics & Reporting',
      'audience-targeting': 'Audience Targeting',
    };

    // Fetch skill mastery from reviewQueue (where complete-atom writes data)
    const reviewQueueRef = adminDb.collection('reviewQueue').doc(userId).collection('items');
    const reviewQueueSnap = await reviewQueueRef.get();

    const skillStates: Record<string, {
      skillId: string;
      skillName: string;
      pMastery: number;
      lastAttempt?: Date;
    }> = {};

    reviewQueueSnap.forEach(doc => {
      const data = doc.data();
      const conceptId = doc.id;
      // Convert masteryLevel (0-100) to pMastery (0-1)
      const masteryLevel = data.masteryLevel ?? 0;
      skillStates[conceptId] = {
        skillId: conceptId,
        skillName: SMM_SKILLS[conceptId] || conceptId,
        pMastery: masteryLevel / 100,
        lastAttempt: data.lastReviewedAt?.toDate(),
      };
    });

    // Fallback: Also read from user progress document if reviewQueue is empty
    if (Object.keys(skillStates).length === 0) {
      // Use lessons completed as proxy for skill mastery
      const lessonsCompleted = userProgress.lessonsCompleted || [];
      const _overallMastery = userProgress.overallPercentage ? userProgress.overallPercentage / 100 : 0;

      // If user has made progress, estimate skill mastery based on completed lessons
      if (lessonsCompleted.length > 0) {
        // Map lesson IDs to skills (simplified - assume each lesson maps to a skill)
        const skillFromLesson: Record<string, string> = {
          'c1-m1-l1': 'smm-fundamentals',
          'c1-m1-l2': 'platform-overview',
          'c1-m1-l3': 'campaign-objectives',
          'c1-m2-l1': 'campaign-structure',
          'c1-m2-l2': 'social-strategy',
          'c1-m2-l3': 'content-creation',
          'c1-m3-l1': 'meta-ads',
          'c1-m3-l2': 'analytics',
          'c1-m3-l3': 'audience-targeting',
        };

        for (const lessonId of lessonsCompleted) {
          const skillId = skillFromLesson[lessonId];
          if (skillId && !skillStates[skillId]) {
            skillStates[skillId] = {
              skillId,
              skillName: SMM_SKILLS[skillId] || skillId,
              pMastery: 0.7, // Assume 70% mastery for completed lessons
              lastAttempt: undefined,
            };
          }
        }
      }
    }

    // Calculate skill categories
    const skills = Object.values(skillStates);
    const masteredSkills = skills.filter(s => s.pMastery >= 0.95);
    const inProgressSkills = skills.filter(s => s.pMastery > 0 && s.pMastery < 0.95);

    // Find not started skills from our defined skill map
    const allSkillIds = Object.keys(SMM_SKILLS);
    const notStartedSkillIds = allSkillIds.filter(id => !skillStates[id] || skillStates[id].pMastery === 0);

    // Fetch interaction logs for prediction accuracy
    const interactionsRef = adminDb
      .collection('interactions')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(100);
    const interactionsSnap = await interactionsRef.get();

    // Note: prediction accuracy tracking is available but not currently displayed in UI
    // interactionsSnap data is used for building mastery history below

    // Fetch recent activity (wrapped in try-catch - index may not exist)
    const recentActivity: Array<{
      date: string;
      description: string;
      xpEarned: number;
    }> = [];

    try {
      const activityRef = adminDb
        .collection('activityLogs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(10);
      const activitySnap = await activityRef.get();

      activitySnap.forEach(doc => {
        const data = doc.data();
        recentActivity.push({
          date: data.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
          description: data.description || 'Activity logged',
          xpEarned: data.xpEarned || 0,
        });
      });
    } catch {
      // Index may not exist - continue with fallback
    }

    // If no activity logs, use completed lessons as fallback
    if (recentActivity.length === 0 && userProgress.lessonsCompleted?.length) {
      userProgress.lessonsCompleted.slice(-10).forEach((lessonId: string, i: number) => {
        recentActivity.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          description: `Completed lesson: ${lessonId}`,
          xpEarned: 25,
        });
      });
    }

    // Calculate average mastery
    const avgMastery = skills.length > 0
      ? skills.reduce((sum, s) => sum + s.pMastery, 0) / skills.length
      : 0;

    // Calculate estimated completion date based on learning velocity
    const learningVelocity = 0.02; // 2% mastery per day average
    const remainingMastery = inProgressSkills.reduce((sum, s) => sum + (0.95 - s.pMastery), 0);
    const estimatedDays = learningVelocity > 0 ? Math.ceil(remainingMastery / learningVelocity) : 30;
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDays);

    // Calculate readiness level
    let readinessLevel: 'not_ready' | 'almost_ready' | 'ready' | 'highly_ready' = 'not_ready';
    if (avgMastery >= 0.9) {
      readinessLevel = 'highly_ready';
    } else if (avgMastery >= 0.75) {
      readinessLevel = 'ready';
    } else if (avgMastery >= 0.6) {
      readinessLevel = 'almost_ready';
    }

    // Construct report data
    const reportData: ProgressReportData = {
      user: {
        name: userData.name || 'User',
        email: userData.email || '',
        joinedAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      summary: {
        overallProgress: userProgress.overallPercentage || 0,
        totalTimeSpent: userProgress.totalTimeSpentMinutes || 0,
        lessonsCompleted: userProgress.lessonsCompleted?.length || 0,
        totalLessons: getTotalLessons(),
        averageMastery: avgMastery,
        currentStreak: userStreak.currentStreak || 0,
        longestStreak: userStreak.longestStreak || 0,
      },
      skills: {
        mastered: masteredSkills.map(s => ({
          name: s.skillName,
          mastery: s.pMastery,
          masteredAt: s.lastAttempt?.toISOString(),
        })),
        inProgress: inProgressSkills.map(s => ({
          name: s.skillName,
          mastery: s.pMastery,
          estimatedDays: Math.ceil((0.95 - s.pMastery) / learningVelocity),
        })),
        notStarted: notStartedSkillIds.map(id => ({
          name: SMM_SKILLS[id] || id,
        })),
      },
      predictions: {
        estimatedCompletionDate: estimatedCompletionDate.toISOString(),
        predictedExamScore: Math.round(avgMastery * 100),
        readinessLevel,
      },
      recentActivity,
    };

    // Build mastery history from actual interaction data (only real data)
    const masteryHistory: Array<{ date: string; pMastery: number }> = [];

    // Get interactions grouped by date to show real progress over time
    const interactionsByDate = new Map<string, number[]>();
    interactionsSnap.forEach(doc => {
      const data = doc.data();
      if (data.timestamp && data.pMasteryAfter !== undefined) {
        const dateKey = data.timestamp.toDate().toISOString().split('T')[0];
        if (!interactionsByDate.has(dateKey)) {
          interactionsByDate.set(dateKey, []);
        }
        interactionsByDate.get(dateKey)!.push(data.pMasteryAfter);
      }
    });

    // Convert to sorted array of daily averages
    const sortedDates = Array.from(interactionsByDate.keys()).sort();
    for (const dateKey of sortedDates) {
      const masteryValues = interactionsByDate.get(dateKey)!;
      const avgDailyMastery = masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length;
      masteryHistory.push({
        date: dateKey,
        pMastery: avgDailyMastery,
      });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      visualization: {
        masteryHistory, // Only real data, no fake generated data
      },
    });
  } catch (error) {
    console.error('[Progress Report API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate progress report' },
      { status: 500 }
    );
  }
}
