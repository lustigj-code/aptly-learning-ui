/**
 * Q-Matrix: Question-to-Skill Mapping
 *
 * Maps each quiz question to the skill(s) it tests.
 * This is critical for BKT - we need to know which skill to update
 * when a learner answers a question correctly or incorrectly.
 *
 * Also maps atoms (readings/videos) to skills they teach.
 */

// ============================================
// TYPES
// ============================================

export interface QMatrix {
  // Map question ID to array of skill IDs it tests
  questionSkills: Record<string, string[]>;
  // Map atom ID to skills it teaches (for readings/videos)
  atomSkills: Record<string, string[]>;
}

// ============================================
// MODULE 1 QUESTIONS
// ============================================

const MODULE_1_QUESTIONS: Record<string, string[]> = {
  // Lesson 1.1: Introduction to GenAI
  'q1.1.1': ['M1-genai-definition'],
  'q1.1.2': ['M1-genai-definition', 'M1-llm-explanation'],
  'q1.1.3': ['M1-llm-explanation'],
  'q1.1.4': ['M1-chatgpt-strengths'],
  'q1.1.5': ['M1-chatgpt-strengths', 'M1-chatgpt-limitations'],
  'q1.1.6': ['M1-chatgpt-limitations'],
  'q1.1.7': ['M1-workflow-opportunities'],
  'q1.1.8': ['M1-chatgpt-strengths', 'M1-workflow-opportunities'],

  // Lesson 1.2: Finding AI Opportunities
  'q1.2.1': ['M1-task-identification'],
  'q1.2.2': ['M1-task-identification', 'M1-workflow-opportunities'],
  'q1.2.3': ['M1-task-evaluation'],
  'q1.2.4': ['M1-task-evaluation', 'M1-task-identification'],
  'q1.2.5': ['M1-workflow-mapping'],
  'q1.2.6': ['M1-workflow-mapping', 'M1-task-evaluation'],

  // Lesson 1.3: Safe and Ethical AI Use
  'q1.3.1': ['M1-ethical-risks'],
  'q1.3.2': ['M1-ethical-risks', 'M1-chatgpt-limitations'],
  'q1.3.3': ['M1-hallucination-detection'],
  'q1.3.4': ['M1-hallucination-detection', 'M1-ethical-risks'],
  'q1.3.5': ['M1-safe-use-practices'],
  'q1.3.6': ['M1-safe-use-practices', 'M1-hallucination-detection'],
};

// ============================================
// MODULE 2 QUESTIONS
// ============================================

const MODULE_2_QUESTIONS: Record<string, string[]> = {
  // Lesson 2.1: Prompt Components
  'q2.1.1': ['M2-prompt-components'],
  'q2.1.2': ['M2-prompt-components'],
  'q2.1.3': ['M2-prompt-clarity'],
  'q2.1.4': ['M2-prompt-clarity', 'M2-prompt-components'],
  'q2.1.5': ['M2-prompt-mistakes'],
  'q2.1.6': ['M2-prompt-mistakes', 'M2-prompt-clarity'],
  'q2.1.7': ['M2-prompt-writing'],
  'q2.1.8': ['M2-prompt-writing', 'M2-prompt-components'],

  // Lesson 2.2: Refining Output
  'q2.2.1': ['M2-tone-adjustment'],
  'q2.2.2': ['M2-tone-adjustment', 'M2-prompt-writing'],
  'q2.2.3': ['M2-format-control'],
  'q2.2.4': ['M2-format-control', 'M2-tone-adjustment'],
  'q2.2.5': ['M2-prompt-rewriting'],
  'q2.2.6': ['M2-prompt-rewriting', 'M2-prompt-mistakes'],

  // Lesson 2.3: Iterative Prompting
  'q2.3.1': ['M2-followup-prompts'],
  'q2.3.2': ['M2-followup-prompts', 'M2-prompt-rewriting'],
  'q2.3.3': ['M2-prompt-debugging'],
  'q2.3.4': ['M2-prompt-debugging', 'M2-prompt-mistakes'],
  'q2.3.5': ['M2-prompt-debugging', 'M2-followup-prompts'],
};

// ============================================
// MODULE 3 QUESTIONS
// ============================================

const MODULE_3_QUESTIONS: Record<string, string[]> = {
  // Lesson 3.1: Prompt Chaining
  'q3.1.1': ['M3-prompt-chaining'],
  'q3.1.2': ['M3-prompt-chaining', 'M2-prompt-debugging'],
  'q3.1.3': ['M3-task-breakdown'],
  'q3.1.4': ['M3-task-breakdown', 'M3-prompt-chaining'],
  'q3.1.5': ['M3-chain-testing'],
  'q3.1.6': ['M3-chain-testing', 'M3-task-breakdown'],

  // Lesson 3.2: Custom GPTs
  'q3.2.1': ['M3-gpt-task-selection'],
  'q3.2.2': ['M3-gpt-task-selection', 'M3-chain-testing'],
  'q3.2.3': ['M3-gpt-instructions'],
  'q3.2.4': ['M3-gpt-instructions', 'M2-prompt-components'],
  'q3.2.5': ['M3-gpt-building'],
  'q3.2.6': ['M3-gpt-building', 'M3-gpt-instructions'],

  // Lesson 3.3: GPT Deployment
  'q3.3.1': ['M3-gpt-evaluation'],
  'q3.3.2': ['M3-gpt-evaluation', 'M3-gpt-building'],
  'q3.3.3': ['M3-gpt-safety'],
  'q3.3.4': ['M3-gpt-safety', 'M1-ethical-risks'],
  'q3.3.5': ['M3-gpt-sharing'],
  'q3.3.6': ['M3-gpt-sharing', 'M3-gpt-safety'],
};

// ============================================
// MODULE 4 QUESTIONS
// ============================================

const MODULE_4_QUESTIONS: Record<string, string[]> = {
  // Lesson 4.1: Agent Fundamentals
  'q4.1.1': ['M4-agent-purpose'],
  'q4.1.2': ['M4-agent-purpose', 'M3-gpt-building'],
  'q4.1.3': ['M4-agent-vs-gpt'],
  'q4.1.4': ['M4-agent-vs-gpt', 'M4-agent-purpose'],
  'q4.1.5': ['M4-agent-use-cases'],
  'q4.1.6': ['M4-agent-use-cases', 'M1-workflow-opportunities'],

  // Lesson 4.2: Planning Agents
  'q4.2.1': ['M4-workflow-planning'],
  'q4.2.2': ['M4-workflow-planning', 'M4-agent-use-cases'],
  'q4.2.3': ['M4-io-mapping'],
  'q4.2.4': ['M4-io-mapping', 'M4-workflow-planning'],
  'q4.2.5': ['M4-io-mapping', 'M1-workflow-mapping'],

  // Lesson 4.3: Building Agents
  'q4.3.1': ['M4-agent-configuration'],
  'q4.3.2': ['M4-agent-configuration', 'M4-io-mapping'],
  'q4.3.3': ['M4-agent-testing'],
  'q4.3.4': ['M4-agent-testing', 'M3-chain-testing'],
  'q4.3.5': ['M4-agent-documentation'],
  'q4.3.6': ['M4-agent-documentation', 'M4-agent-testing'],

  // Lesson 4.4: Deployment & Monitoring
  'q4.4.1': ['M4-agent-deployment'],
  'q4.4.2': ['M4-agent-deployment', 'M4-agent-documentation'],
  'q4.4.3': ['M4-agent-monitoring'],
  'q4.4.4': ['M4-agent-monitoring', 'M4-agent-deployment'],
  'q4.4.5': ['M4-agent-compliance'],
  'q4.4.6': ['M4-agent-compliance', 'M1-ethical-risks'],
  'q4.4.7': ['M4-agent-iteration'],
  'q4.4.8': ['M4-agent-iteration', 'M4-agent-monitoring', 'M4-agent-compliance'],
};

// ============================================
// MODULE 1 ATOMS (Content to Skills)
// ============================================

const MODULE_1_ATOMS: Record<string, string[]> = {
  // Lesson 1.1 atoms
  'atom-1.1.1-intro': ['M1-genai-definition'],
  'atom-1.1.2-llm-basics': ['M1-genai-definition', 'M1-llm-explanation'],
  'atom-1.1.3-chatgpt-overview': ['M1-chatgpt-strengths', 'M1-chatgpt-limitations'],
  'atom-1.1.4-ai-opportunities': ['M1-workflow-opportunities'],

  // Lesson 1.2 atoms
  'atom-1.2.1-task-types': ['M1-task-identification'],
  'atom-1.2.2-evaluation': ['M1-task-evaluation'],
  'atom-1.2.3-mapping': ['M1-workflow-mapping'],

  // Lesson 1.3 atoms
  'atom-1.3.1-ethics': ['M1-ethical-risks'],
  'atom-1.3.2-hallucinations': ['M1-hallucination-detection'],
  'atom-1.3.3-safe-practices': ['M1-safe-use-practices'],
};

// ============================================
// MODULE 2 ATOMS
// ============================================

const MODULE_2_ATOMS: Record<string, string[]> = {
  // Lesson 2.1 atoms
  'atom-2.1.1-components': ['M2-prompt-components'],
  'atom-2.1.2-clarity': ['M2-prompt-clarity'],
  'atom-2.1.3-mistakes': ['M2-prompt-mistakes'],
  'atom-2.1.4-writing': ['M2-prompt-writing'],

  // Lesson 2.2 atoms
  'atom-2.2.1-tone': ['M2-tone-adjustment'],
  'atom-2.2.2-format': ['M2-format-control'],
  'atom-2.2.3-rewriting': ['M2-prompt-rewriting'],

  // Lesson 2.3 atoms
  'atom-2.3.1-followup': ['M2-followup-prompts'],
  'atom-2.3.2-debugging': ['M2-prompt-debugging'],
};

// ============================================
// MODULE 3 ATOMS
// ============================================

const MODULE_3_ATOMS: Record<string, string[]> = {
  // Lesson 3.1 atoms
  'atom-3.1.1-chaining-intro': ['M3-prompt-chaining'],
  'atom-3.1.2-breakdown': ['M3-task-breakdown'],
  'atom-3.1.3-testing': ['M3-chain-testing'],

  // Lesson 3.2 atoms
  'atom-3.2.1-gpt-tasks': ['M3-gpt-task-selection'],
  'atom-3.2.2-instructions': ['M3-gpt-instructions'],
  'atom-3.2.3-building': ['M3-gpt-building'],

  // Lesson 3.3 atoms
  'atom-3.3.1-evaluation': ['M3-gpt-evaluation'],
  'atom-3.3.2-safety': ['M3-gpt-safety'],
  'atom-3.3.3-sharing': ['M3-gpt-sharing'],
};

// ============================================
// MODULE 4 ATOMS
// ============================================

const MODULE_4_ATOMS: Record<string, string[]> = {
  // Lesson 4.1 atoms
  'atom-4.1.1-agents-intro': ['M4-agent-purpose'],
  'atom-4.1.2-agents-vs-gpts': ['M4-agent-vs-gpt'],
  'atom-4.1.3-use-cases': ['M4-agent-use-cases'],

  // Lesson 4.2 atoms
  'atom-4.2.1-planning': ['M4-workflow-planning'],
  'atom-4.2.2-io-mapping': ['M4-io-mapping'],

  // Lesson 4.3 atoms
  'atom-4.3.1-configuration': ['M4-agent-configuration'],
  'atom-4.3.2-testing': ['M4-agent-testing'],
  'atom-4.3.3-documentation': ['M4-agent-documentation'],

  // Lesson 4.4 atoms
  'atom-4.4.1-deployment': ['M4-agent-deployment'],
  'atom-4.4.2-monitoring': ['M4-agent-monitoring'],
  'atom-4.4.3-compliance': ['M4-agent-compliance'],
  'atom-4.4.4-iteration': ['M4-agent-iteration'],
};

// ============================================
// COMPLETE Q-MATRIX
// ============================================

/**
 * Complete Q-Matrix for the AI at Work course
 */
export const AI_AT_WORK_Q_MATRIX: QMatrix = {
  questionSkills: {
    ...MODULE_1_QUESTIONS,
    ...MODULE_2_QUESTIONS,
    ...MODULE_3_QUESTIONS,
    ...MODULE_4_QUESTIONS,
  },
  atomSkills: {
    ...MODULE_1_ATOMS,
    ...MODULE_2_ATOMS,
    ...MODULE_3_ATOMS,
    ...MODULE_4_ATOMS,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get skills tested by a specific question
 */
export function getSkillsForQuestion(questionId: string): string[] {
  return AI_AT_WORK_Q_MATRIX.questionSkills[questionId] || [];
}

/**
 * Get skills taught by a specific atom
 */
export function getSkillsForAtom(atomId: string): string[] {
  return AI_AT_WORK_Q_MATRIX.atomSkills[atomId] || [];
}

/**
 * Get all questions that test a specific skill
 */
export function getQuestionsForSkill(skillId: string): string[] {
  const questions: string[] = [];

  for (const [questionId, skills] of Object.entries(AI_AT_WORK_Q_MATRIX.questionSkills)) {
    if (skills.includes(skillId)) {
      questions.push(questionId);
    }
  }

  return questions;
}

/**
 * Get all atoms that teach a specific skill
 */
export function getAtomsForSkill(skillId: string): string[] {
  const atoms: string[] = [];

  for (const [atomId, skills] of Object.entries(AI_AT_WORK_Q_MATRIX.atomSkills)) {
    if (skills.includes(skillId)) {
      atoms.push(atomId);
    }
  }

  return atoms;
}

/**
 * Get unique skills from a list of question IDs
 */
export function getUniqueSkillsFromQuestions(questionIds: string[]): string[] {
  const skillSet = new Set<string>();

  for (const questionId of questionIds) {
    const skills = getSkillsForQuestion(questionId);
    skills.forEach((skill) => skillSet.add(skill));
  }

  return Array.from(skillSet);
}

/**
 * Count how many questions test each skill
 */
export function getQuestionCountPerSkill(): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const skills of Object.values(AI_AT_WORK_Q_MATRIX.questionSkills)) {
    for (const skillId of skills) {
      counts[skillId] = (counts[skillId] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Get the primary skill for a question (first skill in the list)
 * This is useful when you need to update just one skill
 */
export function getPrimarySkillForQuestion(questionId: string): string | null {
  const skills = getSkillsForQuestion(questionId);
  return skills.length > 0 ? skills[0] : null;
}

/**
 * Check if a question exists in the Q-Matrix
 */
export function hasQuestion(questionId: string): boolean {
  return questionId in AI_AT_WORK_Q_MATRIX.questionSkills;
}

/**
 * Check if an atom exists in the Q-Matrix
 */
export function hasAtom(atomId: string): boolean {
  return atomId in AI_AT_WORK_Q_MATRIX.atomSkills;
}

/**
 * Get module number from question ID (e.g., 'q1.2.3' -> 1)
 */
export function getModuleFromQuestionId(questionId: string): number {
  const match = questionId.match(/^q(\d)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get lesson from question ID (e.g., 'q1.2.3' -> '1.2')
 */
export function getLessonFromQuestionId(questionId: string): string {
  const match = questionId.match(/^q(\d+\.\d+)/);
  return match ? match[1] : '';
}
