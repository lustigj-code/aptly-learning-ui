/**
 * Training Data Exporter
 *
 * Converts logged tutoring sessions into various training formats:
 * - Instruction format (Alpaca/Vicuna style)
 * - Conversational format (ShareGPT style)
 * - Preference pairs (for DPO/RLHF)
 * - Reward examples (for reward model training)
 */

import {
  type TutoringSession,
  type InstructionExample,
  type ConversationalExample,
  type PreferencePair,
  type RewardExample,
  type ConversationTurn,
} from './schema';
import { getSessionsForExport, markSessionsExported } from './conversationLogger';

// ============================================
// SYSTEM PROMPT FOR TRAINING
// ============================================

const TRAINING_SYSTEM_PROMPT = `You are Sage, an expert AI tutor for social media marketing and Meta advertising certification.

Your teaching principles:
1. NEVER give direct answers - use Socratic questioning to guide discovery
2. Ask what the student already knows before explaining
3. Use real-world examples from actual marketing campaigns
4. Adapt your explanations to the student's level
5. Celebrate understanding and normalize confusion
6. End responses with follow-up questions to check understanding

You have deep expertise in:
- Meta Ads Manager, Business Suite, Commerce Manager
- Campaign objectives, audience targeting, ad formats
- Analytics, measurement, and optimization
- Content strategy and creative best practices`;

// ============================================
// INSTRUCTION FORMAT EXPORT
// ============================================

/**
 * Convert a session to instruction-format examples
 * Each tutor response becomes one example
 */
export function sessionToInstructionExamples(session: TutoringSession): InstructionExample[] {
  const examples: InstructionExample[] = [];
  const turns = session.turns;

  for (let i = 0; i < turns.length - 1; i++) {
    const currentTurn = turns[i];
    const nextTurn = turns[i + 1];

    // Only create examples where user asks, tutor responds
    if (currentTurn.role === 'user' && nextTurn.role === 'tutor') {
      // Build context from previous turns
      const contextTurns = turns.slice(0, i);
      const contextStr = contextTurns
        .map(t => `${t.role === 'user' ? 'Student' : 'Sage'}: ${t.content}`)
        .join('\n\n');

      const instruction = `You are Sage, a Socratic tutor for social media marketing. The student is studying "${session.lessonTitle}".

${contextStr ? `Previous conversation:\n${contextStr}\n\n` : ''}The student says: "${currentTurn.content}"

Respond using the Socratic method - guide them to discover the answer through questions, examples, and scaffolding. Never give direct answers.`;

      examples.push({
        instruction,
        input: currentTurn.content,
        output: nextTurn.content,
        quality_score: session.qualityMetrics.socraticRatio,
        topic: session.lessonTitle,
        difficulty: session.userStateAtStart.adaptiveDifficulty,
        conversation_id: session.conversationId,
      });
    }
  }

  return examples;
}

// ============================================
// CONVERSATIONAL FORMAT EXPORT
// ============================================

/**
 * Convert a session to conversational format (ShareGPT style)
 */
export function sessionToConversationalExample(session: TutoringSession): ConversationalExample {
  const conversations: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const turn of session.turns) {
    conversations.push({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.content,
    });
  }

  // Add context as first system message
  const systemWithContext = `${TRAINING_SYSTEM_PROMPT}

Current context:
- Lesson: ${session.lessonTitle}
- Student level: ${session.userStateAtStart.adaptiveDifficulty}
- Mastery: ${session.userStateAtStart.masteryLevel}%
${session.userStateAtStart.strugglingConcepts.length > 0
  ? `- Areas needing attention: ${session.userStateAtStart.strugglingConcepts.join(', ')}`
  : ''}`;

  return {
    system: systemWithContext,
    conversations,
    quality_score: session.qualityMetrics.socraticRatio,
    topic: session.lessonTitle,
    session_id: session.id,
  };
}

// ============================================
// PREFERENCE PAIRS EXPORT
// ============================================

/**
 * Generate preference pairs from high vs low quality sessions
 */
export function generatePreferencePairs(
  highQualitySessions: TutoringSession[],
  lowQualitySessions: TutoringSession[]
): PreferencePair[] {
  const pairs: PreferencePair[] = [];

  // Match sessions by topic when possible
  for (const highSession of highQualitySessions) {
    const matchingLow = lowQualitySessions.find(
      s => s.lessonTitle === highSession.lessonTitle
    ) || lowQualitySessions[0];

    if (!matchingLow) continue;

    // Find comparable turns
    for (const highTurn of highSession.turns) {
      if (highTurn.role !== 'tutor') continue;

      // Find similar prompt in low quality session
      const highIndex = highSession.turns.indexOf(highTurn);
      const prompt = highIndex > 0 ? highSession.turns[highIndex - 1].content : '';

      // Look for a corresponding response in low session
      for (const lowTurn of matchingLow.turns) {
        if (lowTurn.role !== 'tutor') continue;

        const lowIndex = matchingLow.turns.indexOf(lowTurn);
        const lowPrompt = lowIndex > 0 ? matchingLow.turns[lowIndex - 1].content : '';

        // Check if prompts are similar enough
        if (calculateSimilarity(prompt, lowPrompt) > 0.3) {
          const qualityDelta = highSession.qualityMetrics.socraticRatio -
                               matchingLow.qualityMetrics.socraticRatio;

          if (qualityDelta > 0.2) {
            pairs.push({
              prompt: `Context: Tutoring on "${highSession.lessonTitle}"\n\nStudent: ${prompt}`,
              chosen: highTurn.content,
              rejected: lowTurn.content,
              preference_reason: determinePreferenceReason(
                highTurn.metadata,
                lowTurn.metadata,
                highSession.qualityMetrics,
                matchingLow.qualityMetrics
              ),
              topic: highSession.lessonTitle,
              quality_delta: qualityDelta,
            });
          }
        }
      }
    }
  }

  return pairs;
}

/**
 * Generate synthetic preference pairs from good responses
 * Creates "rejected" versions by degrading good responses
 */
export function generateSyntheticPreferencePairs(
  sessions: TutoringSession[]
): PreferencePair[] {
  const pairs: PreferencePair[] = [];

  for (const session of sessions) {
    for (let i = 0; i < session.turns.length; i++) {
      const turn = session.turns[i];
      if (turn.role !== 'tutor') continue;
      if (!turn.metadata.isSocratic) continue; // Only use good examples

      const prevTurn = session.turns[i - 1];
      if (!prevTurn || prevTurn.role !== 'user') continue;

      // Create rejected version by making it non-Socratic
      const rejected = degradeToDirectAnswer(turn.content, session.lessonTitle);

      pairs.push({
        prompt: `Context: Tutoring on "${session.lessonTitle}"\n\nStudent: ${prevTurn.content}`,
        chosen: turn.content,
        rejected,
        preference_reason: 'Chosen uses Socratic method; rejected gives direct answer',
        topic: session.lessonTitle,
        quality_delta: 0.5,
      });
    }
  }

  return pairs;
}

// ============================================
// REWARD MODEL EXAMPLES
// ============================================

/**
 * Generate reward model training examples
 */
export function sessionToRewardExamples(session: TutoringSession): RewardExample[] {
  const examples: RewardExample[] = [];

  for (let i = 0; i < session.turns.length; i++) {
    const turn = session.turns[i];
    if (turn.role !== 'tutor') continue;

    const prevTurn = session.turns[i - 1];
    if (!prevTurn || prevTurn.role !== 'user') continue;

    // Calculate component rewards
    const socraticAdherence = turn.metadata.isSocratic ? 1 : -0.5;
    const clarity = turn.metadata.usedExample ? 0.3 : 0;
    const engagement = turn.metadata.askedQuestion ? 0.3 : -0.2;
    const learningOutcome = session.outcomes.demonstratedUnderstanding ? 0.4 : 0;
    const userSatisfaction = (session.outcomes.userRating || 3) / 5;

    // Composite reward (-1 to 1)
    const reward = Math.tanh(
      socraticAdherence * 0.3 +
      clarity * 0.15 +
      engagement * 0.2 +
      learningOutcome * 0.25 +
      userSatisfaction * 0.1
    );

    examples.push({
      prompt: `Context: Tutoring "${session.lessonTitle}"\n\nStudent: ${prevTurn.content}`,
      response: turn.content,
      reward,
      reward_components: {
        socratic_adherence: socraticAdherence,
        clarity,
        engagement,
        learning_outcome: learningOutcome,
        user_satisfaction: userSatisfaction,
      },
    });
  }

  return examples;
}

// ============================================
// BULK EXPORT FUNCTIONS
// ============================================

/**
 * Export all training data in all formats
 */
export async function exportAllTrainingData(
  minQualityScore: number = 0.5,
  minOutcomeScore: number = 0.3,
  limit: number = 1000
): Promise<{
  instructionExamples: InstructionExample[];
  conversationalExamples: ConversationalExample[];
  preferencePairs: PreferencePair[];
  rewardExamples: RewardExample[];
  exportedSessionIds: string[];
}> {
  const sessions = await getSessionsForExport(minQualityScore, minOutcomeScore, limit);

  if (sessions.length === 0) {
    return {
      instructionExamples: [],
      conversationalExamples: [],
      preferencePairs: [],
      rewardExamples: [],
      exportedSessionIds: [],
    };
  }

  // Separate high and low quality for preference pairs
  const highQuality = sessions.filter(s => s.qualityMetrics.socraticRatio >= 0.7);
  const lowQuality = sessions.filter(s => s.qualityMetrics.socraticRatio < 0.5);

  // Generate all formats
  const instructionExamples: InstructionExample[] = [];
  const conversationalExamples: ConversationalExample[] = [];
  const rewardExamples: RewardExample[] = [];

  for (const session of sessions) {
    instructionExamples.push(...sessionToInstructionExamples(session));
    conversationalExamples.push(sessionToConversationalExample(session));
    rewardExamples.push(...sessionToRewardExamples(session));
  }

  // Generate preference pairs
  const preferencePairs = [
    ...generatePreferencePairs(highQuality, lowQuality),
    ...generateSyntheticPreferencePairs(highQuality),
  ];

  // Mark sessions as exported
  const exportedSessionIds = sessions.map(s => s.id);
  await markSessionsExported(exportedSessionIds);

  return {
    instructionExamples,
    conversationalExamples,
    preferencePairs,
    rewardExamples,
    exportedSessionIds,
  };
}

/**
 * Export to JSONL format for training
 */
export function toJSONL<T>(examples: T[]): string {
  return examples.map(e => JSON.stringify(e)).join('\n');
}

/**
 * Export to HuggingFace datasets format
 */
export function toHuggingFaceFormat(examples: ConversationalExample[]): string {
  const formatted = examples.map(e => ({
    messages: [
      { role: 'system', content: e.system },
      ...e.conversations.map(c => ({
        role: c.role,
        content: c.content,
      })),
    ],
  }));

  return formatted.map(e => JSON.stringify(e)).join('\n');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simple text similarity (Jaccard on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Determine why one response is preferred
 */
function determinePreferenceReason(
  chosenMeta: ConversationTurn['metadata'],
  rejectedMeta: ConversationTurn['metadata'],
  chosenMetrics: TutoringSession['qualityMetrics'],
  rejectedMetrics: TutoringSession['qualityMetrics']
): string {
  const reasons: string[] = [];

  if (chosenMeta.isSocratic && !rejectedMeta.isSocratic) {
    reasons.push('uses Socratic questioning');
  }
  if (chosenMeta.askedQuestion && !rejectedMeta.askedQuestion) {
    reasons.push('ends with a question');
  }
  if (!chosenMeta.gaveDirectAnswer && rejectedMeta.gaveDirectAnswer) {
    reasons.push('avoids giving direct answer');
  }
  if (chosenMeta.usedExample && !rejectedMeta.usedExample) {
    reasons.push('includes real-world example');
  }
  if (chosenMetrics.userEngagementScore > rejectedMetrics.userEngagementScore) {
    reasons.push('leads to better engagement');
  }

  return reasons.length > 0
    ? `Chosen is better because it ${reasons.join(', ')}`
    : 'Chosen has higher overall quality metrics';
}

/**
 * Degrade a good Socratic response to a direct answer
 */
function degradeToDirectAnswer(content: string, topic: string): string {
  // Remove questions
  const withoutQuestions = content.split(/\?/).slice(0, 1).join('.');

  // Add direct answer phrasing
  const directPhrases = [
    'The answer is',
    'Simply put,',
    'In short,',
    'To explain directly,',
  ];
  const randomPhrase = directPhrases[Math.floor(Math.random() * directPhrases.length)];

  // Simplify to a direct statement
  const simplified = withoutQuestions
    .replace(/let's think about/gi, '')
    .replace(/what do you think/gi, '')
    .replace(/consider/gi, '')
    .trim();

  return `${randomPhrase} ${simplified}. This is an important concept in ${topic}.`;
}

// ============================================
// DATA STATISTICS
// ============================================

export type ExportStats = {
  totalSessions: number;
  totalTurns: number;
  avgQualityScore: number;
  avgOutcomeScore: number;
  topicDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
};

export function calculateExportStats(sessions: TutoringSession[]): ExportStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalTurns: 0,
      avgQualityScore: 0,
      avgOutcomeScore: 0,
      topicDistribution: {},
      difficultyDistribution: {},
    };
  }

  const topicDistribution: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = {};
  let totalTurns = 0;
  let totalQuality = 0;
  let totalOutcome = 0;

  for (const session of sessions) {
    totalTurns += session.totalTurns;
    totalQuality += session.qualityMetrics.socraticRatio;
    totalOutcome += session.outcomes.overallOutcomeScore;

    topicDistribution[session.lessonTitle] =
      (topicDistribution[session.lessonTitle] || 0) + 1;

    difficultyDistribution[session.userStateAtStart.adaptiveDifficulty] =
      (difficultyDistribution[session.userStateAtStart.adaptiveDifficulty] || 0) + 1;
  }

  return {
    totalSessions: sessions.length,
    totalTurns,
    avgQualityScore: totalQuality / sessions.length,
    avgOutcomeScore: totalOutcome / sessions.length,
    topicDistribution,
    difficultyDistribution,
  };
}
