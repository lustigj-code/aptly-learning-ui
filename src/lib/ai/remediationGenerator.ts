/**
 * Remediation Content Generator
 *
 * Uses AI to generate personalized content when learners struggle:
 * - Alternative explanations using different analogies
 * - Simpler practice questions
 * - Connections to concepts user already understands
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from '@/lib/firebase/admin';
import { getSkillName } from '@/data/skillMap';
import type { CoachContextData } from '@/lib/utils/coachContext';
import type { StruggleSignals } from '@/lib/adaptive/struggleDetection';

// ============================================
// TYPES
// ============================================

export interface GeneratedContent {
  type: 'explanation' | 'example' | 'practice_question' | 'analogy';
  content: string;
  skillId: string;
  difficulty: 'simpler' | 'same' | 'harder';
  metadata: {
    generatedAt: Date;
    promptUsed: string;
    model: string;
    cached: boolean;
  };
}

export interface GeneratedPracticeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  skillId: string;
  difficulty: 'easier' | 'same' | 'harder';
}

export interface GeneratedAnalogy {
  analogy: string;
  connects: {
    newConcept: string;
    knownConcept: string;
  };
  explanation: string;
}

// ============================================
// CONTENT GENERATION CACHE
// ============================================

const contentCache = new Map<string, { content: GeneratedContent; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCacheKey(skillId: string, type: string, context: string): string {
  return `${skillId}:${type}:${context.slice(0, 50)}`;
}

function getCachedContent(key: string): GeneratedContent | null {
  const cached = contentCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.content, metadata: { ...cached.content.metadata, cached: true } };
  }
  return null;
}

function setCachedContent(key: string, content: GeneratedContent): void {
  contentCache.set(key, { content, timestamp: Date.now() });
}

// ============================================
// MAIN GENERATION FUNCTIONS
// ============================================

/**
 * Generate alternative explanation when user struggles
 */
export async function generateAlternativeExplanation(
  userId: string,
  skillId: string,
  userContext: CoachContextData,
  struggleContext: StruggleSignals
): Promise<GeneratedContent> {
  const cacheKey = getCacheKey(skillId, 'explanation', JSON.stringify(struggleContext.signals));
  const cached = getCachedContent(cacheKey);
  if (cached) return cached;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return createFallbackExplanation(skillId);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const skillName = getSkillName(skillId);
  const strongConcepts = userContext.performance.strongConcepts.join(', ') || 'basic AI concepts';

  const prompt = `You are creating an ALTERNATIVE explanation for a learner who is struggling with "${skillName}".

LEARNER CONTEXT:
- Experience Level: ${userContext.adaptiveDifficulty}
- Strong Areas: ${strongConcepts}
- Consecutive wrong answers: ${struggleContext.signals.consecutiveWrong}
- Current mastery level: ${Math.round((userContext.masteryLevel || 0))}%

THE LEARNER IS STRUGGLING. Your explanation must be:
1. DIFFERENT from a typical textbook explanation
2. Use a real-world ANALOGY they can relate to
3. Connect to something they already know (${strongConcepts})
4. Be CONCISE (2-3 short paragraphs max)
5. End with ONE simple check question

Write the explanation in a warm, encouraging tone. Start with acknowledging the challenge.

Return JSON:
{
  "explanation": "The full alternative explanation with analogy",
  "checkQuestion": "A simple yes/no or single-answer question to verify understanding"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackExplanation(skillId);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const content: GeneratedContent = {
      type: 'explanation',
      content: `${parsed.explanation}\n\n**Quick check:** ${parsed.checkQuestion}`,
      skillId,
      difficulty: 'simpler',
      metadata: {
        generatedAt: new Date(),
        promptUsed: prompt.slice(0, 200),
        model: 'gemini-2.0-flash',
        cached: false,
      },
    };

    setCachedContent(cacheKey, content);
    await cacheToFirestore(userId, content);

    return content;
  } catch (error) {
    console.error('Failed to generate alternative explanation:', error);
    return createFallbackExplanation(skillId);
  }
}

/**
 * Generate practice questions tailored to user level
 */
export async function generatePracticeQuestion(
  userId: string,
  skillId: string,
  difficulty: 'easier' | 'same' | 'harder'
): Promise<GeneratedPracticeQuestion> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return createFallbackQuestion(skillId, difficulty);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const skillName = getSkillName(skillId);

  const difficultyGuidance = {
    easier: 'Make this question straightforward with obvious distractors. Focus on basic recall.',
    same: 'Standard difficulty with plausible distractors. Test application of concept.',
    harder: 'Make this challenging with subtle distinctions. Test deeper understanding.',
  };

  const prompt = `Generate a multiple-choice question to test "${skillName}".

Difficulty: ${difficulty.toUpperCase()}
${difficultyGuidance[difficulty]}

Requirements:
- 4 answer options
- Clear, unambiguous correct answer
- Brief explanation of why the answer is correct

Return JSON:
{
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "Why the correct answer is right"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackQuestion(skillId, difficulty);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      question: parsed.question,
      options: parsed.options,
      correctIndex: parsed.correctIndex,
      explanation: parsed.explanation,
      skillId,
      difficulty,
    };
  } catch (error) {
    console.error('Failed to generate practice question:', error);
    return createFallbackQuestion(skillId, difficulty);
  }
}

/**
 * Generate analogy connecting to user's strong skills
 */
export async function generateAnalogy(
  userId: string,
  skillId: string,
  strongSkills: string[]
): Promise<GeneratedAnalogy> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

  if (!process.env.GOOGLE_GENAI_API_KEY || strongSkills.length === 0) {
    return createFallbackAnalogy(skillId);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const skillName = getSkillName(skillId);
  const strongSkillNames = strongSkills.map(s => getSkillName(s)).join(', ');

  const prompt = `Create an analogy that explains "${skillName}" by connecting it to concepts the learner already knows.

LEARNER'S STRONG AREAS: ${strongSkillNames}

The analogy should:
1. Use one of their strong areas as the "known" concept
2. Draw a clear parallel to the new concept
3. Be memorable and concrete

Return JSON:
{
  "analogy": "The analogy text (2-3 sentences)",
  "knownConcept": "The concept they already know",
  "explanation": "Brief explanation of how the analogy maps to the new concept"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackAnalogy(skillId);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      analogy: parsed.analogy,
      connects: {
        newConcept: skillName,
        knownConcept: parsed.knownConcept,
      },
      explanation: parsed.explanation,
    };
  } catch (error) {
    console.error('Failed to generate analogy:', error);
    return createFallbackAnalogy(skillId);
  }
}

// ============================================
// FALLBACK CONTENT
// ============================================

function createFallbackExplanation(skillId: string): GeneratedContent {
  const skillName = getSkillName(skillId);

  return {
    type: 'explanation',
    content: `Let me explain "${skillName}" in a different way.\n\nThink of it like learning to ride a bike - at first it seems complex, but once you understand the basic balance, everything clicks. The key insight here is understanding the core principle, then building from there.\n\n**Quick check:** Does this analogy help clarify the concept for you?`,
    skillId,
    difficulty: 'simpler',
    metadata: {
      generatedAt: new Date(),
      promptUsed: 'fallback',
      model: 'none',
      cached: false,
    },
  };
}

function createFallbackQuestion(
  skillId: string,
  difficulty: 'easier' | 'same' | 'harder'
): GeneratedPracticeQuestion {
  return {
    question: `Which statement best describes ${getSkillName(skillId)}?`,
    options: [
      'It is a fundamental concept in this domain',
      'It is only relevant in advanced scenarios',
      'It has no practical applications',
      'It contradicts other established principles',
    ],
    correctIndex: 0,
    explanation: 'This is a foundational concept that underpins more advanced topics.',
    skillId,
    difficulty,
  };
}

function createFallbackAnalogy(skillId: string): GeneratedAnalogy {
  return {
    analogy: `Think of ${getSkillName(skillId)} like building with LEGO blocks - each piece connects to others in specific ways, and understanding those connections helps you build anything.`,
    connects: {
      newConcept: getSkillName(skillId),
      knownConcept: 'Building blocks',
    },
    explanation: 'Just as LEGO pieces have specific connection points, this concept has specific ways it relates to and builds upon other ideas.',
  };
}

// ============================================
// CACHING & STORAGE
// ============================================

/**
 * Cache generated content to Firestore for reuse
 */
async function cacheToFirestore(userId: string, content: GeneratedContent): Promise<void> {
  try {
    await adminDb.collection('generatedContent').add({
      userId,
      skillId: content.skillId,
      type: content.type,
      content: content.content,
      difficulty: content.difficulty,
      generatedAt: content.metadata.generatedAt,
      model: content.metadata.model,
    });
  } catch (error) {
    console.warn('Failed to cache generated content:', error);
  }
}

/**
 * Retrieve previously generated content from cache
 */
export async function getRecentGeneratedContent(
  userId: string,
  skillId: string,
  type: GeneratedContent['type']
): Promise<GeneratedContent | null> {
  try {
    const query = await adminDb
      .collection('generatedContent')
      .where('userId', '==', userId)
      .where('skillId', '==', skillId)
      .where('type', '==', type)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (query.empty) return null;

    const doc = query.docs[0];
    const data = doc.data();

    return {
      type: data.type,
      content: data.content,
      skillId: data.skillId,
      difficulty: data.difficulty,
      metadata: {
        generatedAt: data.generatedAt.toDate(),
        promptUsed: 'cached',
        model: data.model,
        cached: true,
      },
    };
  } catch (error) {
    console.warn('Failed to retrieve cached content:', error);
    return null;
  }
}

// ============================================
// BATCH GENERATION
// ============================================

/**
 * Pre-generate content for skills user is likely to need
 */
export async function preGenerateContent(
  userId: string,
  upcomingSkills: string[],
  userContext: CoachContextData
): Promise<void> {
  // Generate in background without blocking
  for (const skillId of upcomingSkills.slice(0, 3)) {
    try {
      // Check if we already have cached content
      const existing = await getRecentGeneratedContent(userId, skillId, 'explanation');
      if (existing) continue;

      // Generate with a mock struggle signal (pre-emptive)
      const mockStruggle: StruggleSignals = {
        skillId,
        severity: 'mild',
        signals: {
          consecutiveWrong: 0,
          masteryStalling: false,
          timeIncreasing: false,
          hintDependency: false,
          coachRequests: 0,
          retryCount: 0,
        },
        confidence: 0,
      };

      await generateAlternativeExplanation(userId, skillId, userContext, mockStruggle);
    } catch (error) {
      console.warn(`Failed to pre-generate content for ${skillId}:`, error);
    }
  }
}

// Types are exported inline above (GeneratedContent, GeneratedPracticeQuestion, GeneratedAnalogy)
