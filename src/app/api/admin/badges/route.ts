import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { Badge } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const badgeCriteriaSchema = z.object({
  type: z.enum(['completion', 'streak', 'score', 'time', 'custom']),
  threshold: z.number(),
  relatedEntityId: z.string().optional(),
  customLogic: z.string().optional(),
});

const createBadgeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string(),
  type: z.enum(['skill', 'milestone', 'streak', 'special']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
  criteria: badgeCriteriaSchema,
});

const updateBadgeSchema = createBadgeSchema.partial();

/**
 * GET /api/admin/badges
 * Fetch all badge definitions
 * Response: { success: boolean; badges: Badge[] }
 */
export async function GET() {
  try {
    // TODO: Add admin auth check here
    const badgesSnap = await adminDb.collection('badges').get();

    const badges = badgesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Badge[];

    return NextResponse.json(
      {
        success: true,
        badges,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch badges error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/badges
 * Create a new badge definition
 * Request body: Badge definition with criteria
 * Response: { success: boolean; badge: Badge }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin auth check here
    const body = await request.json();

    // Validate input
    const validation = createBadgeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const badgeData = validation.data;

    // Check if badge ID already exists
    const existingBadge = await adminDb.collection('badges').doc(badgeData.id).get();
    if (existingBadge.exists) {
      return NextResponse.json(
        { error: 'Badge with this ID already exists' },
        { status: 409 }
      );
    }

    // Create badge
    const newBadge: Badge = {
      ...badgeData,
    };

    await adminDb.collection('badges').doc(badgeData.id).set({
      ...newBadge,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      archived: false,
    });

    return NextResponse.json(
      {
        success: true,
        badge: newBadge,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create badge error:', error);
    return NextResponse.json(
      { error: 'Failed to create badge' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/badges
 * Update an existing badge definition
 * Request body: { id: string; ...updatedFields }
 * Response: { success: boolean; badge: Badge }
 */
export async function PUT(request: NextRequest) {
  try {
    // TODO: Add admin auth check here
    const body = await request.json();

    // Validate input
    const validation = updateBadgeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Badge ID is required' },
        { status: 400 }
      );
    }

    // Check if badge exists
    const badgeSnap = await adminDb.collection('badges').doc(id).get();
    if (!badgeSnap.exists) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Update badge
    await adminDb.collection('badges').doc(id).update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedBadgeSnap = await adminDb.collection('badges').doc(id).get();
    const updatedBadge = {
      id: updatedBadgeSnap.id,
      ...updatedBadgeSnap.data(),
    };

    return NextResponse.json(
      {
        success: true,
        badge: updatedBadge,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update badge error:', error);
    return NextResponse.json(
      { error: 'Failed to update badge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/badges
 * Delete/archive a badge definition (soft delete)
 * Request body: { id: string }
 * Response: { success: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add admin auth check here
    const body = await request.json();

    const id = body.id as string;
    if (!id) {
      return NextResponse.json(
        { error: 'Badge ID is required' },
        { status: 400 }
      );
    }

    // Check if badge exists
    const badgeSnap = await adminDb.collection('badges').doc(id).get();
    if (!badgeSnap.exists) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Soft delete (archive)
    await adminDb.collection('badges').doc(id).update({
      archived: true,
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Badge archived successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete badge error:', error);
    return NextResponse.json(
      { error: 'Failed to delete badge' },
      { status: 500 }
    );
  }
}
