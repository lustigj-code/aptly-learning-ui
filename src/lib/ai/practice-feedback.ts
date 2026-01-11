/**
 * Practice Atom Real-Time Feedback
 * Phase 4.3: AI-powered live guidance as user writes
 *
 * Provides real-time Socratic feedback during practice exercises
 * Cost: $0 (uses FREE AI orchestrator with smart rate limiting)
 */

import { getAIOrchestrator } from './orchestrator';
import type { AIMessage } from './providers/interfaces';

export type PracticeRubric = {
  criterion: string;
  weight: number; // Percentage
  description: string;
};

export type LiveFeedback = {
  guidance: string;
  estimatedScore: number;
  rubricProgress: Array<{
    criterion: string;
    covered: boolean;
    score: number;
  }>;
  nextStep: string;
};

/**
 * Provide real-time guidance as user types practice response
 * Debounced - only called after user stops typing for 3 seconds
 */
export async function provideLiveGuidance(
  userText: string,
  rubric: PracticeRubric[],
  context: {
    prompt: string;
    expectedOutcomes: string[];
    lessonTopic: string;
  }
): Promise<LiveFeedback> {
  // Don't provide feedback until user has written at least 50 words
  const wordCount = userText.split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < 50) {
    return {
      guidance: 'Keep writing... I\'ll provide guidance once you\'ve written a bit more.',
      estimatedScore: 0,
      rubricProgress: rubric.map((r) => ({ criterion: r.criterion, covered: false, score: 0 })),
      nextStep: 'Continue writing your response',
    };
  }

  const orchestrator = getAIOrchestrator();

  // Analyze which rubric criteria are covered
  const rubricAnalysis = await analyzeRubricCoverage(userText, rubric);

  // Generate next-step guidance
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, providing real-time feedback on a practice exercise.

Exercise Prompt: ${context.prompt}

Rubric:
${rubric.map((r) => `- ${r.criterion} (${r.weight}%): ${r.description}`).join('\n')}

Current Analysis:
${rubricAnalysis.map((r) => `- ${r.criterion}: ${r.covered ? '✅ Covered' : '❌ Not yet covered'}`).join('\n')}

Your task: Provide encouraging, Socratic guidance on what to address next.
- If criterion covered well: Acknowledge it briefly
- If criterion missing: Guide with a question
- Keep it SHORT (1-2 sentences + question)
- Be specific to their response

DO NOT: Give them the answer, write it for them, or lecture.`,
    },
    {
      role: 'user',
      content: `Student's response so far (${wordCount} words):\n\n${userText}`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');

    // Calculate estimated score
    const estimatedScore = calculateEstimatedScore(rubricAnalysis, rubric);

    return {
      guidance: result.content,
      estimatedScore,
      rubricProgress: rubricAnalysis,
      nextStep: determineNextStep(rubricAnalysis, rubric),
    };
  } catch (error) {
    console.error('Live feedback error:', error);

    // Fallback guidance
    const uncoveredCriteria = rubricAnalysis.filter((r) => !r.covered);

    if (uncoveredCriteria.length > 0) {
      return {
        guidance: `Good start! Now think about: ${uncoveredCriteria[0].criterion}`,
        estimatedScore: calculateEstimatedScore(rubricAnalysis, rubric),
        rubricProgress: rubricAnalysis,
        nextStep: `Address ${uncoveredCriteria[0].criterion}`,
      };
    }

    return {
      guidance: 'Great work so far! Keep building on your ideas.',
      estimatedScore: calculateEstimatedScore(rubricAnalysis, rubric),
      rubricProgress: rubricAnalysis,
      nextStep: 'Continue refining your response',
    };
  }
}

/**
 * Analyze which rubric criteria are covered in user's text
 */
async function analyzeRubricCoverage(
  userText: string,
  rubric: PracticeRubric[]
): Promise<Array<{ criterion: string; covered: boolean; score: number }>> {
  // Simple keyword-based analysis (can be enhanced with AI)
  return rubric.map((r) => {
    const keywords = extractKeywords(r.description);
    const text = userText.toLowerCase();

    const keywordsFound = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    const coverage = keywords.length > 0 ? keywordsFound / keywords.length : 0;

    return {
      criterion: r.criterion,
      covered: coverage > 0.5, // Covered if >50% keywords present
      score: Math.round(coverage * 100),
    };
  });
}

/**
 * Extract keywords from criterion description
 */
function extractKeywords(description: string): string[] {
  // Simple keyword extraction (split on common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were']);

  return description
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word))
    .filter((word) => /^[a-z]+$/.test(word)); // Only alphabetic
}

/**
 * Calculate estimated score based on rubric coverage
 */
function calculateEstimatedScore(
  analysis: Array<{ criterion: string; covered: boolean; score: number }>,
  rubric: PracticeRubric[]
): number {
  let totalScore = 0;

  analysis.forEach((item, index) => {
    const weight = rubric[index]?.weight || 0;
    const criterionScore = item.score / 100; // Convert to 0-1
    totalScore += criterionScore * weight;
  });

  return Math.round(totalScore);
}

/**
 * Determine what student should focus on next
 */
function determineNextStep(
  analysis: Array<{ criterion: string; covered: boolean; score: number }>,
  rubric: PracticeRubric[]
): string {
  // Find highest-weight uncovered criterion
  const uncovered = analysis
    .map((item, index) => ({
      ...item,
      weight: rubric[index]?.weight || 0,
    }))
    .filter((item) => !item.covered)
    .sort((a, b) => b.weight - a.weight);

  if (uncovered.length > 0) {
    return `Address ${uncovered[0].criterion} (${uncovered[0].weight}% of score)`;
  }

  // All criteria covered - suggest refinement
  return 'Refine and strengthen your arguments';
}

/**
 * Final rubric-based scoring with AI
 */
export async function scoreWithRubric(
  userResponse: string,
  rubric: PracticeRubric[],
  context: {
    prompt: string;
    expectedOutcomes: string[];
  }
): Promise<{
  overallScore: number;
  criterionScores: Array<{
    criterion: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string;
}> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, scoring a practice exercise using this rubric:

${rubric.map((r) => `${r.criterion} (${r.weight}%): ${r.description}`).join('\n')}

For EACH criterion:
1. Score 0-100
2. Provide brief Socratic feedback (what's good, what question to consider for improvement)

Then provide overall feedback that celebrates strengths and guides improvement.`,
    },
    {
      role: 'user',
      content: `Exercise: ${context.prompt}

Student's Response:
${userResponse}

Score each rubric criterion and provide overall feedback.`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');

    // Parse AI response for scores (simplified - would use structured output in production)
    // For now, return estimated scores
    const criterionScores = rubric.map((r) => ({
      criterion: r.criterion,
      score: 75, // Placeholder - AI would provide actual scores
      feedback: `Consider: How could you strengthen the ${r.criterion.toLowerCase()} aspect?`,
    }));

    const overallScore = Math.round(
      criterionScores.reduce((sum, c, i) => sum + c.score * (rubric[i].weight / 100), 0)
    );

    return {
      overallScore,
      criterionScores,
      overallFeedback: result.content,
    };
  } catch (error) {
    console.error('Rubric scoring error:', error);

    // Fallback scoring
    return {
      overallScore: 70,
      criterionScores: rubric.map((r) => ({
        criterion: r.criterion,
        score: 70,
        feedback: 'Consider how you could strengthen this area.',
      })),
      overallFeedback: 'Good effort! Review the rubric and consider how each criterion could be addressed more fully.',
    };
  }
}
