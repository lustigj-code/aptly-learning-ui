/**
 * Gemini-Powered Skill Map Generator
 *
 * Uses AI to automatically extract skills from course content,
 * determine prerequisites, and estimate BKT parameters.
 *
 * @see 4.1-02-PLAN.md
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ParsedCourseContent,
  DynamicSkillMap,
  ExtractedSkill,
  SkillExtractionResult,
} from './types';
import { extractedSkillToSkill, getBKTParamsForDifficulty } from './types';
import type { Skill } from '@/lib/mastery/bkt';

// ============================================
// TYPES
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface GeminiSkillResponse {
  id: string;
  name: string;
  description: string;
  lessonId: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GeminiPrerequisiteResponse {
  [skillId: string]: string[];
}

// ============================================
// GEMINI CLIENT
// ============================================

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
}

// ============================================
// SKILL EXTRACTION
// ============================================

/**
 * Extract skills from course content using Gemini
 */
async function extractSkills(
  courseContent: ParsedCourseContent
): Promise<ExtractedSkill[]> {
  const model = getGeminiClient();

  // Serialize course content for the prompt
  const serializedContent = serializeCourseContent(courseContent);

  const prompt = `Analyze this course content and extract the key skills/competencies a learner will develop.

Course: ${courseContent.title}
Course ID: ${courseContent.courseId}

For each module and lesson, identify:
1. The specific skills being taught (action verbs: "Identify...", "Apply...", "Create...")
2. The lesson ID where this skill is taught
3. The difficulty level (easy/medium/hard)

Return a JSON array with this exact structure:
[
  {
    "id": "${courseContent.courseId}-M{module}-skill{n}",
    "name": "Skill description starting with action verb",
    "description": "Brief explanation of what this skill involves",
    "lessonId": "lesson-id-from-content",
    "difficulty": "easy|medium|hard"
  }
]

Rules:
- Extract 2-4 skills per module
- Use action verbs (Identify, Apply, Analyze, Create, Evaluate, etc.)
- Foundation concepts = easy, practical application = medium, advanced synthesis = hard
- Skill IDs must follow pattern: ${courseContent.courseId}-M{moduleNumber}-skill{n}

Course content:
${serializedContent}`;

  try {
    console.log('[skillMapGenerator] Extracting skills with Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const skills: GeminiSkillResponse[] = JSON.parse(responseText);

    // Convert to ExtractedSkill format
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      lessonId: skill.lessonId,
      moduleId: extractModuleId(skill.id),
      prerequisites: [], // Will be filled in by generatePrerequisites
      difficulty: skill.difficulty,
      bloomLevel: difficultyToBloom(skill.difficulty),
    }));
  } catch (error) {
    console.error('[skillMapGenerator] Failed to extract skills:', error);
    throw new Error(`Skill extraction failed: ${error}`);
  }
}

/**
 * Generate prerequisite relationships between skills
 */
async function generatePrerequisites(
  skills: ExtractedSkill[],
  courseContent: ParsedCourseContent
): Promise<Record<string, string[]>> {
  const model = getGeminiClient();

  const skillList = skills
    .map((s) => `- ${s.id}: ${s.name} (${s.difficulty})`)
    .join('\n');

  const prompt = `Given these skills from a course, determine which skills are prerequisites for others.

Course: ${courseContent.title}

Skills:
${skillList}

For each skill, identify which OTHER skills must be learned first.
Return a JSON object mapping skill ID to array of prerequisite skill IDs:
{
  "skill-id-1": [],
  "skill-id-2": ["skill-id-1"],
  ...
}

Rules:
- Earlier module skills typically prerequisite later ones
- Easy skills typically prerequisite medium skills
- Medium skills typically prerequisite hard skills
- Don't create cycles (A->B->C->A is invalid)
- A skill in module 2 can prerequisite skills from module 1
- Return empty array [] for skills with no prerequisites`;

  try {
    console.log('[skillMapGenerator] Generating prerequisites with Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const prerequisites: GeminiPrerequisiteResponse = JSON.parse(responseText);
    return prerequisites;
  } catch (error) {
    console.error('[skillMapGenerator] Failed to generate prerequisites:', error);
    // Return empty prerequisites as fallback
    return skills.reduce(
      (acc, skill) => {
        acc[skill.id] = [];
        return acc;
      },
      {} as Record<string, string[]>
    );
  }
}

// ============================================
// MAIN ENTRY POINT
// ============================================

/**
 * Generate a complete skill map from course content
 *
 * @param courseContent - Parsed course content from courseParser
 * @returns DynamicSkillMap with skills, prerequisites, and BKT params
 *
 * @example
 * const course = parseCourse('course-1');
 * const skillMap = await generateSkillMap(course);
 */
export async function generateSkillMap(
  courseContent: ParsedCourseContent
): Promise<DynamicSkillMap> {
  console.log(`[skillMapGenerator] Generating skill map for: ${courseContent.title}`);

  // Step 1: Extract skills from content
  const extractedSkills = await extractSkills(courseContent);
  console.log(`[skillMapGenerator] Extracted ${extractedSkills.length} skills`);

  // Step 2: Generate prerequisites
  const prerequisites = await generatePrerequisites(extractedSkills, courseContent);

  // Step 3: Apply prerequisites to skills
  const skillsWithPrereqs = extractedSkills.map((skill) => ({
    ...skill,
    prerequisites: prerequisites[skill.id] || [],
  }));

  // Step 4: Convert to Skill format with BKT params
  const skills: Record<string, Skill> = {};
  for (const extracted of skillsWithPrereqs) {
    skills[extracted.id] = extractedSkillToSkill(extracted);
  }

  // Step 5: Build DynamicSkillMap
  const now = new Date();
  const skillMap: DynamicSkillMap = {
    id: `${courseContent.courseId}-skillmap`,
    courseId: courseContent.courseId,
    version: 1,
    status: 'draft',
    skills,
    metadata: {
      generatedAt: now,
      generatedBy: 'ai',
      model: 'gemini-2.0-flash-exp',
      promptVersion: '1.0.0',
    },
    createdAt: now,
    updatedAt: now,
  };

  // Step 6: Validate
  const validation = validateSkillMap(skillMap);
  if (!validation.valid) {
    console.warn('[skillMapGenerator] Validation warnings:', validation.warnings);
    if (validation.errors.length > 0) {
      console.error('[skillMapGenerator] Validation errors:', validation.errors);
    }
  }

  console.log(`[skillMapGenerator] Generated skill map with ${Object.keys(skills).length} skills`);
  return skillMap;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a skill map for common issues
 */
export function validateSkillMap(skillMap: DynamicSkillMap): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillIds = Object.keys(skillMap.skills);

  // Check 1: Each skill has required fields
  for (const [id, skill] of Object.entries(skillMap.skills)) {
    if (!skill.id) errors.push(`Skill ${id} missing id`);
    if (!skill.name) errors.push(`Skill ${id} missing name`);
    if (!skill.lessonId) errors.push(`Skill ${id} missing lessonId`);
    if (!skill.bktParams) errors.push(`Skill ${id} missing bktParams`);
  }

  // Check 2: All prerequisite IDs exist
  for (const [id, skill] of Object.entries(skillMap.skills)) {
    for (const prereq of skill.prerequisites) {
      if (!skillMap.skills[prereq]) {
        errors.push(`Skill ${id} has unknown prerequisite: ${prereq}`);
      }
    }
  }

  // Check 3: No circular dependencies
  const cycles = detectCycles(skillMap.skills);
  if (cycles.length > 0) {
    errors.push(`Circular dependencies detected: ${cycles.join(', ')}`);
  }

  // Check 4: At least one skill exists
  if (skillIds.length === 0) {
    errors.push('Skill map has no skills');
  }

  // Warning: Check for skills with many prerequisites
  for (const [id, skill] of Object.entries(skillMap.skills)) {
    if (skill.prerequisites.length > 5) {
      warnings.push(`Skill ${id} has ${skill.prerequisites.length} prerequisites (may be excessive)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect cycles in the prerequisite graph using DFS
 */
function detectCycles(skills: Record<string, Skill>): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(skillId: string, path: string[]): boolean {
    if (recursionStack.has(skillId)) {
      // Found a cycle
      const cycleStart = path.indexOf(skillId);
      const cycle = path.slice(cycleStart).concat(skillId);
      cycles.push(cycle.join(' -> '));
      return true;
    }

    if (visited.has(skillId)) {
      return false;
    }

    visited.add(skillId);
    recursionStack.add(skillId);

    const skill = skills[skillId];
    if (skill) {
      for (const prereq of skill.prerequisites) {
        if (dfs(prereq, [...path, skillId])) {
          return true;
        }
      }
    }

    recursionStack.delete(skillId);
    return false;
  }

  for (const skillId of Object.keys(skills)) {
    if (!visited.has(skillId)) {
      dfs(skillId, []);
    }
  }

  return cycles;
}

// ============================================
// MERGE UTILITY
// ============================================

/**
 * Merge a generated skill map with manual overrides
 *
 * Manual values take precedence over generated values.
 */
export function mergeSkillMaps(
  generated: DynamicSkillMap,
  manual: Partial<DynamicSkillMap>
): DynamicSkillMap {
  const merged: DynamicSkillMap = {
    ...generated,
    ...manual,
    skills: { ...generated.skills },
    metadata: {
      ...generated.metadata,
      ...manual.metadata,
    },
    updatedAt: new Date(),
  };

  // Merge individual skills if provided
  if (manual.skills) {
    for (const [id, skill] of Object.entries(manual.skills)) {
      if (merged.skills[id]) {
        // Merge with existing skill
        merged.skills[id] = {
          ...merged.skills[id],
          ...skill,
        };
      } else {
        // Add new skill
        merged.skills[id] = skill;
      }
    }
  }

  // Increment version on merge
  merged.version = generated.version + 1;

  return merged;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Serialize course content for Gemini prompt
 */
function serializeCourseContent(content: ParsedCourseContent): string {
  const lines: string[] = [];

  for (const module of content.modules) {
    lines.push(`\n## Module ${module.number}: ${module.title}`);
    lines.push(`Objectives: ${module.objectives.join(', ')}`);

    for (const lesson of module.lessons) {
      lines.push(`\n### Lesson: ${lesson.title} (ID: ${lesson.id})`);
      lines.push(`Objectives: ${lesson.objectives.join(', ')}`);

      for (const atom of lesson.atoms) {
        lines.push(`- ${atom.type}: ${atom.title}`);
        // Include a snippet of content for context
        const snippet = atom.content.slice(0, 200);
        if (snippet.length < atom.content.length) {
          lines.push(`  ${snippet}...`);
        } else if (snippet) {
          lines.push(`  ${snippet}`);
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Extract module ID from skill ID
 * e.g., "course-1-M1-skill1" -> "module-1" or "M1"
 */
function extractModuleId(skillId: string): string {
  const match = skillId.match(/M(\d+)/);
  return match ? `module-${match[1]}` : 'unknown';
}

/**
 * Map difficulty to Bloom's taxonomy level
 */
function difficultyToBloom(
  difficulty: 'easy' | 'medium' | 'hard'
): ExtractedSkill['bloomLevel'] {
  switch (difficulty) {
    case 'easy':
      return 'remember';
    case 'medium':
      return 'apply';
    case 'hard':
      return 'analyze';
  }
}
