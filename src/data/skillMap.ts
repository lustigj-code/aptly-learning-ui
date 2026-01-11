/**
 * AI at Work Course - Complete Skill Map
 *
 * This file contains all 41 skills from the AI at Work course
 * organized by module with prerequisites and BKT parameters.
 *
 * Structure:
 * - Module 1: Foundations (11 skills)
 * - Module 2: Prompting Fundamentals (9 skills)
 * - Module 3: Advanced Prompting & Custom GPTs (9 skills)
 * - Module 4: No-Code AI Agents (12 skills)
 *
 * Total: 41 skills
 */

import {
  type BKTParameters,
  type Skill,
  type SkillMap,
  DEFAULT_BKT_PARAMS,
  EASY_BKT_PARAMS,
  HARD_BKT_PARAMS,
} from '@/lib/mastery/bkt';

// ============================================
// BKT PARAMETER PRESETS
// ============================================

/**
 * Parameters for foundational/definitional skills
 * Higher prior, faster learning - concepts are intuitive
 */
const FOUNDATION_PARAMS: BKTParameters = {
  pL0: 0.15, // Slightly higher prior
  pT: 0.35,  // Faster learning
  pG: 0.25,  // Standard 4-option MCQ
  pS: 0.08,  // Low slip rate
};

/**
 * Parameters for application/practice skills
 * Lower prior, moderate learning - requires practice
 */
const APPLICATION_PARAMS: BKTParameters = {
  pL0: 0.08,
  pT: 0.28,
  pG: 0.22,
  pS: 0.12,
};

/**
 * Parameters for advanced/synthesis skills
 * Low prior, slower learning - complex understanding needed
 */
const ADVANCED_PARAMS: BKTParameters = {
  pL0: 0.05,
  pT: 0.22,
  pG: 0.18,
  pS: 0.15,
};

// ============================================
// MODULE 1: FOUNDATIONS (11 SKILLS)
// ============================================

const MODULE_1_SKILLS: Record<string, Skill> = {
  'M1-genai-definition': {
    id: 'M1-genai-definition',
    name: 'Describe what generative AI is',
    lessonId: '1.1',
    prerequisites: [],
    bktParams: FOUNDATION_PARAMS,
  },
  'M1-llm-explanation': {
    id: 'M1-llm-explanation',
    name: 'Explain how LLMs like ChatGPT work',
    lessonId: '1.1',
    prerequisites: ['M1-genai-definition'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M1-chatgpt-strengths': {
    id: 'M1-chatgpt-strengths',
    name: 'Identify strengths of ChatGPT',
    lessonId: '1.1',
    prerequisites: ['M1-genai-definition'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M1-chatgpt-limitations': {
    id: 'M1-chatgpt-limitations',
    name: 'Identify limitations of ChatGPT',
    lessonId: '1.1',
    prerequisites: ['M1-chatgpt-strengths'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M1-workflow-opportunities': {
    id: 'M1-workflow-opportunities',
    name: 'Identify AI opportunities in workflow',
    lessonId: '1.1',
    prerequisites: ['M1-chatgpt-strengths', 'M1-chatgpt-limitations'],
    bktParams: APPLICATION_PARAMS,
  },
  'M1-task-identification': {
    id: 'M1-task-identification',
    name: 'Identify repetitive/structured tasks',
    lessonId: '1.2',
    prerequisites: ['M1-workflow-opportunities'],
    bktParams: APPLICATION_PARAMS,
  },
  'M1-task-evaluation': {
    id: 'M1-task-evaluation',
    name: 'Evaluate task AI-suitability',
    lessonId: '1.2',
    prerequisites: ['M1-task-identification'],
    bktParams: APPLICATION_PARAMS,
  },
  'M1-workflow-mapping': {
    id: 'M1-workflow-mapping',
    name: 'Create workflow maps',
    lessonId: '1.2',
    prerequisites: ['M1-task-evaluation'],
    bktParams: APPLICATION_PARAMS,
  },
  'M1-ethical-risks': {
    id: 'M1-ethical-risks',
    name: 'Describe ethical risks of AI',
    lessonId: '1.3',
    prerequisites: ['M1-workflow-opportunities'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M1-hallucination-detection': {
    id: 'M1-hallucination-detection',
    name: 'Identify AI hallucinations',
    lessonId: '1.3',
    prerequisites: ['M1-ethical-risks'],
    bktParams: APPLICATION_PARAMS,
  },
  'M1-safe-use-practices': {
    id: 'M1-safe-use-practices',
    name: 'Apply safe AI practices',
    lessonId: '1.3',
    prerequisites: ['M1-hallucination-detection', 'M1-ethical-risks'],
    bktParams: APPLICATION_PARAMS,
  },
};

// ============================================
// MODULE 2: PROMPTING FUNDAMENTALS (9 SKILLS)
// ============================================

const MODULE_2_SKILLS: Record<string, Skill> = {
  'M2-prompt-components': {
    id: 'M2-prompt-components',
    name: 'Identify prompt components (RTCF)',
    lessonId: '2.1',
    prerequisites: ['M1-safe-use-practices'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M2-prompt-clarity': {
    id: 'M2-prompt-clarity',
    name: 'Explain clarity impact on output',
    lessonId: '2.1',
    prerequisites: ['M2-prompt-components'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M2-prompt-mistakes': {
    id: 'M2-prompt-mistakes',
    name: 'Recognize common prompt mistakes',
    lessonId: '2.1',
    prerequisites: ['M2-prompt-clarity'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-prompt-writing': {
    id: 'M2-prompt-writing',
    name: 'Write structured prompts',
    lessonId: '2.1',
    prerequisites: ['M2-prompt-mistakes'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-tone-adjustment': {
    id: 'M2-tone-adjustment',
    name: 'Adjust tone and voice in prompts',
    lessonId: '2.2',
    prerequisites: ['M2-prompt-writing'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-format-control': {
    id: 'M2-format-control',
    name: 'Control output format',
    lessonId: '2.2',
    prerequisites: ['M2-tone-adjustment'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-prompt-rewriting': {
    id: 'M2-prompt-rewriting',
    name: 'Rewrite prompts for better outcomes',
    lessonId: '2.2',
    prerequisites: ['M2-format-control'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-followup-prompts': {
    id: 'M2-followup-prompts',
    name: 'Use follow-up prompts effectively',
    lessonId: '2.3',
    prerequisites: ['M2-prompt-rewriting'],
    bktParams: APPLICATION_PARAMS,
  },
  'M2-prompt-debugging': {
    id: 'M2-prompt-debugging',
    name: 'Debug weak prompts',
    lessonId: '2.3',
    prerequisites: ['M2-followup-prompts'],
    bktParams: ADVANCED_PARAMS,
  },
};

// ============================================
// MODULE 3: ADVANCED PROMPTING & CUSTOM GPTs (9 SKILLS)
// ============================================

const MODULE_3_SKILLS: Record<string, Skill> = {
  'M3-prompt-chaining': {
    id: 'M3-prompt-chaining',
    name: 'Define and use prompt chaining',
    lessonId: '3.1',
    prerequisites: ['M2-prompt-debugging'],
    bktParams: ADVANCED_PARAMS,
  },
  'M3-task-breakdown': {
    id: 'M3-task-breakdown',
    name: 'Break tasks into prompt chains',
    lessonId: '3.1',
    prerequisites: ['M3-prompt-chaining'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-chain-testing': {
    id: 'M3-chain-testing',
    name: 'Test sequential prompt workflows',
    lessonId: '3.1',
    prerequisites: ['M3-task-breakdown'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-gpt-task-selection': {
    id: 'M3-gpt-task-selection',
    name: 'Identify tasks for Custom GPTs',
    lessonId: '3.2',
    prerequisites: ['M3-chain-testing'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-gpt-instructions': {
    id: 'M3-gpt-instructions',
    name: 'Define GPT instructions and format',
    lessonId: '3.2',
    prerequisites: ['M3-gpt-task-selection'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-gpt-building': {
    id: 'M3-gpt-building',
    name: 'Configure Custom GPT builder',
    lessonId: '3.2',
    prerequisites: ['M3-gpt-instructions'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-gpt-evaluation': {
    id: 'M3-gpt-evaluation',
    name: 'Evaluate and revise GPTs',
    lessonId: '3.3',
    prerequisites: ['M3-gpt-building'],
    bktParams: ADVANCED_PARAMS,
  },
  'M3-gpt-safety': {
    id: 'M3-gpt-safety',
    name: 'Set GPT safe-use parameters',
    lessonId: '3.3',
    prerequisites: ['M3-gpt-evaluation'],
    bktParams: APPLICATION_PARAMS,
  },
  'M3-gpt-sharing': {
    id: 'M3-gpt-sharing',
    name: 'Share GPTs with usage notes',
    lessonId: '3.3',
    prerequisites: ['M3-gpt-safety'],
    bktParams: FOUNDATION_PARAMS,
  },
};

// ============================================
// MODULE 4: NO-CODE AI AGENTS (12 SKILLS)
// ============================================

const MODULE_4_SKILLS: Record<string, Skill> = {
  'M4-agent-purpose': {
    id: 'M4-agent-purpose',
    name: 'Describe ChatGPT agent capabilities',
    lessonId: '4.1',
    prerequisites: ['M3-gpt-sharing'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M4-agent-vs-gpt': {
    id: 'M4-agent-vs-gpt',
    name: 'Distinguish agents from GPTs',
    lessonId: '4.1',
    prerequisites: ['M4-agent-purpose'],
    bktParams: FOUNDATION_PARAMS,
  },
  'M4-agent-use-cases': {
    id: 'M4-agent-use-cases',
    name: 'Recognize agent automation use cases',
    lessonId: '4.1',
    prerequisites: ['M4-agent-vs-gpt'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-workflow-planning': {
    id: 'M4-workflow-planning',
    name: 'Plan agent workflows',
    lessonId: '4.2',
    prerequisites: ['M4-agent-use-cases'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-io-mapping': {
    id: 'M4-io-mapping',
    name: 'Map agent inputs/outputs/tools',
    lessonId: '4.2',
    prerequisites: ['M4-workflow-planning'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-agent-configuration': {
    id: 'M4-agent-configuration',
    name: 'Configure ChatGPT agents',
    lessonId: '4.3',
    prerequisites: ['M4-io-mapping'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-agent-testing': {
    id: 'M4-agent-testing',
    name: 'Test and refine agents',
    lessonId: '4.3',
    prerequisites: ['M4-agent-configuration'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-agent-documentation': {
    id: 'M4-agent-documentation',
    name: 'Document agent limitations',
    lessonId: '4.3',
    prerequisites: ['M4-agent-testing'],
    bktParams: APPLICATION_PARAMS,
  },
  'M4-agent-deployment': {
    id: 'M4-agent-deployment',
    name: 'Deploy agents responsibly',
    lessonId: '4.4',
    prerequisites: ['M4-agent-documentation'],
    bktParams: ADVANCED_PARAMS,
  },
  'M4-agent-monitoring': {
    id: 'M4-agent-monitoring',
    name: 'Monitor agent performance',
    lessonId: '4.4',
    prerequisites: ['M4-agent-deployment'],
    bktParams: ADVANCED_PARAMS,
  },
  'M4-agent-compliance': {
    id: 'M4-agent-compliance',
    name: 'Ensure agent compliance/privacy',
    lessonId: '4.4',
    prerequisites: ['M4-agent-deployment'],
    bktParams: ADVANCED_PARAMS,
  },
  'M4-agent-iteration': {
    id: 'M4-agent-iteration',
    name: 'Iterate on agent performance',
    lessonId: '4.4',
    prerequisites: ['M4-agent-monitoring', 'M4-agent-compliance'],
    bktParams: ADVANCED_PARAMS,
  },
};

// ============================================
// COMPLETE SKILL MAP
// ============================================

/**
 * Complete AI at Work skill map with all 41 skills
 */
export const AI_AT_WORK_SKILL_MAP: SkillMap = {
  skills: {
    ...MODULE_1_SKILLS,
    ...MODULE_2_SKILLS,
    ...MODULE_3_SKILLS,
    ...MODULE_4_SKILLS,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all skills for a specific lesson
 */
export function getSkillsForLesson(lessonId: string): string[] {
  return Object.values(AI_AT_WORK_SKILL_MAP.skills)
    .filter((skill) => skill.lessonId === lessonId)
    .map((skill) => skill.id);
}

/**
 * Get all prerequisites for a skill (including transitive)
 */
export function getPrerequisites(
  skillId: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(skillId)) return [];
  visited.add(skillId);

  const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
  if (!skill) return [];

  const directPrereqs = skill.prerequisites;
  const allPrereqs = [...directPrereqs];

  for (const prereqId of directPrereqs) {
    const transitivePrereqs = getPrerequisites(prereqId, visited);
    allPrereqs.push(...transitivePrereqs);
  }

  return [...new Set(allPrereqs)]; // Deduplicate
}

/**
 * Check if a skill is unlocked based on mastered skills
 */
export function isUnlocked(skillId: string, masteredSkills: string[]): boolean {
  const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
  if (!skill) return false;

  // No prerequisites = always unlocked
  if (skill.prerequisites.length === 0) return true;

  // Check all prerequisites are mastered
  return skill.prerequisites.every((prereqId) => masteredSkills.includes(prereqId));
}

/**
 * Get skills by module
 */
export function getSkillsByModule(): Record<string, Skill[]> {
  const byModule: Record<string, Skill[]> = {
    '1': [],
    '2': [],
    '3': [],
    '4': [],
  };

  for (const skill of Object.values(AI_AT_WORK_SKILL_MAP.skills)) {
    const moduleNum = skill.id.charAt(1); // M1, M2, M3, M4
    if (byModule[moduleNum]) {
      byModule[moduleNum].push(skill);
    }
  }

  return byModule;
}

/**
 * Get count of skills by status
 */
export function getSkillCounts(
  masteredSkills: string[],
  allStates: Record<string, { pMastery: number }>
): { total: number; mastered: number; learning: number; locked: number } {
  const total = Object.keys(AI_AT_WORK_SKILL_MAP.skills).length;
  const mastered = masteredSkills.length;

  let learning = 0;
  let locked = 0;

  for (const skillId of Object.keys(AI_AT_WORK_SKILL_MAP.skills)) {
    if (masteredSkills.includes(skillId)) continue;

    if (isUnlocked(skillId, masteredSkills)) {
      learning++;
    } else {
      locked++;
    }
  }

  return { total, mastered, learning, locked };
}

/**
 * Get the skill name by ID
 */
export function getSkillName(skillId: string): string {
  return AI_AT_WORK_SKILL_MAP.skills[skillId]?.name ?? skillId;
}

/**
 * Get the module number for a skill
 */
export function getSkillModule(skillId: string): number {
  const moduleChar = skillId.charAt(1);
  return parseInt(moduleChar, 10) || 1;
}

/**
 * Validate skill map has no cycles in prerequisites
 */
export function validateSkillMap(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const skills = AI_AT_WORK_SKILL_MAP.skills;

  // Check each skill's prerequisites exist and don't create cycles
  for (const [skillId, skill] of Object.entries(skills)) {
    for (const prereqId of skill.prerequisites) {
      if (!skills[prereqId]) {
        errors.push(`Skill ${skillId} has non-existent prerequisite: ${prereqId}`);
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(currentId: string): boolean {
      if (stack.has(currentId)) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);
      stack.add(currentId);

      const current = skills[currentId];
      if (current) {
        for (const prereqId of current.prerequisites) {
          if (hasCycle(prereqId)) return true;
        }
      }

      stack.delete(currentId);
      return false;
    }

    if (hasCycle(skillId)) {
      errors.push(`Skill ${skillId} is part of a prerequisite cycle`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Export types
export type { Skill, SkillMap };
