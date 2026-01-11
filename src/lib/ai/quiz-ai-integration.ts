/**
 * Quiz AI Integration
 * Phase 4.2: Embed Sage into quiz flow
 *
 * Provides:
 * - Pre-answer Socratic hints
 * - Post-answer dialogue (not just static explanation)
 * - Adaptive difficulty suggestions
 *
 * Cost: $0 (uses FREE AI orchestrator)
 */

import { getAIOrchestrator } from './orchestrator';
import type { AIMessage } from './providers/interfaces';
import type { StruggleAnalysis } from './struggle-detection';

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
};

export type SocraticHint = {
  hint: string;
  level: 1 | 2 | 3; // Progressive disclosure
  isSocratic: boolean; // Should end with question
};

/**
 * Generate pre-answer Socratic hint
 * Guides student reasoning WITHOUT giving answer
 */
export async function generatePreAnswerHint(
  question: QuizQuestion,
  userMastery: number,
  attemptNumber: number
): Promise<SocraticHint> {
  const orchestrator = getAIOrchestrator();

  // Determine hint level based on attempt
  const level = Math.min(attemptNumber, 3) as 1 | 2 | 3;

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, a Socratic tutor. Generate a hint for this quiz question.

CRITICAL: NEVER give the answer directly. Guide student's thinking through a question.

Hint Level ${level}:
- Level 1 (Subtle): Ask about the concept, help them recall knowledge
- Level 2 (Moderate): Guide toward elimination strategy
- Level 3 (Strong): Lead them very close, but still end with a question

Format: 1-2 sentences ending with a question that guides their reasoning.`,
    },
    {
      role: 'user',
      content: `Question: ${question.question}

Options:
${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

User's mastery of this topic: ${userMastery}%
This is attempt #${attemptNumber}

Generate a Level ${level} Socratic hint.`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');

    return {
      hint: result.content,
      level,
      isSocratic: result.content.includes('?'),
    };
  } catch (error) {
    // Fallback to generic hint if AI fails
    return {
      hint: 'Think about what information would help you eliminate the wrong answers. What do you already know about this topic?',
      level,
      isSocratic: true,
    };
  }
}

/**
 * Generate post-answer dialogue
 * Turns static explanation into conversation
 */
export async function generatePostAnswerDialogue(
  question: QuizQuestion,
  userAnswer: number,
  isCorrect: boolean
): Promise<string> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, a Socratic tutor providing feedback on a quiz answer.

${isCorrect ? 'The student answered CORRECTLY.' : 'The student answered INCORRECTLY.'}

Your task:
1. ${isCorrect ? 'Celebrate their reasoning' : 'Help them understand why they were wrong'}
2. Ask a follow-up question that deepens understanding
3. ${!isCorrect ? 'Guide them to the right answer through questions' : 'Connect to practical application'}

Keep it conversational and encouraging (2-3 sentences + question).`,
    },
    {
      role: 'user',
      content: `Question: ${question.question}

Correct Answer: ${question.options[question.correctAnswer]}
User Selected: ${question.options[userAnswer]}

Standard Explanation: ${question.explanation}

Generate a conversational response that ${isCorrect ? 'celebrates and deepens' : 'corrects and guides'} their understanding.`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');
    return result.content;
  } catch (error) {
    // Fallback to static explanation
    return isCorrect
      ? `That's right! ${question.explanation}`
      : `Not quite. ${question.explanation} Try thinking about it from this angle: what makes the correct answer different from your choice?`;
  }
}

/**
 * Generate adaptive next-step suggestion after quiz
 */
export async function suggestNextStep(
  quizScore: number,
  userProgress: {
    currentCourseId: string;
    currentLessonId: string;
    masteryLevels: Record<string, number>;
  }
): Promise<{
  suggestion: string;
  action: 'continue' | 'review' | 'practice' | 'advanced';
}> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, suggesting the best next step after a quiz.

Based on quiz score:
- 90-100%: Suggest advanced content or moving forward
- 70-89%: Encourage to continue, maybe quick practice
- 50-69%: Suggest reviewing weak areas before continuing
- <50%: Strongly recommend prerequisite review

Be encouraging and specific. Reference their actual performance.`,
    },
    {
      role: 'user',
      content: `Quiz Score: ${quizScore}%

Average mastery: ${Math.round(Object.values(userProgress.masteryLevels).reduce((a, b) => a + b, 0) / Object.values(userProgress.masteryLevels).length)}%

What should the student do next? Be specific and encouraging.`,
    },
  ];

  try {
    const result = await orchestrator.generate(messages);

    // Determine action from score
    let action: 'continue' | 'review' | 'practice' | 'advanced' = 'continue';

    if (quizScore >= 90) action = 'advanced';
    else if (quizScore >= 70) action = 'continue';
    else if (quizScore >= 50) action = 'practice';
    else action = 'review';

    return {
      suggestion: result.content,
      action,
    };
  } catch (error) {
    // Fallback suggestion
    const fallbacks = {
      advanced: "Excellent work! You're ready for more advanced scenarios.",
      continue: 'Good job! Ready to move on to the next lesson?',
      practice: 'Good effort! Some practice exercises would help solidify this.',
      review: "Let's review the fundamentals to strengthen your foundation.",
    };

    const action = quizScore >= 90 ? 'advanced' : quizScore >= 70 ? 'continue' : quizScore >= 50 ? 'practice' : 'review';

    return {
      suggestion: fallbacks[action],
      action,
    };
  }
}

/**
 * Proactive intervention trigger
 * Decides when to interrupt user with helpful AI guidance
 */
export function shouldTriggerProactiveIntervention(
  struggleAnalysis: StruggleAnalysis,
  lastInterventionTime: number | null,
  userPreferences: {
    proactiveAIEnabled: boolean;
    interventionFrequency: 'minimal' | 'moderate' | 'frequent';
  }
): boolean {
  // Respect user preferences
  if (!userPreferences.proactiveAIEnabled) return false;

  // Don't intervene if score below threshold
  if (!struggleAnalysis.shouldIntervene) return false;

  // Rate limiting: Don't intervene more than once per 10 minutes
  if (lastInterventionTime && Date.now() - lastInterventionTime < 10 * 60 * 1000) {
    return false;
  }

  // Frequency preference
  const thresholds = {
    minimal: 70, // Only intervene on severe struggle
    moderate: 50, // Intervene on moderate+ struggle
    frequent: 30, // Intervene on mild+ struggle
  };

  return struggleAnalysis.score >= thresholds[userPreferences.interventionFrequency];
}
