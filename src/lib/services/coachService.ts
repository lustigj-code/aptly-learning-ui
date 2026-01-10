/**
 * Coach Service
 * Handles all Firestore operations for AI coach conversations
 * Persists conversation history and message data
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Conversation, CoachMessage, MessageContext, CoachFeedback } from '@/lib/auth/schemas';

// ============================================
// COMPREHENSION TRACKING TYPES
// ============================================

/**
 * Tracks comprehension level for a single concept
 */
export type ComprehensionLevel = 'unverified' | 'partial' | 'demonstrated' | 'mastered';

export type ConceptComprehension = {
  conceptId: string;           // e.g., "lookalike-audiences"
  conceptName: string;         // Human-readable name
  introducedAt: Date;          // When coach first explained
  verificationAttempts: number;
  lastVerificationAt: Date | null;
  comprehensionLevel: ComprehensionLevel;
  studentExplanation?: string; // Their own words when verified
};

/**
 * Overall comprehension state for a conversation
 */
export type ComprehensionState = {
  conceptsIntroduced: ConceptComprehension[];
  pendingVerification: string[];  // conceptIds that need verification
  lastVerifiedAt: Date | null;
  verificationStreak: number;     // consecutive successful verifications
};

/**
 * Get a complete conversation by ID
 * Loads full conversation history with all messages
 * @param conversationId - The conversation's ID
 * @returns Conversation with all messages or null if not found
 * @throws Error if database operation fails
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const doc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      messages: (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp?.toDate?.() || new Date(),
      })),
    } as Conversation;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to fetch conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a new conversation
 * Initializes a new conversation for a user in a specific lesson context
 * @param uid - User's Firebase UID
 * @param lessonId - Optional lesson ID for context
 * @param sessionGoal - Optional goal for this conversation session
 * @returns New conversation ID
 * @throws Error if conversation creation fails
 */
export async function createConversation(
  uid: string,
  lessonId?: string,
  sessionGoal?: string
): Promise<string> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const newConversation: Record<string, unknown> = {
      userId: uid,
      messages: [],
      comprehensionState: {
        conceptsIntroduced: [],
        pendingVerification: [],
        lastVerifiedAt: null,
        verificationStreak: 0,
      },
    };

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (lessonId) {
      newConversation.lessonId = lessonId;
    }
    if (sessionGoal) {
      newConversation.sessionGoal = sessionGoal;
    }

    const docRef = await adminDb.collection('conversations').add({
      ...newConversation,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error(`Error creating conversation for user ${uid}:`, error);
    throw new Error(
      `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Add a message to a conversation
 * Appends a new message to the conversation's message array
 * @param conversationId - The conversation's ID
 * @param role - Message role ('user' or 'coach')
 * @param content - Message content text
 * @param context - Optional message context (for coach responses)
 * @param feedback - Optional feedback (for coach messages)
 * @returns Message ID
 * @throws Error if message addition fails
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'coach',
  content: string,
  context?: MessageContext,
  feedback?: CoachFeedback
): Promise<string> {
  try {
    if (!conversationId || !role || !content) {
      throw new Error('conversationId, role, and content are required');
    }

    if (role !== 'user' && role !== 'coach') {
      throw new Error('role must be either "user" or "coach"');
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('content must be a non-empty string');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: CoachMessage = {
      id: messageId,
      role,
      content,
      timestamp: new Date(),
      ...(context && { context }),
      ...(feedback && { feedback }),
    };

    const conversationRef = adminDb.collection('conversations').doc(conversationId);

    await conversationRef.update({
      messages: FieldValue.arrayUnion([message]),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return messageId;
  } catch (error) {
    console.error(`Error adding message to conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all conversations for a user
 * Retrieves conversation list with latest message preview
 * @param uid - User's Firebase UID
 * @param limit - Optional limit on number of conversations (default 50)
 * @returns Array of conversations sorted by most recent first
 * @throws Error if database operation fails
 */
export async function getConversationsByUser(uid: string, limit: number = 50): Promise<Conversation[]> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    if (typeof limit !== 'number' || limit < 1) {
      throw new Error('limit must be a positive number');
    }

    const snapshot = await adminDb
      .collection('conversations')
      .where('userId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const conversations: Conversation[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        messages: (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp?.toDate?.() || new Date(),
        })),
      } as Conversation);
    });

    return conversations;
  } catch (error) {
    console.error(`Error fetching conversations for user ${uid}:`, error);
    throw new Error(
      `Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get conversations for a specific lesson
 * @param uid - User's Firebase UID
 * @param lessonId - Lesson ID to filter by
 * @returns Array of conversations for that lesson
 * @throws Error if database operation fails
 */
export async function getConversationsByLesson(
  uid: string,
  lessonId: string
): Promise<Conversation[]> {
  try {
    if (!uid || !lessonId) {
      throw new Error('UID and lessonId are required');
    }

    const snapshot = await adminDb
      .collection('conversations')
      .where('userId', '==', uid)
      .where('lessonId', '==', lessonId)
      .orderBy('createdAt', 'desc')
      .get();

    const conversations: Conversation[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        messages: (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp?.toDate?.() || new Date(),
        })),
      } as Conversation);
    });

    return conversations;
  } catch (error) {
    console.error(
      `Error fetching conversations for user ${uid} and lesson ${lessonId}:`,
      error
    );
    throw new Error(
      `Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get message count for a conversation
 * @param conversationId - The conversation's ID
 * @returns Number of messages in conversation
 * @throws Error if database operation fails
 */
export async function getConversationMessageCount(conversationId: string): Promise<number> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const doc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
      return 0;
    }

    const data = doc.data();
    return (data?.messages || []).length;
  } catch (error) {
    console.error(`Error getting message count for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to get message count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a conversation (soft delete)
 * Marks conversation as deleted rather than removing it
 * @param conversationId - The conversation's ID
 * @returns Void on success
 * @throws Error if deletion fails
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    await adminDb.collection('conversations').doc(conversationId).update({
      deletedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get conversation statistics
 * Returns summary statistics about a conversation
 * @param conversationId - The conversation's ID
 * @returns Object with message counts and metadata
 * @throws Error if database operation fails
 */
export async function getConversationStats(conversationId: string): Promise<{
  totalMessages: number;
  userMessages: number;
  coachMessages: number;
  duration: number;
}> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = conversation.messages || [];
    const userMessages = messages.filter(msg => msg.role === 'user').length;
    const coachMessages = messages.filter(msg => msg.role === 'coach').length;

    const duration = conversation.updatedAt
      ? Math.round((conversation.updatedAt.getTime() - conversation.createdAt.getTime()) / 1000)
      : 0;

    return {
      totalMessages: messages.length,
      userMessages,
      coachMessages,
      duration,
    };
  } catch (error) {
    console.error(`Error getting statistics for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to get conversation stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get recent messages from a conversation
 * @param conversationId - The conversation's ID
 * @param count - Number of recent messages to return
 * @returns Array of recent messages
 * @throws Error if database operation fails
 */
export async function getRecentMessages(
  conversationId: string,
  count: number = 10
): Promise<CoachMessage[]> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    if (typeof count !== 'number' || count < 1) {
      throw new Error('count must be a positive number');
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return [];
    }

    const messages = conversation.messages || [];
    const recentMessages = messages.slice(Math.max(0, messages.length - count));

    return recentMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error(`Error getting recent messages for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to get recent messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update conversation session goal
 * @param conversationId - The conversation's ID
 * @param sessionGoal - New session goal
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateSessionGoal(
  conversationId: string,
  sessionGoal: string
): Promise<void> {
  try {
    if (!conversationId || !sessionGoal) {
      throw new Error('conversationId and sessionGoal are required');
    }

    await adminDb.collection('conversations').doc(conversationId).update({
      sessionGoal,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating session goal for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to update session goal: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if conversation exists
 * @param conversationId - The conversation's ID
 * @returns Boolean indicating if conversation exists
 * @throws Error if database operation fails
 */
export async function conversationExists(conversationId: string): Promise<boolean> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const doc = await adminDb.collection('conversations').doc(conversationId).get();
    return doc.exists;
  } catch (error) {
    console.error(`Error checking conversation existence for ${conversationId}:`, error);
    throw new Error(
      `Failed to check conversation existence: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================
// COMPREHENSION TRACKING FUNCTIONS
// ============================================

/**
 * Mark a concept as introduced in the conversation
 * Called when the coach explains a new concept
 * @param conversationId - The conversation's ID
 * @param conceptId - Unique identifier for the concept (e.g., "lookalike-audiences")
 * @param conceptName - Human-readable name for the concept
 */
export async function markConceptIntroduced(
  conversationId: string,
  conceptId: string,
  conceptName: string
): Promise<void> {
  try {
    if (!conversationId || !conceptId || !conceptName) {
      throw new Error('conversationId, conceptId, and conceptName are required');
    }

    const conversationRef = adminDb.collection('conversations').doc(conversationId);
    const doc = await conversationRef.get();

    if (!doc.exists) {
      throw new Error('Conversation not found');
    }

    const data = doc.data();
    const comprehensionState: ComprehensionState = data?.comprehensionState || {
      conceptsIntroduced: [],
      pendingVerification: [],
      lastVerifiedAt: null,
      verificationStreak: 0,
    };

    // Check if concept already exists
    const existingIndex = comprehensionState.conceptsIntroduced.findIndex(
      (c) => c.conceptId === conceptId
    );

    if (existingIndex === -1) {
      // Add new concept
      const newConcept: ConceptComprehension = {
        conceptId,
        conceptName,
        introducedAt: new Date(),
        verificationAttempts: 0,
        lastVerificationAt: null,
        comprehensionLevel: 'unverified',
      };

      comprehensionState.conceptsIntroduced.push(newConcept);
      comprehensionState.pendingVerification.push(conceptId);
    }

    await conversationRef.update({
      comprehensionState,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error marking concept introduced for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to mark concept introduced: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark a concept as verified with a comprehension level
 * Called when the student demonstrates understanding
 * @param conversationId - The conversation's ID
 * @param conceptId - The concept that was verified
 * @param level - The comprehension level demonstrated
 * @param explanation - Optional student's explanation in their own words
 */
export async function markConceptVerified(
  conversationId: string,
  conceptId: string,
  level: ComprehensionLevel,
  explanation?: string
): Promise<void> {
  try {
    if (!conversationId || !conceptId || !level) {
      throw new Error('conversationId, conceptId, and level are required');
    }

    const conversationRef = adminDb.collection('conversations').doc(conversationId);
    const doc = await conversationRef.get();

    if (!doc.exists) {
      throw new Error('Conversation not found');
    }

    const data = doc.data();
    const comprehensionState: ComprehensionState = data?.comprehensionState || {
      conceptsIntroduced: [],
      pendingVerification: [],
      lastVerifiedAt: null,
      verificationStreak: 0,
    };

    // Find and update the concept
    const conceptIndex = comprehensionState.conceptsIntroduced.findIndex(
      (c) => c.conceptId === conceptId
    );

    if (conceptIndex !== -1) {
      comprehensionState.conceptsIntroduced[conceptIndex].verificationAttempts += 1;
      comprehensionState.conceptsIntroduced[conceptIndex].lastVerificationAt = new Date();
      comprehensionState.conceptsIntroduced[conceptIndex].comprehensionLevel = level;
      if (explanation) {
        comprehensionState.conceptsIntroduced[conceptIndex].studentExplanation = explanation;
      }

      // Remove from pending verification if level is demonstrated or mastered
      if (level === 'demonstrated' || level === 'mastered') {
        comprehensionState.pendingVerification = comprehensionState.pendingVerification.filter(
          (id) => id !== conceptId
        );
        comprehensionState.verificationStreak += 1;
      } else if (level === 'partial') {
        // Keep in pending but update streak
        comprehensionState.verificationStreak = 0;
      }

      comprehensionState.lastVerifiedAt = new Date();
    }

    await conversationRef.update({
      comprehensionState,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error marking concept verified for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to mark concept verified: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get concepts that haven't been verified yet
 * Used to trigger verification prompts
 * @param conversationId - The conversation's ID
 * @returns Array of unverified concepts
 */
export async function getUnverifiedConcepts(
  conversationId: string
): Promise<ConceptComprehension[]> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const doc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
      return [];
    }

    const data = doc.data();
    const comprehensionState: ComprehensionState = data?.comprehensionState || {
      conceptsIntroduced: [],
      pendingVerification: [],
      lastVerifiedAt: null,
      verificationStreak: 0,
    };

    // Return concepts that are still pending verification
    return comprehensionState.conceptsIntroduced.filter((concept) =>
      comprehensionState.pendingVerification.includes(concept.conceptId)
    );
  } catch (error) {
    console.error(`Error getting unverified concepts for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to get unverified concepts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the full comprehension state for a conversation
 * @param conversationId - The conversation's ID
 * @returns ComprehensionState or null if not found
 */
export async function getComprehensionState(
  conversationId: string
): Promise<ComprehensionState | null> {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversationId provided');
    }

    const doc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data?.comprehensionState || null;
  } catch (error) {
    console.error(`Error getting comprehension state for conversation ${conversationId}:`, error);
    throw new Error(
      `Failed to get comprehension state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
