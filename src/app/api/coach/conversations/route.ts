/**
 * Coach Conversations API Route
 *
 * Lists conversations for a user, optionally filtered by lesson.
 * GET /api/coach/conversations?lessonId=xxx&limit=10
 * Returns: { conversations: Array<{ id, preview, messageCount, updatedAt, lessonId }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getConversationsByLesson, getConversationsByUser } from '@/lib/services/coachService';
import { parseConversationListParams } from '@/lib/validation/apiParams';

// ============================================
// TYPES
// ============================================

type ConversationPreview = {
  id: string;
  preview: string;
  messageCount: number;
  updatedAt: string;
  lessonId?: string;
  sessionGoal?: string;
};

// ============================================
// GET HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse and validate query parameters with bounds
    const { searchParams } = new URL(request.url);
    const { lessonId, limit } = parseConversationListParams(searchParams);

    // Fetch conversations with bounded limit
    let conversations;
    if (lessonId) {
      // Get conversations for specific lesson
      conversations = await getConversationsByLesson(userId, lessonId, limit);
    } else {
      // Get all user conversations
      conversations = await getConversationsByUser(userId, limit);
    }

    // Transform to preview format
    const previews: ConversationPreview[] = conversations.map((conv) => {
      // Get preview from first user message or session goal
      const firstUserMessage = conv.messages?.find((m) => m.role === 'user');
      const preview = firstUserMessage?.content?.substring(0, 100) ||
        conv.sessionGoal ||
        'New conversation';

      return {
        id: conv.id!,
        preview: preview.length > 100 ? `${preview.substring(0, 97)}...` : preview,
        messageCount: conv.messages?.length || 0,
        updatedAt: conv.updatedAt?.toISOString() || new Date().toISOString(),
        lessonId: conv.lessonId,
        sessionGoal: conv.sessionGoal,
      };
    });

    return NextResponse.json({
      conversations: previews,
      total: previews.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Conversations API] Error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to fetch conversations', message: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================
// HELPERS
// ============================================

async function authenticateUser(request: NextRequest): Promise<string | null> {
  try {
    // Try Bearer token first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(token);
      return decodedToken.uid;
    }

    // Fallback to x-user-id header (for development)
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      return userIdHeader;
    }

    // Fallback to session ID
    const sessionId = request.headers.get('x-session-id');
    return sessionId || null;
  } catch {
    return null;
  }
}
