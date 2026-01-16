/**
 * Memory Extractor
 *
 * Phase 4: Analyzes conversations to extract key facts about the user.
 * Uses pattern matching and AI to identify:
 * - Learning style preferences
 * - Struggle areas
 * - Strengths
 * - Goals and motivations
 * - Background information
 *
 * This runs at the end of conversations to build persistent memory.
 */

import {
  addFact,
  setLearningStyle,
  incrementConversationsAnalyzed,
  getMemory,
} from '@/lib/services/userMemoryService';
import type { MemoryFactCategory, LearningStyle } from '@/lib/firebase/schema';

// ============================================
// TYPES
// ============================================

type ConversationMessage = {
  role: 'user' | 'coach';
  content: string;
};

type ExtractedFact = {
  fact: string;
  category: MemoryFactCategory;
  confidence: number;
  source: 'explicit' | 'inferred';
};

// ============================================
// PATTERN DEFINITIONS
// ============================================

// Patterns for detecting explicit statements
const EXPLICIT_PATTERNS: Array<{
  pattern: RegExp;
  category: MemoryFactCategory;
  extract: (match: RegExpMatchArray) => string;
}> = [
  // Goals
  {
    pattern: /(?:i want to|i'm trying to|my goal is to|i need to|hoping to)\s+([^.!?]+)/i,
    category: 'goal',
    extract: (m) => `Wants to ${m[1].trim()}`,
  },
  {
    pattern: /(?:i'm preparing for|studying for|getting ready for)\s+([^.!?]+)/i,
    category: 'goal',
    extract: (m) => `Preparing for ${m[1].trim()}`,
  },

  // Struggles
  {
    pattern: /(?:i struggle with|i'm having trouble with|i don't understand|i'm confused about)\s+([^.!?]+)/i,
    category: 'struggle',
    extract: (m) => `Struggles with ${m[1].trim()}`,
  },
  {
    pattern: /(?:i find it hard to|it's difficult for me to)\s+([^.!?]+)/i,
    category: 'struggle',
    extract: (m) => `Finds it hard to ${m[1].trim()}`,
  },

  // Preferences
  {
    pattern: /(?:i prefer|i like|i learn better with|i find it easier when)\s+([^.!?]+)/i,
    category: 'preference',
    extract: (m) => `Prefers ${m[1].trim()}`,
  },
  {
    pattern: /(?:i'm a|i consider myself a)\s+(visual|hands-on|auditory)\s+learner/i,
    category: 'preference',
    extract: (m) => `Self-identified ${m[1]} learner`,
  },

  // Background
  {
    pattern: /(?:i work as|i'm a|my job is|i do)\s+([^.!?]+?)(?:at|for|in)?\s*$/i,
    category: 'background',
    extract: (m) => `Works as ${m[1].trim()}`,
  },
  {
    pattern: /(?:i have|i've got)\s+(\d+)\s+(?:years?|months?)\s+(?:of)?\s*experience/i,
    category: 'background',
    extract: (m) => `Has ${m[1]} years of experience`,
  },

  // Strengths
  {
    pattern: /(?:i'm good at|i understand|i get|i know)\s+([^.!?]+)/i,
    category: 'strength',
    extract: (m) => `Good at ${m[1].trim()}`,
  },
];

// Patterns for learning style detection
const LEARNING_STYLE_INDICATORS: Array<{
  pattern: RegExp;
  style: LearningStyle;
  weight: number;
}> = [
  // Visual
  { pattern: /show me|can you visualize|diagram|picture|chart|graph/i, style: 'visual', weight: 0.15 },
  { pattern: /i'm a visual learner/i, style: 'visual', weight: 0.8 },

  // Step-by-step
  { pattern: /step by step|walk me through|break it down|one step at a time/i, style: 'step-by-step', weight: 0.2 },
  { pattern: /i like structured|i prefer structured/i, style: 'step-by-step', weight: 0.3 },

  // Analogy
  { pattern: /like what|similar to|compare it to|analogy|metaphor/i, style: 'analogy', weight: 0.15 },
  { pattern: /i understand better with analogies/i, style: 'analogy', weight: 0.7 },

  // Example-based
  { pattern: /give me an example|for example|real world example|show me how/i, style: 'example-based', weight: 0.15 },
  { pattern: /i learn best from examples/i, style: 'example-based', weight: 0.7 },

  // Conceptual
  { pattern: /why does|how does|explain the concept|theory behind/i, style: 'conceptual', weight: 0.15 },
  { pattern: /i like understanding the why/i, style: 'conceptual', weight: 0.5 },
];

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract facts from a conversation using pattern matching
 * @param messages - The conversation messages
 * @returns Array of extracted facts
 */
export function extractFactsFromPatterns(messages: ConversationMessage[]): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const userMessages = messages.filter((m) => m.role === 'user');

  for (const msg of userMessages) {
    for (const { pattern, category, extract } of EXPLICIT_PATTERNS) {
      const match = msg.content.match(pattern);
      if (match) {
        const fact = extract(match);
        // Check for duplicates
        if (!facts.some((f) => f.fact.toLowerCase() === fact.toLowerCase())) {
          facts.push({
            fact,
            category,
            confidence: 0.8, // High confidence for explicit statements
            source: 'explicit',
          });
        }
      }
    }
  }

  return facts;
}

/**
 * Detect learning style preferences from conversation
 * @param messages - The conversation messages
 * @returns Detected style and confidence, or null if no clear preference
 */
export function detectLearningStyle(
  messages: ConversationMessage[]
): { style: LearningStyle; confidence: number } | null {
  const userMessages = messages.filter((m) => m.role === 'user');
  const styleScores: Record<LearningStyle, number> = {
    'visual': 0,
    'step-by-step': 0,
    'analogy': 0,
    'example-based': 0,
    'conceptual': 0,
  };

  for (const msg of userMessages) {
    for (const { pattern, style, weight } of LEARNING_STYLE_INDICATORS) {
      if (pattern.test(msg.content)) {
        styleScores[style] += weight;
      }
    }
  }

  // Find the highest scoring style
  let maxStyle: LearningStyle | null = null;
  let maxScore = 0;

  for (const [style, score] of Object.entries(styleScores) as [LearningStyle, number][]) {
    if (score > maxScore) {
      maxScore = score;
      maxStyle = style;
    }
  }

  // Only return if we have enough confidence (score > 0.3)
  if (maxStyle && maxScore >= 0.3) {
    return {
      style: maxStyle,
      confidence: Math.min(0.95, maxScore), // Cap at 95%
    };
  }

  return null;
}

/**
 * Analyze a completed conversation and extract memory facts
 * This is the main entry point - call this at the end of conversations
 *
 * @param uid - User's Firebase UID
 * @param conversationId - The conversation ID
 * @param messages - All messages from the conversation
 * @returns Number of facts extracted
 */
export async function analyzeConversation(
  uid: string,
  conversationId: string,
  messages: ConversationMessage[]
): Promise<number> {
  // Skip very short conversations
  if (messages.length < 4) {
    return 0;
  }

  let factsAdded = 0;

  try {
    // Get existing memory to avoid duplicates
    const existingMemory = await getMemory(uid);
    const existingFacts = new Set(
      existingMemory?.keyFacts.map((f) => f.fact.toLowerCase()) || []
    );

    // Extract facts using pattern matching
    const extractedFacts = extractFactsFromPatterns(messages);

    // Add new facts to memory
    for (const fact of extractedFacts) {
      if (!existingFacts.has(fact.fact.toLowerCase())) {
        await addFact(
          uid,
          fact.fact,
          fact.category,
          fact.source,
          fact.confidence,
          conversationId
        );
        factsAdded++;
      }
    }

    // Detect and update learning style
    const styleDetection = detectLearningStyle(messages);
    if (styleDetection) {
      // Only update if new confidence is higher than existing
      const currentConfidence = existingMemory?.styleConfidence || 0;
      if (styleDetection.confidence > currentConfidence) {
        await setLearningStyle(uid, styleDetection.style, styleDetection.confidence);
      }
    }

    // Increment conversation counter
    await incrementConversationsAnalyzed(uid);

    console.log(`[MemoryExtractor] Extracted ${factsAdded} facts for user ${uid}`);
  } catch (error) {
    console.error('[MemoryExtractor] Error analyzing conversation:', error);
  }

  return factsAdded;
}

/**
 * Quick analysis for real-time fact extraction
 * Call this during conversation when user makes explicit statements
 *
 * @param uid - User's Firebase UID
 * @param userMessage - The user's message
 * @param conversationId - The conversation ID
 * @returns Whether a fact was extracted
 */
export async function quickExtract(
  uid: string,
  userMessage: string,
  conversationId?: string
): Promise<boolean> {
  const facts = extractFactsFromPatterns([{ role: 'user', content: userMessage }]);

  if (facts.length > 0) {
    const fact = facts[0];
    await addFact(
      uid,
      fact.fact,
      fact.category,
      fact.source,
      fact.confidence,
      conversationId
    );
    return true;
  }

  return false;
}
