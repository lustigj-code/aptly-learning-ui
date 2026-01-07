/**
 * Evaluation Framework for Tutor Quality
 *
 * Defines metrics, automated evaluation, and A/B testing
 * for comparing tutor models and measuring improvement.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { type TutoringSession, type ConversationTurn } from './schema';

// ============================================
// EVALUATION METRICS
// ============================================

export type EvaluationDimension =
  | 'socratic_method'      // Does it guide discovery through questions?
  | 'accuracy'             // Is the content factually correct?
  | 'clarity'              // Is the explanation clear and understandable?
  | 'engagement'           // Does it maintain student interest?
  | 'adaptation'           // Does it adapt to student level?
  | 'emotional_support'    // Does it handle emotions appropriately?
  | 'scaffolding'          // Does it break down complex concepts?
  | 'example_quality'      // Are examples relevant and helpful?
  | 'learning_outcome';    // Did the student actually learn?

export type DimensionScore = {
  dimension: EvaluationDimension;
  score: number;         // 1-5
  reasoning: string;
  evidence: string[];
};

export type TurnEvaluation = {
  turnIndex: number;
  role: 'tutor';
  content: string;
  scores: DimensionScore[];
  overallScore: number;
  flags: {
    gaveDirectAnswer: boolean;
    missedTeachableMoment: boolean;
    factualError: boolean;
    inappropriateResponse: boolean;
  };
  suggestions: string[];
};

export type SessionEvaluation = {
  sessionId: string;
  turnEvaluations: TurnEvaluation[];
  aggregateScores: Record<EvaluationDimension, number>;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  evaluatedAt: Date;
  evaluatorType: 'human' | 'automated' | 'llm-judge';
};

// ============================================
// LLM-AS-JUDGE EVALUATION
// ============================================

const EVAL_SYSTEM_PROMPT = `You are an expert evaluator of AI tutoring quality, specifically for Socratic teaching methods.

Your task is to evaluate tutor responses based on these criteria:

1. SOCRATIC_METHOD (1-5):
   - 5: Purely uses questions to guide discovery, never gives direct answers
   - 4: Mostly Socratic, occasionally provides hints
   - 3: Mix of questions and explanations
   - 2: Mostly direct explanation with occasional questions
   - 1: Just gives answers directly

2. CLARITY (1-5):
   - 5: Crystal clear, perfectly adapted to student level
   - 4: Clear with minor room for improvement
   - 3: Understandable but could be clearer
   - 2: Somewhat confusing
   - 1: Unclear or convoluted

3. ENGAGEMENT (1-5):
   - 5: Highly engaging, makes learning fun
   - 4: Good engagement, maintains interest
   - 3: Adequate engagement
   - 2: Somewhat dry or disengaging
   - 1: Boring or off-putting

4. ADAPTATION (1-5):
   - 5: Perfectly adapted to student's level and needs
   - 4: Well adapted with minor mismatches
   - 3: Generally appropriate level
   - 2: Somewhat mismatched to student level
   - 1: Completely inappropriate for student

5. EMOTIONAL_SUPPORT (1-5):
   - 5: Excellently handles emotions, encouraging and supportive
   - 4: Good emotional support
   - 3: Adequate emotional awareness
   - 2: Missed emotional cues
   - 1: Dismissive or inappropriate emotional response

For each tutor response, provide:
- Scores for each dimension (1-5)
- Brief reasoning for each score
- Specific evidence from the text
- Flags for any issues (direct answers, missed opportunities, errors)
- Suggestions for improvement

Output your evaluation as JSON.`;

/**
 * Evaluate a single tutor response using LLM-as-judge
 */
export async function evaluateTurnWithLLM(
  turn: ConversationTurn,
  context: {
    previousTurns: ConversationTurn[];
    lessonTitle: string;
    studentLevel: string;
  },
  genAI: GoogleGenerativeAI
): Promise<TurnEvaluation> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const conversationContext = context.previousTurns
    .map(t => `${t.role === 'user' ? 'Student' : 'Tutor'}: ${t.content}`)
    .join('\n\n');

  const prompt = `Evaluate this tutor response:

CONTEXT:
- Lesson: ${context.lessonTitle}
- Student Level: ${context.studentLevel}

CONVERSATION SO FAR:
${conversationContext}

TUTOR RESPONSE TO EVALUATE:
"${turn.content}"

Evaluate this response on all dimensions. Return a JSON object with this structure:
{
  "scores": {
    "socratic_method": { "score": 1-5, "reasoning": "...", "evidence": ["..."] },
    "clarity": { "score": 1-5, "reasoning": "...", "evidence": ["..."] },
    "engagement": { "score": 1-5, "reasoning": "...", "evidence": ["..."] },
    "adaptation": { "score": 1-5, "reasoning": "...", "evidence": ["..."] },
    "emotional_support": { "score": 1-5, "reasoning": "...", "evidence": ["..."] }
  },
  "flags": {
    "gaveDirectAnswer": boolean,
    "missedTeachableMoment": boolean,
    "factualError": boolean,
    "inappropriateResponse": boolean
  },
  "suggestions": ["..."]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: EVAL_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent evaluation
        maxOutputTokens: 1024,
      },
    });

    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const evalData = JSON.parse(jsonMatch[0]);

    const dimensions: EvaluationDimension[] = [
      'socratic_method', 'clarity', 'engagement', 'adaptation', 'emotional_support'
    ];

    const dimensionScores: DimensionScore[] = dimensions.map(dim => ({
      dimension: dim,
      score: evalData.scores[dim]?.score || 3,
      reasoning: evalData.scores[dim]?.reasoning || '',
      evidence: evalData.scores[dim]?.evidence || [],
    }));

    const overallScore = dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;

    return {
      turnIndex: 0, // Will be set by caller
      role: 'tutor',
      content: turn.content,
      scores: dimensionScores,
      overallScore,
      flags: evalData.flags || {
        gaveDirectAnswer: false,
        missedTeachableMoment: false,
        factualError: false,
        inappropriateResponse: false,
      },
      suggestions: evalData.suggestions || [],
    };
  } catch (error) {
    console.error('LLM evaluation failed:', error);
    // Return default scores on error
    return {
      turnIndex: 0,
      role: 'tutor',
      content: turn.content,
      scores: [],
      overallScore: 3,
      flags: {
        gaveDirectAnswer: false,
        missedTeachableMoment: false,
        factualError: false,
        inappropriateResponse: false,
      },
      suggestions: ['Evaluation failed - manual review needed'],
    };
  }
}

/**
 * Evaluate an entire tutoring session
 */
export async function evaluateSession(
  session: TutoringSession,
  genAI: GoogleGenerativeAI
): Promise<SessionEvaluation> {
  const turnEvaluations: TurnEvaluation[] = [];

  // Evaluate each tutor turn
  for (let i = 0; i < session.turns.length; i++) {
    const turn = session.turns[i];
    if (turn.role !== 'tutor') continue;

    const evaluation = await evaluateTurnWithLLM(
      turn,
      {
        previousTurns: session.turns.slice(0, i),
        lessonTitle: session.lessonTitle,
        studentLevel: session.userStateAtStart.adaptiveDifficulty,
      },
      genAI
    );

    evaluation.turnIndex = i;
    turnEvaluations.push(evaluation);
  }

  // Aggregate scores
  const dimensions: EvaluationDimension[] = [
    'socratic_method', 'clarity', 'engagement', 'adaptation', 'emotional_support',
    'scaffolding', 'example_quality', 'accuracy', 'learning_outcome'
  ];

  const aggregateScores: Record<EvaluationDimension, number> = {} as Record<EvaluationDimension, number>;

  for (const dim of dimensions) {
    const scores = turnEvaluations
      .flatMap(te => te.scores)
      .filter(s => s.dimension === dim)
      .map(s => s.score);

    aggregateScores[dim] = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 3; // Default
  }

  // Calculate overall score
  const overallScore = Object.values(aggregateScores).reduce((a, b) => a + b, 0) /
                       Object.values(aggregateScores).length;

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const [dim, score] of Object.entries(aggregateScores)) {
    if (score >= 4) {
      strengths.push(`Strong ${dim.replace('_', ' ')}`);
    } else if (score <= 2) {
      weaknesses.push(`Needs improvement in ${dim.replace('_', ' ')}`);
    }
  }

  // Collect all suggestions
  const recommendations = [...new Set(turnEvaluations.flatMap(te => te.suggestions))];

  return {
    sessionId: session.id,
    turnEvaluations,
    aggregateScores,
    overallScore,
    strengths,
    weaknesses,
    recommendations,
    evaluatedAt: new Date(),
    evaluatorType: 'llm-judge',
  };
}

// ============================================
// A/B TESTING FRAMEWORK
// ============================================

export type ABTestConfig = {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  variants: ABVariant[];
  targetMetric: EvaluationDimension;
  minimumSampleSize: number;
  confidenceLevel: number; // e.g., 0.95
};

export type ABVariant = {
  id: string;
  name: string;
  description: string;
  weight: number;           // 0-1, sum of all variants should be 1
  modelId: string;          // Which model to use
  systemPromptOverride?: string;
};

export type ABTestResult = {
  testId: string;
  variant: string;
  sessionId: string;
  userId: string;
  evaluation: SessionEvaluation;
  recordedAt: Date;
};

export type ABTestAnalysis = {
  testId: string;
  variantStats: Record<string, VariantStats>;
  winner?: string;
  confidenceAchieved: boolean;
  pValue?: number;
  analysis: string;
  analyzedAt: Date;
};

export type VariantStats = {
  variantId: string;
  sampleSize: number;
  meanScore: number;
  stdDev: number;
  confidenceInterval: [number, number];
  metricScores: Record<EvaluationDimension, number>;
};

/**
 * Assign user to A/B test variant
 */
export function assignVariant(userId: string, test: ABTestConfig): ABVariant {
  // Consistent hash for user assignment
  const hash = simpleHash(userId + test.id);
  const normalized = (hash % 1000) / 1000;

  let cumulative = 0;
  for (const variant of test.variants) {
    cumulative += variant.weight;
    if (normalized < cumulative) {
      return variant;
    }
  }

  return test.variants[test.variants.length - 1];
}

/**
 * Calculate statistical significance between variants
 */
export function calculateSignificance(
  variantA: VariantStats,
  variantB: VariantStats
): { significant: boolean; pValue: number; effectSize: number } {
  // Two-sample t-test
  const n1 = variantA.sampleSize;
  const n2 = variantB.sampleSize;
  const mean1 = variantA.meanScore;
  const mean2 = variantB.meanScore;
  const s1 = variantA.stdDev;
  const s2 = variantB.stdDev;

  // Pooled standard error
  const se = Math.sqrt((s1 * s1 / n1) + (s2 * s2 / n2));

  if (se === 0) {
    return { significant: false, pValue: 1, effectSize: 0 };
  }

  // t-statistic
  const t = (mean1 - mean2) / se;

  // Degrees of freedom (Welch's approximation)
  const df = Math.pow((s1 * s1 / n1) + (s2 * s2 / n2), 2) /
             (Math.pow(s1 * s1 / n1, 2) / (n1 - 1) + Math.pow(s2 * s2 / n2, 2) / (n2 - 1));

  // Approximate p-value using normal distribution
  const pValue = 2 * (1 - normalCDF(Math.abs(t)));

  // Effect size (Cohen's d)
  const pooledStd = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  const effectSize = pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;

  return {
    significant: pValue < 0.05,
    pValue,
    effectSize,
  };
}

/**
 * Analyze A/B test results
 */
export function analyzeABTest(
  test: ABTestConfig,
  results: ABTestResult[]
): ABTestAnalysis {
  const variantStats: Record<string, VariantStats> = {};

  // Group results by variant
  const byVariant: Record<string, ABTestResult[]> = {};
  for (const result of results) {
    if (!byVariant[result.variant]) {
      byVariant[result.variant] = [];
    }
    byVariant[result.variant].push(result);
  }

  // Calculate stats for each variant
  for (const [variantId, variantResults] of Object.entries(byVariant)) {
    const scores = variantResults.map(r => r.evaluation.overallScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval
    const marginOfError = 1.96 * (stdDev / Math.sqrt(scores.length));

    // Aggregate metric scores
    const metricScores: Record<EvaluationDimension, number> = {} as Record<EvaluationDimension, number>;
    const dimensions: EvaluationDimension[] = [
      'socratic_method', 'clarity', 'engagement', 'adaptation', 'emotional_support'
    ];

    for (const dim of dimensions) {
      const dimScores = variantResults.map(r => r.evaluation.aggregateScores[dim] || 0);
      metricScores[dim] = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;
    }

    variantStats[variantId] = {
      variantId,
      sampleSize: scores.length,
      meanScore: mean,
      stdDev,
      confidenceInterval: [mean - marginOfError, mean + marginOfError],
      metricScores,
    };
  }

  // Determine winner
  let winner: string | undefined;
  let confidenceAchieved = false;
  let pValue: number | undefined;

  const variantIds = Object.keys(variantStats);
  if (variantIds.length >= 2) {
    const stats1 = variantStats[variantIds[0]];
    const stats2 = variantStats[variantIds[1]];

    if (stats1.sampleSize >= test.minimumSampleSize &&
        stats2.sampleSize >= test.minimumSampleSize) {

      const significance = calculateSignificance(stats1, stats2);
      pValue = significance.pValue;
      confidenceAchieved = significance.significant;

      if (confidenceAchieved) {
        winner = stats1.meanScore > stats2.meanScore ? variantIds[0] : variantIds[1];
      }
    }
  }

  // Generate analysis text
  let analysis = `A/B Test Analysis for "${test.name}"\n\n`;
  for (const [id, stats] of Object.entries(variantStats)) {
    analysis += `${id}: Mean=${stats.meanScore.toFixed(2)}, StdDev=${stats.stdDev.toFixed(2)}, N=${stats.sampleSize}\n`;
  }

  if (confidenceAchieved && winner) {
    analysis += `\nWINNER: ${winner} with p-value ${pValue?.toFixed(4)}`;
  } else if (pValue !== undefined) {
    analysis += `\nNo significant difference yet (p=${pValue.toFixed(4)}). Need more samples.`;
  } else {
    analysis += `\nInsufficient data for statistical analysis.`;
  }

  return {
    testId: test.id,
    variantStats,
    winner,
    confidenceAchieved,
    pValue,
    analysis,
    analyzedAt: new Date(),
  };
}

// ============================================
// EVALUATION DATASET GENERATION
// ============================================

export type EvalDatasetEntry = {
  id: string;
  prompt: string;
  expectedBehavior: string;
  topic: string;
  difficulty: string;
  studentContext: string;
  evaluationCriteria: string[];
  idealResponse?: string;
};

/**
 * Generate evaluation dataset entries from high-quality sessions
 */
export function generateEvalDataset(
  sessions: TutoringSession[],
  maxEntries: number = 100
): EvalDatasetEntry[] {
  const entries: EvalDatasetEntry[] = [];

  for (const session of sessions) {
    if (entries.length >= maxEntries) break;

    // Only use high-quality sessions
    if (session.qualityMetrics.socraticRatio < 0.7) continue;
    if (session.outcomes.overallOutcomeScore < 0.6) continue;

    for (let i = 0; i < session.turns.length; i++) {
      if (entries.length >= maxEntries) break;

      const turn = session.turns[i];
      if (turn.role !== 'user') continue;

      const nextTurn = session.turns[i + 1];
      if (!nextTurn || nextTurn.role !== 'tutor') continue;

      // Skip short exchanges
      if (turn.content.length < 20) continue;

      const context = session.turns.slice(0, i)
        .map(t => `${t.role}: ${t.content}`)
        .join('\n');

      entries.push({
        id: `eval_${session.id}_${i}`,
        prompt: context ? `${context}\n\nuser: ${turn.content}` : `user: ${turn.content}`,
        expectedBehavior: 'Socratic response that guides discovery through questions',
        topic: session.lessonTitle,
        difficulty: session.userStateAtStart.adaptiveDifficulty,
        studentContext: `Mastery: ${session.userStateAtStart.masteryLevel}%, ` +
                        `Struggling with: ${session.userStateAtStart.strugglingConcepts.join(', ') || 'None'}`,
        evaluationCriteria: [
          'Uses Socratic method (asks questions instead of giving answers)',
          'Maintains engagement through relevant examples',
          'Adapts to student level',
          'Ends with a follow-up question',
        ],
        idealResponse: nextTurn.metadata.isSocratic ? nextTurn.content : undefined,
      });
    }
  }

  return entries;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function normalCDF(x: number): number {
  // Approximation of normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
