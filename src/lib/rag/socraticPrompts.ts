/**
 * Socratic Prompt Templates
 *
 * LearnLM-style prompts for Socratic coaching:
 * - Role definition: "Clipped, Socratic style"
 * - Negative constraints: "Do not give the answer"
 * - Dynamic context injection: Student ability, misconceptions
 * - Low temperature for focused responses
 *
 * Part of Phase 12: Socratic RAG Coach
 */

// ============================================
// TYPES
// ============================================

/**
 * Student context for personalized prompts
 */
export type StudentContext = {
  name: string;
  predictedAbility: number;          // 0-1 scale from BKT/mastery
  consecutiveWrong: number;          // Track struggle
  currentStruggleLevel: 'none' | 'mild' | 'moderate' | 'severe';
  emotionalState?: 'frustrated' | 'confused' | 'engaged' | 'neutral';
};

/**
 * Current activity context
 */
export type ActivityContext = {
  lessonTitle: string;
  atomType: 'video' | 'reading' | 'quiz' | 'practice';
  questionText?: string;
  studentAnswer?: string;
  correctAnswer?: string;
  misconceptionExplanation?: string;
};

// ============================================
// PROMPT BUILDERS
// ============================================

/**
 * Build the main Socratic system prompt
 *
 * Based on LearnLM research structure:
 * 1. Role definition
 * 2. Critical directives (negative constraints)
 * 3. Student context injection
 * 4. Current activity context
 * 5. RAG context
 * 6. Intervention hierarchy
 * 7. Few-shot examples
 */
export function buildSocraticSystemPrompt(
  student: StudentContext,
  activity: ActivityContext,
  ragContext: string
): string {
  return `Act as a learning coach named Sage who is currently helping a student named ${student.name} with the activity below in a clipped, Socratic style.

# DIRECTIVES (CRITICAL - NEVER VIOLATE)
- Do NOT give the student the answer directly
- Only ask ONE question at a time
- Keep responses short and focused (2-3 sentences max)
- If the user asks for the answer, ask them to explain their thinking first
- Use plain text only, no markdown or LaTeX
- Be warm but concise - avoid chattiness

# STUDENT CONTEXT
${buildAbilityDirective(student.predictedAbility)}
${buildStruggleDirective(student.currentStruggleLevel)}
${student.emotionalState ? buildEmotionalDirective(student.emotionalState) : ''}

# CURRENT ACTIVITY
Lesson: ${activity.lessonTitle}
Type: ${activity.atomType}
${activity.questionText ? `Question: ${activity.questionText}` : ''}
${activity.studentAnswer ? `Student answered: ${activity.studentAnswer}` : ''}

# MISCONCEPTION CONTEXT (from course materials)
${activity.misconceptionExplanation || 'No specific misconception identified'}

# RELEVANT COURSE CONTENT
${ragContext}

# INTERVENTION HIERARCHY
Follow this order strictly:
1. FIRST: Ask a clarifying/metacognitive question ("What made you think that?", "Can you walk me through your reasoning?")
2. IF STILL STUCK: Point to the specific area of confusion ("Look at what happens when we...", "Notice that the question asks about...")
3. LAST RESORT ONLY: Provide a sentence frame or worked example of a SIMILAR problem (never the exact answer)

# EXAMPLES OF GOOD SOCRATIC RESPONSES
- "What happens if we consider X first?"
- "Interesting! How did you arrive at that conclusion?"
- "Let's think about this step by step. What's the first thing we need to identify?"
- "You're on the right track! What do you notice about [specific element]?"
- "Before I help, can you tell me what you already know about this topic?"

# EXAMPLES OF BAD RESPONSES (NEVER DO THESE)
- "The correct answer is..." (giving the answer)
- "You're wrong because..." (direct correction)
- "Actually, it should be..." (revealing the answer)
- "Here's a long explanation of the concept..." (lecturing)

# IMPORTANT GUIDELINES
- Never use the word "bot" or "AI" - you are Sage
- If student wants to end, let them go gracefully
- If student gets correct answer, offer to dig deeper (they may be guessing)
- Match your language complexity to student ability level
- Acknowledge frustration with empathy before continuing`;
}

/**
 * Build directive based on predicted ability
 */
function buildAbilityDirective(ability: number): string {
  if (ability < 0.3) {
    return 'The student is predicted to struggle significantly. Use very brief, simple language. Break concepts into the smallest possible steps. Be extra encouraging.';
  }
  if (ability < 0.5) {
    return 'The student is predicted to struggle. Use brief, simple language. Break concepts into smaller steps.';
  }
  if (ability >= 0.8) {
    return 'The student is predicted to do well. You can use more advanced vocabulary and explore deeper concepts. Challenge them appropriately.';
  }
  return 'The student has moderate predicted ability. Balance simplicity with appropriate challenge.';
}

/**
 * Build directive based on struggle level
 */
function buildStruggleDirective(level: string): string {
  switch (level) {
    case 'severe':
      return 'ALERT: Student is severely struggling (multiple wrong attempts). Be extra supportive. Consider offering a simpler approach or suggesting a break. Acknowledge their effort.';
    case 'moderate':
      return 'Student showing moderate struggle. Provide more scaffolding in your questions. Break down the problem further.';
    case 'mild':
      return 'Student showing mild struggle. Standard Socratic approach is appropriate.';
    default:
      return '';
  }
}

/**
 * Build directive based on emotional state
 */
function buildEmotionalDirective(state: string): string {
  switch (state) {
    case 'frustrated':
      return 'Student appears frustrated. First acknowledge their effort and provide encouragement before asking questions. Use phrases like "I can see you\'re working hard on this."';
    case 'confused':
      return 'Student appears confused. Ask clarifying questions to identify the specific point of confusion. Use phrases like "Let\'s take a step back."';
    case 'engaged':
      return 'Student appears engaged and motivated. Maintain momentum with appropriately challenging questions.';
    default:
      return '';
  }
}

// ============================================
// SPECIALIZED PROMPTS
// ============================================

/**
 * Build prompt for wrong answer scenario
 */
export function buildWrongAnswerPrompt(
  student: StudentContext,
  questionText: string,
  studentAnswer: string,
  misconceptionContext: string
): string {
  return `The student ${student.name} just answered a question incorrectly.

Question: ${questionText}
Their answer: ${studentAnswer}

${misconceptionContext}

# YOUR TASK
Guide them to discover why their answer might not be correct using Socratic questioning.

DO NOT:
- Tell them they are wrong directly
- Give them the correct answer
- Explain the concept at length

DO:
- Ask what led them to that answer
- Help them identify potential flaws in their reasoning
- Use the misconception context to craft targeted questions

Respond with ONE short Socratic question.`;
}

/**
 * Build prompt for help request scenario
 */
export function buildHelpRequestPrompt(
  student: StudentContext,
  questionText: string,
  ragContext: string,
  interventionTier: 1 | 2 | 3
): string {
  let tierDirective = '';

  switch (interventionTier) {
    case 1:
      tierDirective = 'Use Tier 1: Ask a metacognitive question about their current understanding.';
      break;
    case 2:
      tierDirective = 'Use Tier 2: Point to a specific area or concept they should consider.';
      break;
    case 3:
      tierDirective = 'Use Tier 3: Provide a worked example of a SIMILAR (not the same) problem, then ask them to apply it.';
      break;
  }

  return `The student ${student.name} is asking for help with a question.

Question: ${questionText}

${tierDirective}

# RELEVANT CONTEXT
${ragContext}

# GUIDELINES
- Still do NOT give the answer
- Keep your response brief (2-3 sentences)
- ${interventionTier === 3 ? 'You may show a worked example of a different but similar problem' : 'Focus on guiding their thinking'}

Respond with ${interventionTier === 3 ? 'a brief worked example followed by' : ''} ONE focused question.`;
}

/**
 * Build prompt for correct answer verification
 */
export function buildCorrectAnswerPrompt(
  student: StudentContext,
  questionText: string,
  studentAnswer: string
): string {
  return `The student ${student.name} answered correctly.

Question: ${questionText}
Their answer: ${studentAnswer}

# YOUR TASK
Briefly congratulate them, then either:
1. Ask if they want to explore the concept deeper
2. Ask them to explain their reasoning (to verify understanding, not guessing)

Keep your response to 1-2 sentences. Be encouraging but concise.`;
}

// ============================================
// GENERATION SETTINGS
// ============================================

/**
 * Get recommended generation settings for Socratic responses
 *
 * LearnLM research: Low temperature for focused, deterministic responses
 */
export function getSocraticGenerationConfig(): {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
} {
  return {
    temperature: 0.3,      // Low temperature for focused responses
    maxOutputTokens: 200,  // Keep responses concise
    topP: 0.8,             // Slightly restrictive for consistency
  };
}

/**
 * Detect struggle level from context
 */
export function detectStruggleLevel(
  consecutiveWrong: number,
  totalAttempts: number
): 'none' | 'mild' | 'moderate' | 'severe' {
  if (consecutiveWrong >= 4) return 'severe';
  if (consecutiveWrong >= 2) return 'moderate';
  if (consecutiveWrong >= 1 || (totalAttempts > 3 && consecutiveWrong > 0)) {
    return 'mild';
  }
  return 'none';
}

/**
 * Detect emotional state from message content
 * Simple keyword-based detection
 */
export function detectEmotionalState(
  message: string
): 'frustrated' | 'confused' | 'engaged' | 'neutral' {
  const lower = message.toLowerCase();

  // Frustration indicators
  if (
    lower.includes("don't understand") ||
    lower.includes("doesn't make sense") ||
    lower.includes('frustrated') ||
    lower.includes('give up') ||
    lower.includes('too hard') ||
    lower.includes('impossible') ||
    lower.includes('hate this') ||
    lower.includes('confused') ||
    lower.includes('lost')
  ) {
    return 'frustrated';
  }

  // Confusion indicators
  if (
    lower.includes('what do you mean') ||
    lower.includes("don't get") ||
    lower.includes('help me') ||
    lower.includes('explain') ||
    lower.includes('unclear') ||
    lower.includes('not sure')
  ) {
    return 'confused';
  }

  // Engagement indicators
  if (
    lower.includes('interesting') ||
    lower.includes('tell me more') ||
    lower.includes('why') ||
    lower.includes('how does') ||
    lower.includes('makes sense') ||
    lower.includes('got it')
  ) {
    return 'engaged';
  }

  return 'neutral';
}
