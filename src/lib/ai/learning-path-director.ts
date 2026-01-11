/**
 * Learning Path AI Director
 * Phase 7.2: Dynamic lesson sequencing and just-in-time knowledge
 *
 * AI-powered personalization of learning path
 * Cost: $0 (uses FREE AI orchestrator)
 */

import { getAIOrchestrator } from './orchestrator';
import { predictStruggle, optimizeLearningPath } from './predictive-analytics';
import type { UserLearningFeatures } from './predictive-analytics';
import type { AIMessage } from './providers/interfaces';

export type LessonSequence = {
  lessonId: string;
  order: number;
  reasoning: string;
  recommendationStrength: 'highly_recommended' | 'recommended' | 'available' | 'wait';
};

export type MicroLesson = {
  conceptId: string;
  title: string;
  duration: number; // minutes
  content: string;
  keyTakeaway: string;
  quickCheck: {
    question: string;
    answer: string;
  };
};

/**
 * Generate personalized lesson sequence
 * Reorders based on prerequisites, predictions, and goals
 */
export async function generatePersonalizedSequence(
  availableLessons: Array<{
    id: string;
    title: string;
    difficulty: string;
    prerequisites: string[];
    estimatedMinutes: number;
  }>,
  userFeatures: UserLearningFeatures,
  userMastery: Record<string, number>,
  userGoal: 'certification' | 'practical' | 'career_change'
): Promise<LessonSequence[]> {
  // Use predictive analytics to optimize path
  const optimized = optimizeLearningPath(availableLessons, userFeatures, userMastery);

  // Add goal-aware weighting
  const goalWeighted = applyGoalWeighting(optimized, userGoal, availableLessons);

  // Generate AI reasoning for top recommendations
  const orchestrator = getAIOrchestrator();

  const topLessons = goalWeighted.slice(0, 5);

  try {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are Sage, explaining why these lessons are recommended in this order.

User goal: ${userGoal}
Current mastery: ${Object.entries(userMastery).map(([k, v]) => `${k}: ${v}%`).join(', ')}

Explain the reasoning briefly and encouragingly.`,
      },
      {
        role: 'user',
        content: `Recommended sequence:\n${topLessons.map((l, i) => `${i + 1}. ${availableLessons.find(lesson => lesson.id === l.lessonId)?.title}`).join('\n')}

Why this order?`,
      },
    ];

    const result = await orchestrator.generate(messages);

    // Enhance with AI reasoning
    return goalWeighted.map((item, index) => ({
      lessonId: item.lessonId,
      order: index + 1,
      reasoning: index < 5 ? result.content : item.reasoning,
      recommendationStrength: getStrength(item.recommendationScore),
    }));
  } catch (error) {
    // Fallback to score-based reasoning
    return goalWeighted.map((item, index) => ({
      lessonId: item.lessonId,
      order: index + 1,
      reasoning: item.reasoning,
      recommendationStrength: getStrength(item.recommendationScore),
    }));
  }
}

/**
 * Apply goal-specific weighting
 */
function applyGoalWeighting(
  optimized: Array<{ lessonId: string; recommendationScore: number; reasoning: string }>,
  goal: string,
  lessons: Array<{ id: string; title: string }>
): typeof optimized {
  return optimized.map((item) => {
    let bonus = 0;
    const lesson = lessons.find((l) => l.id === item.lessonId);
    const title = lesson?.title.toLowerCase() || '';

    if (goal === 'certification') {
      // Boost exam-heavy topics
      if (title.includes('objective') || title.includes('measurement') || title.includes('optimization')) {
        bonus = 10;
      }
    } else if (goal === 'practical') {
      // Boost hands-on topics
      if (title.includes('campaign') || title.includes('creative') || title.includes('strategy')) {
        bonus = 10;
      }
    } else if (goal === 'career_change') {
      // Boost foundational + portfolio topics
      if (title.includes('fundamental') || title.includes('portfolio') || title.includes('industry')) {
        bonus = 10;
      }
    }

    return {
      ...item,
      recommendationScore: item.recommendationScore + bonus,
    };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);
}

function getStrength(score: number): LessonSequence['recommendationStrength'] {
  if (score >= 80) return 'highly_recommended';
  if (score >= 60) return 'recommended';
  if (score >= 40) return 'available';
  return 'wait';
}

/**
 * Generate micro-lesson for just-in-time knowledge
 */
export async function generateMicroLesson(
  conceptId: string,
  userGap: string
): Promise<MicroLesson> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, creating a 2-3 minute micro-lesson.

Topic: ${conceptId}
User's gap: ${userGap}

Create:
1. Clear, concise explanation (2-3 paragraphs)
2. One key takeaway
3. Quick check question to verify understanding

Keep it SHORT - they need this knowledge right now for an upcoming task.`,
    },
    {
      role: 'user',
      content: `Create a micro-lesson on ${conceptId}`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');

    return {
      conceptId,
      title: `Quick Refresher: ${conceptId}`,
      duration: 2,
      content: result.content,
      keyTakeaway: extractKeyTakeaway(result.content),
      quickCheck: {
        question: extractQuestion(result.content),
        answer: 'See explanation above',
      },
    };
  } catch (error) {
    // Fallback micro-lesson
    return {
      conceptId,
      title: `${conceptId} Refresher`,
      duration: 2,
      content: `Review the key concepts of ${conceptId} before proceeding.`,
      keyTakeaway: `Understanding ${conceptId} is essential for what comes next.`,
      quickCheck: {
        question: `What is the main purpose of ${conceptId}?`,
        answer: 'Review your notes',
      },
    };
  }
}

function extractKeyTakeaway(text: string): string {
  const sentences = text.split(/[.!]+/);
  return sentences.find((s) => s.includes('key') || s.includes('important') || s.includes('remember')) || sentences[0] || 'Review this concept thoroughly';
}

function extractQuestion(text: string): string {
  const questions = text.split('\n').filter((line) => line.includes('?'));
  return questions[0] || 'What did you learn from this refresher?';
}

/**
 * Pre-lesson readiness check
 */
export async function checkLessonReadiness(
  lessonId: string,
  prerequisites: string[],
  userMastery: Record<string, number>
): Promise<{
  ready: boolean;
  gaps: Array<{ concept: string; currentMastery: number; requiredMastery: number }>;
  recommendation: string;
  microLessonsOffered: string[];
}> {
  const gaps = prerequisites
    .map((prereq) => ({
      concept: prereq,
      currentMastery: userMastery[prereq] || 0,
      requiredMastery: 70,
    }))
    .filter((gap) => gap.currentMastery < gap.requiredMastery);

  const ready = gaps.length === 0;

  let recommendation = '';
  let microLessonsOffered: string[] = [];

  if (!ready) {
    recommendation = `I recommend strengthening ${gaps.map((g) => g.concept).join(', ')} before starting this lesson. Quick refreshers available!`;
    microLessonsOffered = gaps.map((g) => g.concept);
  } else {
    recommendation = 'You\'re well-prepared! Your prerequisites are strong. Ready to proceed?';
  }

  return {
    ready,
    gaps,
    recommendation,
    microLessonsOffered,
  };
}

/**
 * Post-lesson AI reflection
 */
export async function generatePostLessonReflection(
  lessonId: string,
  userPerformance: {
    quizScore: number;
    timeSpent: number;
    struggledOn: string[];
    acedon: string[];
  }
): Promise<{
  reflection: string;
  keyInsight: string;
  nextSteps: string[];
}> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, helping the student reflect on their learning.

They just completed a lesson. Generate:
1. Reflection on their experience (celebrate wins, normalize struggles)
2. Key insight they should remember
3. 2-3 specific next steps

Be encouraging and connect to their goals.`,
    },
    {
      role: 'user',
      content: `Lesson completed!
- Quiz score: ${userPerformance.quizScore}%
- Time spent: ${userPerformance.timeSpent} minutes
- Struggled with: ${userPerformance.struggledOn.join(', ') || 'nothing'}
- Aced: ${userPerformance.acedon.join(', ') || 'most concepts'}

Generate reflection.`,
    },
  ];

  try {
    const result = await orchestrator.generate(messages);

    return {
      reflection: result.content,
      keyInsight: extractKeyTakeaway(result.content),
      nextSteps: extractNextSteps(result.content),
    };
  } catch (error) {
    return {
      reflection: `Great work completing this lesson! Your ${userPerformance.quizScore}% score shows solid understanding.`,
      keyInsight: 'Practice and review strengthen retention.',
      nextSteps: ['Review any concepts you struggled with', 'Move on to the next lesson when ready'],
    };
  }
}

function extractNextSteps(text: string): string[] {
  const lines = text.split('\n');
  return lines
    .filter((line) => /^\d+\./.test(line.trim()) || line.includes('next'))
    .slice(0, 3)
    .map((line) => line.replace(/^\d+\.\s*/, ''));
}
