/**
 * Teacher Class Analytics API
 *
 * GET /api/teacher/class-analytics - Get aggregated class progress data
 *
 * Returns all students' mastery levels for the heatmap visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';
import type { User } from '@/types';
import {
  FSM_CONCEPTS,
  type StudentMasteryData,
  type ClassAnalyticsResponse,
} from '@/lib/teacher/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is instructor or admin
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Fetch the requesting user's role from Firestore
    const usersCollection = collection(db, 'users');
    const userQuery = query(usersCollection, where('email', '==', authUser.email));
    const userSnapshot = await getDocs(userQuery);

    let userRole: string | undefined;
    userSnapshot.forEach((doc) => {
      const data = doc.data();
      userRole = data.role;
    });

    if (userRole !== 'instructor' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Instructor or admin role required.' },
        { status: 403 }
      );
    }

    // Fetch all students (users with role 'student' or no role)
    const allUsersSnapshot = await getDocs(usersCollection);

    const students: StudentMasteryData[] = [];

    allUsersSnapshot.forEach((doc) => {
      const data = doc.data() as Partial<User>;

      // Only include students (role is 'student' or undefined)
      if (data.role && data.role !== 'student') {
        return;
      }

      const masteryLevels = data.progress?.masteryLevels || [];

      // Calculate average mastery across all concepts
      let totalMastery = 0;
      let conceptCount = 0;

      for (const concept of FSM_CONCEPTS) {
        const mastery = masteryLevels.find((m) => m.skillId === concept.id);
        if (mastery) {
          totalMastery += mastery.level;
          conceptCount++;
        }
      }

      const averageMastery = conceptCount > 0 ? totalMastery / conceptCount : 0;

      students.push({
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        masteryLevels,
        averageMastery,
        lastActiveAt: data.progress?.lastActiveAt
          ? (typeof data.progress.lastActiveAt === 'object' && 'toDate' in data.progress.lastActiveAt
              ? (data.progress.lastActiveAt as { toDate: () => Date }).toDate().toISOString()
              : new Date(data.progress.lastActiveAt as string | number | Date).toISOString())
          : null,
      });
    });

    // Calculate class average
    const classAverageMastery = students.length > 0
      ? students.reduce((sum, s) => sum + s.averageMastery, 0) / students.length
      : 0;

    const response: ClassAnalyticsResponse = {
      success: true,
      data: {
        students,
        concepts: FSM_CONCEPTS,
        classAverageMastery,
        totalStudents: students.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch class analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
