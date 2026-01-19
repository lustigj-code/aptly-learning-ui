/**
 * Pre-Test System - Content Skipping
 *
 * Allows learners to test out of content they already know:
 * - Generate adaptive pre-test questions for skills
 * - Evaluate pre-test results
 * - Mark skills as mastered if passed
 * - Skip content when prerequisites already met
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from '@/lib/firebase/admin';
import { AI_AT_WORK_SKILL_MAP, getSkillName, getSkillsForLesson } from '@/data/skillMap';
import { type SkillState } from '@/lib/mastery/bkt';

// ============================================
// TYPES
// ============================================

export interface PretestQuestion {
  id: string;
  skillId: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface PretestAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  timeSpentSeconds: number;
}

export interface PretestResult {
  skillId: string;
  passed: boolean;
  score: number; // 0-100
  canSkip: boolean;
  questionsAsked: number;
  questionsCorrect: number;
  recommendation: 'skip' | 'learn' | 'review';
  skillsMastered: string[];
  timeSpentSeconds: number;
}

export interface LessonPretestResult {
  lessonId: string;
  overallScore: number;
  canSkipLesson: boolean;
  skillResults: PretestResult[];
  recommendation: 'skip_all' | 'skip_some' | 'learn_all';
  timeSpentSeconds: number;
}

// ============================================
// PRE-TEST QUESTION BANK
// ============================================

// Static question bank for deterministic pre-tests
const PRETEST_QUESTIONS: Record<string, PretestQuestion[]> = {
  'M1-genai-definition': [
    {
      id: 'pt-m1-genai-1',
      skillId: 'M1-genai-definition',
      question: 'What is the primary capability that distinguishes generative AI from traditional AI?',
      options: [
        'Processing data faster',
        'Creating new content like text, images, and code',
        'Storing more information',
        'Running on smaller devices',
      ],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Generative AI is specifically designed to create new content, unlike traditional AI which typically classifies or predicts.',
    },
    {
      id: 'pt-m1-genai-2',
      skillId: 'M1-genai-definition',
      question: 'Which of the following is an example of generative AI?',
      options: [
        'A spam filter that classifies emails',
        'A recommendation system suggesting movies',
        'ChatGPT creating a business email draft',
        'A calculator performing math operations',
      ],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'ChatGPT creates new content (email drafts), while spam filters classify and recommendations predict preferences.',
    },
  ],
  'M1-llm-explanation': [
    {
      id: 'pt-m1-llm-1',
      skillId: 'M1-llm-explanation',
      question: 'How do Large Language Models (LLMs) like ChatGPT generate responses?',
      options: [
        'By searching a database of pre-written answers',
        'By predicting the most likely next words based on patterns learned from training data',
        'By copying text from websites',
        'By following a fixed decision tree',
      ],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'LLMs are trained to predict the next most likely token based on statistical patterns in their training data.',
    },
  ],
  'M1-chatgpt-strengths': [
    {
      id: 'pt-m1-str-1',
      skillId: 'M1-chatgpt-strengths',
      question: 'Which task is ChatGPT particularly well-suited for?',
      options: [
        'Performing complex mathematical calculations',
        'Drafting and refining written content',
        'Accessing real-time stock prices',
        'Executing code on remote servers',
      ],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'ChatGPT excels at language tasks like drafting, editing, and refining written content.',
    },
  ],
  'M2-prompt-components': [
    {
      id: 'pt-m2-pc-1',
      skillId: 'M2-prompt-components',
      question: 'What does the "R" in the RTCF prompt framework stand for?',
      options: [
        'Response',
        'Role',
        'Result',
        'Reference',
      ],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'RTCF stands for Role, Task, Context, Format - the key components of an effective prompt.',
    },
    {
      id: 'pt-m2-pc-2',
      skillId: 'M2-prompt-components',
      question: 'Which prompt component helps the AI understand the desired output structure?',
      options: [
        'Role',
        'Task',
        'Context',
        'Format',
      ],
      correctIndex: 3,
      difficulty: 'medium',
      explanation: 'The Format component specifies how the output should be structured (bullet points, table, essay, etc.).',
    },
  ],
  'M2-prompt-writing': [
    {
      id: 'pt-m2-pw-1',
      skillId: 'M2-prompt-writing',
      question: 'Which is the most effective prompt for getting a professional email draft?',
      options: [
        'Write an email',
        'Act as a professional communication specialist. Write a polite email declining a meeting invitation, keeping it under 100 words.',
        'Help me with email',
        'Email for meeting decline please',
      ],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'The second option includes role, task, context, and format constraints for better results.',
    },
  ],
};

// ============================================
// MAIN PRE-TEST FUNCTIONS
// ============================================

/**
 * Generate adaptive pre-test for a skill
 */
export async function generatePretest(
  userId: string,
  skillId: string,
  maxQuestions: number = 3
): Promise<PretestQuestion[]> {
  const questions = PRETEST_QUESTIONS[skillId] || [];

  if (questions.length >= maxQuestions) {
    return questions.slice(0, maxQuestions);
  }

  // If we don't have enough static questions, generate with AI
  if (questions.length < maxQuestions) {
    try {
      const generatedQuestions = await generateQuestionsWithAI(skillId, maxQuestions - questions.length);
      return [...questions, ...generatedQuestions];
    } catch (error) {
      console.warn('Failed to generate AI questions, using static only:', error);
      return questions;
    }
  }

  return questions;
}

/**
 * Evaluate pre-test and determine if user can skip
 */
export async function evaluatePretest(
  userId: string,
  skillId: string,
  answers: PretestAnswer[]
): Promise<PretestResult> {
  const correctAnswers = answers.filter(a => a.correct).length;
  const totalQuestions = answers.length;
  const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const totalTime = answers.reduce((sum, a) => sum + a.timeSpentSeconds, 0);

  // Determine recommendation based on score
  let recommendation: 'skip' | 'learn' | 'review';
  let canSkip = false;
  const skillsMastered: string[] = [];

  if (score >= 80) {
    recommendation = 'skip';
    canSkip = true;
    skillsMastered.push(skillId);

    // Mark skill as mastered in Firestore
    await markSkillAsMastered(userId, skillId, score);
  } else if (score >= 50) {
    recommendation = 'review';
  } else {
    recommendation = 'learn';
  }

  // Log pre-test result for analytics
  await logPretestResult(userId, skillId, {
    score,
    passed: canSkip,
    questionsAsked: totalQuestions,
    questionsCorrect: correctAnswers,
    timeSpentSeconds: totalTime,
  });

  return {
    skillId,
    passed: canSkip,
    score: Math.round(score),
    canSkip,
    questionsAsked: totalQuestions,
    questionsCorrect: correctAnswers,
    recommendation,
    skillsMastered,
    timeSpentSeconds: totalTime,
  };
}

/**
 * Bulk pre-test for a lesson (test all skills)
 */
export async function pretestLesson(
  userId: string,
  lessonId: string
): Promise<LessonPretestResult> {
  const skillIds = getSkillsForLesson(lessonId);
  const skillResults: PretestResult[] = [];
  const totalTime = 0;

  for (const skillId of skillIds) {
    // Generate pre-test for each skill
    const questions = await generatePretest(userId, skillId, 2);

    if (questions.length === 0) continue;

    // Run the test (in practice, this would be interactive)
    // For now, we'll create a placeholder result
    skillResults.push({
      skillId,
      passed: false,
      score: 0,
      canSkip: false,
      questionsAsked: questions.length,
      questionsCorrect: 0,
      recommendation: 'learn',
      skillsMastered: [],
      timeSpentSeconds: 0,
    });
  }

  // Calculate overall score
  const totalScore = skillResults.length > 0
    ? skillResults.reduce((sum, r) => sum + r.score, 0) / skillResults.length
    : 0;

  // Determine overall recommendation
  const passedCount = skillResults.filter(r => r.passed).length;
  let recommendation: 'skip_all' | 'skip_some' | 'learn_all';

  if (passedCount === skillResults.length && passedCount > 0) {
    recommendation = 'skip_all';
  } else if (passedCount > 0) {
    recommendation = 'skip_some';
  } else {
    recommendation = 'learn_all';
  }

  return {
    lessonId,
    overallScore: Math.round(totalScore),
    canSkipLesson: recommendation === 'skip_all',
    skillResults,
    recommendation,
    timeSpentSeconds: totalTime,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate questions using AI when static questions aren't available
 */
async function generateQuestionsWithAI(
  skillId: string,
  count: number
): Promise<PretestQuestion[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return [];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const skillName = getSkillName(skillId);

  const prompt = `Generate ${count} multiple-choice questions to test knowledge of: "${skillName}"

Requirements:
- Each question should have 4 options
- Questions should test understanding, not memorization
- Include a mix of difficulty levels
- Provide a brief explanation for the correct answer

Return JSON array:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "difficulty": "easy|medium|hard",
    "explanation": "..."
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const questions = JSON.parse(jsonMatch[0]);

    return questions.map((q: {
      question: string;
      options: string[];
      correctIndex: number;
      difficulty: 'easy' | 'medium' | 'hard';
      explanation: string;
    }, i: number) => ({
      id: `pt-gen-${skillId}-${Date.now()}-${i}`,
      skillId,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation || '',
    }));
  } catch (error) {
    console.error('Failed to generate AI questions:', error);
    return [];
  }
}

/**
 * Mark a skill as mastered from pre-test
 */
async function markSkillAsMastered(
  userId: string,
  skillId: string,
  score: number
): Promise<void> {
  try {
    const _skill = AI_AT_WORK_SKILL_MAP.skills[skillId];

    // Create state with high mastery from pre-test success
    const state: SkillState = {
      skillId,
      pMastery: 0.95, // Pre-test pass = mastery
      attempts: 1,
      correctCount: 1,
      lastAttempt: new Date(),
      history: [
        {
          timestamp: new Date(),
          correct: true,
          pMasteryAfter: 0.95,
        },
      ],
    };

    // Save to Firestore
    await adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills')
      .doc(skillId)
      .set({
        ...state,
        lastAttempt: new Date(),
        pretestPassed: true,
        pretestScore: score,
        masteredViaPretest: true,
      }, { merge: true });

    console.log(`[Pretest] Skill ${skillId} marked as mastered for user ${userId}`);
  } catch (error) {
    console.error('Failed to mark skill as mastered:', error);
  }
}

/**
 * Log pre-test result for analytics
 */
async function logPretestResult(
  userId: string,
  skillId: string,
  result: {
    score: number;
    passed: boolean;
    questionsAsked: number;
    questionsCorrect: number;
    timeSpentSeconds: number;
  }
): Promise<void> {
  try {
    await adminDb.collection('pretestResults').add({
      userId,
      skillId,
      ...result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.warn('Failed to log pre-test result:', error);
  }
}

/**
 * Get pre-test eligibility for a skill
 */
export function canTakePretest(skillId: string, completedAtoms: string[]): boolean {
  const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
  if (!skill) return false;

  // Can't pre-test a skill if you've already completed its content
  const lessonId = skill.lessonId;
  const hasCompletedLessonContent = completedAtoms.some(atomId =>
    atomId.includes(lessonId)
  );

  return !hasCompletedLessonContent;
}

/**
 * Get recommended pre-test skills for a user starting a lesson
 */
export function getRecommendedPretestSkills(
  lessonId: string,
  currentSkillStates: Record<string, SkillState>,
  completedAtoms: string[]
): string[] {
  const skillIds = getSkillsForLesson(lessonId);

  return skillIds.filter(skillId => {
    // Skip if already mastered
    const state = currentSkillStates[skillId];
    if (state && state.pMastery >= 0.95) return false;

    // Skip if already taken content
    if (!canTakePretest(skillId, completedAtoms)) return false;

    return true;
  });
}

// ============================================
// EXPORTS
// ============================================

export { PRETEST_QUESTIONS };
