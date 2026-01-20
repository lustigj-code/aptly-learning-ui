/**
 * Coach Conversation Details Route
 * GET: Load full conversation history
 * DELETE: Soft delete conversation
 *
 * SECURITY: All endpoints verify user ownership of conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import {
  getConversation,
  deleteConversation,
} from '@/lib/services/coachService';

/**
 * Authenticate user from request
 * Returns userId if authenticated, null otherwise
 */
async function authenticateUser(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(token);
      return decodedToken.uid;
    }

    // Fallback to session cookie
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      return decodedClaims.uid;
    }
  } catch (error) {
    console.error('[Conversation API] Auth error:', error);
  }
  return null;
}

type RouteParams = {
  params: Promise<{
    conversationId: string;
  }>;
};

/**
 * GET /api/coach/[conversationId]
 * Retrieve full conversation history with messages
 * Supports pagination if needed
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Authenticate user first
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Valid conversationId is required' },
        { status: 400 }
      );
    }

    // Get pagination parameters from query
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate pagination params
    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Fetch conversation
    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // SECURITY: Verify user owns this conversation (IDOR protection)
    if (conversation.userId !== userId) {
      console.warn(`[Conversation API] IDOR attempt: User ${userId} tried to access conversation owned by ${conversation.userId}`);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Apply pagination to messages
    const messages = conversation.messages || [];
    const totalMessages = messages.length;
    const paginatedMessages = messages.slice(offset, offset + limit);

    return NextResponse.json({
      id: conversation.id,
      userId: conversation.userId,
      lessonId: conversation.lessonId,
      sessionGoal: conversation.sessionGoal,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: paginatedMessages,
      pagination: {
        total: totalMessages,
        limit,
        offset,
        hasMore: offset + limit < totalMessages,
      },
    });
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coach/[conversationId]
 * Soft delete conversation (sets deletedAt timestamp)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Authenticate user first
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Valid conversationId is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists before deletion
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // SECURITY: Verify user owns this conversation (IDOR protection)
    if (conversation.userId !== userId) {
      console.warn(`[Conversation API] IDOR attempt: User ${userId} tried to delete conversation owned by ${conversation.userId}`);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Soft delete the conversation
    await deleteConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
      conversationId,
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/coach/[conversationId]
 * Check if conversation exists
 */
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Authenticate user first
    const userId = await authenticateUser(request);
    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const { conversationId } = await params;

    if (!conversationId || typeof conversationId !== 'string') {
      return new NextResponse(null, { status: 400 });
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return new NextResponse(null, { status: 404 });
    }

    // SECURITY: Verify user owns this conversation (IDOR protection)
    if (conversation.userId !== userId) {
      return new NextResponse(null, { status: 403 });
    }

    const messageCount = conversation.messages?.length || 0;

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Message-Count': messageCount.toString(),
        'X-Last-Updated': conversation.updatedAt?.toISOString() || '',
      },
    });
  } catch (error) {
    console.error('Error checking conversation existence:', error);
    return new NextResponse(null, { status: 500 });
  }
}
