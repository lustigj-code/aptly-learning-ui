/**
 * LearnLM-Style Prompts
 *
 * Adapts Google's LearnLM research findings for effective AI tutoring:
 * - Scaffolding techniques for building understanding step by step
 * - Metacognitive prompts for self-reflection
 * - Transfer prompts for connecting concepts
 * - Struggle detection and adaptive responses
 *
 * Based on LearnLM research from Google DeepMind
 * Part of Phase 12.2: Socratic Prompt Architecture
 */

// ============================================
// TYPES
// ============================================

export interface ScaffoldingContext {
  conceptId: string;
  conceptName: string;
  prerequisitesCovered: string[];
  currentStep: number;
  totalSteps: number;
  studentMastery: number;
}

export interface MetacognitivePrompt {
  type: 'confidence' | 'reflection' | 'planning' | 'monitoring' | 'evaluation';
  prompt: string;
  followUp?: string;
}

export interface TransferPrompt {
  type: 'analogical' | 'procedural' | 'conceptual';
  sourceContext: string;
  targetContext: string;
  prompt: string;
}

export interface LearnLMConfig {
  // Scaffolding settings
  maxScaffoldSteps: number;           // Default: 5
  scaffoldComplexityGrowth: number;   // Default: 0.2 (20% increase per step)

  // Metacognitive settings
  confidenceCheckFrequency: number;   // Default: 3 (every 3 interactions)
  reflectionDepth: 'shallow' | 'medium' | 'deep';

  // Transfer settings
  minMasteryForTransfer: number;      // Default: 0.6
  maxTransferDistance: number;        // Default: 2 (concept hops)
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_LEARNLM_CONFIG: LearnLMConfig = {
  maxScaffoldSteps: 5,
  scaffoldComplexityGrowth: 0.2,
  confidenceCheckFrequency: 3,
  reflectionDepth: 'medium',
  minMasteryForTransfer: 0.6,
  maxTransferDistance: 2,
};

// ============================================
// SCAFFOLDING TECHNIQUES
// ============================================

/**
 * Build scaffolded learning prompt
 *
 * Scaffolding gradually reduces support as student demonstrates competence.
 * Early steps provide more structure; later steps encourage independence.
 */
export function buildScaffoldedPrompt(
  context: ScaffoldingContext,
  _config: LearnLMConfig = DEFAULT_LEARNLM_CONFIG
): string {
  const scaffoldLevel = calculateScaffoldLevel(
    context.currentStep,
    context.totalSteps,
    context.studentMastery
  );

  const basePrompt = getScaffoldBasePrompt(scaffoldLevel);
  const techniquePrompt = getScaffoldTechnique(scaffoldLevel, context);

  return `${basePrompt}

# SCAFFOLDING CONTEXT
- Concept: ${context.conceptName}
- Progress: Step ${context.currentStep} of ${context.totalSteps}
- Student mastery: ${Math.round(context.studentMastery * 100)}%
- Prerequisites covered: ${context.prerequisitesCovered.join(', ') || 'None'}

${techniquePrompt}`;
}

/**
 * Calculate scaffold level (1-5, where 1 = most support, 5 = least)
 */
function calculateScaffoldLevel(
  currentStep: number,
  totalSteps: number,
  mastery: number
): number {
  // Base level from progress
  const progressLevel = Math.ceil((currentStep / totalSteps) * 5);

  // Adjust based on mastery
  const masteryAdjustment = mastery > 0.7 ? 1 : mastery < 0.3 ? -1 : 0;

  // Clamp to 1-5
  return Math.max(1, Math.min(5, progressLevel + masteryAdjustment));
}

/**
 * Get base prompt for scaffold level
 */
function getScaffoldBasePrompt(level: number): string {
  switch (level) {
    case 1:
      return `# SCAFFOLDING LEVEL 1: HIGH SUPPORT
Provide maximum structure and guidance. Break everything into tiny steps.
Think aloud to model your reasoning. Check understanding frequently.`;

    case 2:
      return `# SCAFFOLDING LEVEL 2: MODERATE-HIGH SUPPORT
Provide structured guidance but encourage student input.
Use sentence starters and partial solutions for them to complete.`;

    case 3:
      return `# SCAFFOLDING LEVEL 3: BALANCED SUPPORT
Balance guidance with independence. Ask leading questions.
Provide hints when stuck but let them do the thinking.`;

    case 4:
      return `# SCAFFOLDING LEVEL 4: MODERATE-LOW SUPPORT
Encourage independence. Ask open-ended questions.
Only provide guidance when they explicitly need help.`;

    case 5:
      return `# SCAFFOLDING LEVEL 5: MINIMAL SUPPORT
Foster full independence. Challenge with complex questions.
Act as a peer discussing ideas rather than a teacher guiding.`;

    default:
      return `# SCAFFOLDING LEVEL 3: BALANCED SUPPORT
Balance guidance with independence.`;
  }
}

/**
 * Get specific scaffolding technique for context
 */
function getScaffoldTechnique(level: number, _context: ScaffoldingContext): string {
  const techniques = SCAFFOLDING_TECHNIQUES[level as keyof typeof SCAFFOLDING_TECHNIQUES];
  return `# TECHNIQUE FOR THIS STEP
${techniques.approach}

## EXAMPLE PROMPTS
${techniques.examples.map(e => `- "${e}"`).join('\n')}

## WHAT TO AVOID
${techniques.avoid.map(a => `- ${a}`).join('\n')}`;
}

/**
 * Scaffolding techniques by level
 */
export const SCAFFOLDING_TECHNIQUES = {
  1: {
    approach: `Use MODELING: Demonstrate your thinking process step by step.
Show exactly how to approach the problem while explaining why.`,
    examples: [
      "Let me show you how I'd start thinking about this...",
      "The first thing I notice is... because...",
      "Watch how I break this down: Step 1 is to...",
    ],
    avoid: [
      'Jumping ahead without explaining',
      'Using jargon without definition',
      'Assuming any prior knowledge',
    ],
  },
  2: {
    approach: `Use PARTIAL COMPLETION: Provide structure with blanks to fill.
Give sentence starters and frameworks for them to complete.`,
    examples: [
      "The main idea here is _____. Can you fill that in?",
      "I'll start: First we identify the... then you tell me what's next.",
      "Here's the framework: [A] leads to [B] because ___",
    ],
    avoid: [
      'Completing everything for them',
      'Moving too fast between steps',
      'Not checking understanding before proceeding',
    ],
  },
  3: {
    approach: `Use GUIDED QUESTIONING: Ask questions that lead to discovery.
Provide hints through questions rather than statements.`,
    examples: [
      "What happens if we consider X first?",
      "How does this connect to what we learned about Y?",
      "What would change if we looked at it from Z perspective?",
    ],
    avoid: [
      'Giving away the answer through leading questions',
      'Asking yes/no questions',
      'Being too vague with hints',
    ],
  },
  4: {
    approach: `Use PROMPTING: Give minimal prompts to spark thinking.
One-word or one-phrase hints when stuck.`,
    examples: [
      "Think about the relationship...",
      "Consider the alternative.",
      "What about the constraints?",
    ],
    avoid: [
      'Over-explaining',
      'Jumping in too quickly',
      'Not giving wait time',
    ],
  },
  5: {
    approach: `Use FACILITATION: Act as a thinking partner, not a teacher.
Explore ideas together without directing.`,
    examples: [
      "Interesting perspective. What led you there?",
      "I hadn't thought about it that way. Can you elaborate?",
      "That's one approach. What are the trade-offs?",
    ],
    avoid: [
      'Being directive',
      'Implying there is one right answer',
      'Correcting without them discovering the issue',
    ],
  },
};

// ============================================
// METACOGNITIVE PROMPTS
// ============================================

/**
 * Generate metacognitive prompt based on type and context
 */
export function generateMetacognitivePrompt(
  type: MetacognitivePrompt['type'],
  conceptName: string,
  studentMastery: number
): MetacognitivePrompt {
  switch (type) {
    case 'confidence':
      return {
        type: 'confidence',
        prompt: `On a scale of 1-5, how confident do you feel about ${conceptName}?`,
        followUp: studentMastery < 0.5
          ? "Whatever your answer, that's valuable information. What feels unclear?"
          : "Great! What makes you feel that way?",
      };

    case 'reflection':
      return {
        type: 'reflection',
        prompt: `Take a moment to think: What was the most important thing you learned about ${conceptName}?`,
        followUp: "How would you explain this to someone who hasn't seen it before?",
      };

    case 'planning':
      return {
        type: 'planning',
        prompt: `Before we continue, what do you think your approach will be for this next part?`,
        followUp: "What might make that approach tricky?",
      };

    case 'monitoring':
      return {
        type: 'monitoring',
        prompt: `Let's pause here. Is this making sense so far, or should we slow down?`,
        followUp: "What part would you like to revisit?",
      };

    case 'evaluation':
      return {
        type: 'evaluation',
        prompt: `Looking back at your work on ${conceptName}, what would you do differently next time?`,
        followUp: "What strategy worked best for you?",
      };
  }
}

/**
 * Get all metacognitive prompts for a concept
 */
export function getAllMetacognitivePrompts(
  conceptName: string,
  studentMastery: number
): MetacognitivePrompt[] {
  const types: MetacognitivePrompt['type'][] = [
    'confidence',
    'reflection',
    'planning',
    'monitoring',
    'evaluation',
  ];

  return types.map(type =>
    generateMetacognitivePrompt(type, conceptName, studentMastery)
  );
}

/**
 * Build metacognitive section for system prompt
 */
export function buildMetacognitiveSection(
  interactionCount: number,
  config: LearnLMConfig = DEFAULT_LEARNLM_CONFIG
): string {
  if (interactionCount % config.confidenceCheckFrequency !== 0) {
    return '';
  }

  const depth = config.reflectionDepth;
  let depthInstructions = '';

  switch (depth) {
    case 'shallow':
      depthInstructions = 'Ask a simple confidence or understanding check.';
      break;
    case 'medium':
      depthInstructions = 'Ask about their thinking process and confidence level.';
      break;
    case 'deep':
      depthInstructions = `Include multiple metacognitive probes:
- Ask about confidence
- Ask them to explain their reasoning
- Ask what they found challenging`;
      break;
  }

  return `
# METACOGNITIVE CHECK (Due this interaction)
${depthInstructions}

This helps students develop awareness of their own learning and identifies gaps early.`;
}

// ============================================
// TRANSFER PROMPTS
// ============================================

/**
 * Generate transfer prompt to connect concepts
 */
export function generateTransferPrompt(
  type: TransferPrompt['type'],
  sourceContext: string,
  targetContext: string,
  studentMastery: number,
  config: LearnLMConfig = DEFAULT_LEARNLM_CONFIG
): TransferPrompt | null {
  // Only generate transfer prompts above mastery threshold
  if (studentMastery < config.minMasteryForTransfer) {
    return null;
  }

  switch (type) {
    case 'analogical':
      return {
        type: 'analogical',
        sourceContext,
        targetContext,
        prompt: `How is ${targetContext} similar to ${sourceContext}? What patterns do you notice?`,
      };

    case 'procedural':
      return {
        type: 'procedural',
        sourceContext,
        targetContext,
        prompt: `The approach you used for ${sourceContext} can work here too. What would the first step be for ${targetContext}?`,
      };

    case 'conceptual':
      return {
        type: 'conceptual',
        sourceContext,
        targetContext,
        prompt: `${sourceContext} and ${targetContext} share an underlying principle. Can you identify what connects them?`,
      };
  }
}

/**
 * Build transfer section for system prompt
 */
export function buildTransferSection(
  sourceConcept: string,
  relatedConcepts: string[],
  studentMastery: number
): string {
  if (studentMastery < 0.6 || relatedConcepts.length === 0) {
    return '';
  }

  return `
# TRANSFER OPPORTUNITIES
The student has shown good understanding of ${sourceConcept}.
Look for opportunities to connect to these related concepts:
${relatedConcepts.map(c => `- ${c}`).join('\n')}

Transfer prompts to try:
- "How does this relate to [related concept]?"
- "What pattern do you see connecting these ideas?"
- "Could you apply this same approach to [related concept]?`;
}

// ============================================
// STRUGGLE DETECTION
// ============================================

export interface StruggleIndicators {
  isStruggling: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  indicators: string[];
  suggestedAction: string;
}

/**
 * Detect struggle from student message and context
 */
export function detectStruggle(
  message: string,
  consecutiveWrong: number,
  responseTimeSeconds: number,
  interactionCount: number
): StruggleIndicators {
  const indicators: string[] = [];
  let severity: StruggleIndicators['severity'] = 'none';

  const lowerMessage = message.toLowerCase();

  // Explicit struggle indicators
  const explicitStruggle = [
    "don't understand",
    "doesn't make sense",
    "confused",
    "lost",
    "stuck",
    "help",
    "give up",
    "too hard",
    "impossible",
  ];

  for (const phrase of explicitStruggle) {
    if (lowerMessage.includes(phrase)) {
      indicators.push(`Explicit: "${phrase}"`);
    }
  }

  // Consecutive wrong answers
  if (consecutiveWrong >= 3) {
    indicators.push(`${consecutiveWrong} consecutive wrong answers`);
  } else if (consecutiveWrong >= 1) {
    indicators.push(`${consecutiveWrong} wrong answer(s)`);
  }

  // Response time (very fast or very slow may indicate issues)
  if (responseTimeSeconds < 2 && interactionCount > 2) {
    indicators.push('Very fast response (possible guessing)');
  } else if (responseTimeSeconds > 120) {
    indicators.push('Very slow response (possible disengagement)');
  }

  // Short, non-committal responses
  if (message.length < 10 && !['yes', 'no', 'ok', 'okay'].includes(lowerMessage.trim())) {
    indicators.push('Very short response');
  }

  // Question marks indicating confusion
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount >= 2) {
    indicators.push('Multiple questions asked');
  }

  // Determine severity
  if (indicators.length === 0) {
    severity = 'none';
  } else if (indicators.length === 1 || consecutiveWrong === 1) {
    severity = 'mild';
  } else if (indicators.length <= 3 || consecutiveWrong <= 2) {
    severity = 'moderate';
  } else {
    severity = 'severe';
  }

  // Suggested action
  let suggestedAction = '';
  switch (severity) {
    case 'none':
      suggestedAction = 'Continue with current approach';
      break;
    case 'mild':
      suggestedAction = 'Check in with understanding, offer clarification';
      break;
    case 'moderate':
      suggestedAction = 'Escalate intervention level, provide more scaffolding';
      break;
    case 'severe':
      suggestedAction = 'Acknowledge difficulty, consider simpler approach or break';
      break;
  }

  return {
    isStruggling: severity !== 'none',
    severity,
    indicators,
    suggestedAction,
  };
}

/**
 * Build struggle response section for prompt
 */
export function buildStruggleResponseSection(
  struggle: StruggleIndicators
): string {
  if (!struggle.isStruggling) {
    return '';
  }

  return `
# STRUGGLE DETECTED: ${struggle.severity.toUpperCase()}
Indicators: ${struggle.indicators.join(', ')}

## REQUIRED RESPONSE ADAPTATION
${struggle.suggestedAction}

## PHRASES TO USE
${getStrugglePhrases(struggle.severity)}`;
}

/**
 * Get appropriate phrases for struggle level
 */
function getStrugglePhrases(severity: StruggleIndicators['severity']): string {
  switch (severity) {
    case 'mild':
      return `- "Let me know if you'd like me to explain that differently"
- "This is a good question to pause on"
- "Take your time with this one"`;

    case 'moderate':
      return `- "This is tricky - lots of people find this challenging"
- "Let's slow down and break this into smaller pieces"
- "Would a different approach help?"`;

    case 'severe':
      return `- "I can see this is frustrating. That's okay - it means you're learning"
- "Let's take a step back. No rush here"
- "Would you like to try something simpler first, or take a short break?"
- "You've been working hard on this. What would help right now?"`;

    default:
      return '';
  }
}

// ============================================
// GENERATION SETTINGS
// ============================================

/**
 * Get recommended generation settings based on context
 */
export function getLearnLMGenerationConfig(
  scaffoldLevel: number,
  struggleSeverity: StruggleIndicators['severity']
): {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
} {
  // Lower temperature for more structured scaffolding
  let temperature = 0.5;
  if (scaffoldLevel <= 2) {
    temperature = 0.3; // More deterministic for high support
  } else if (scaffoldLevel >= 4) {
    temperature = 0.7; // More creative for facilitation
  }

  // Adjust for struggle
  if (struggleSeverity === 'severe') {
    temperature = 0.3; // More predictable when student is struggling
  }

  // Shorter responses for struggling students
  let maxOutputTokens = 300;
  if (struggleSeverity === 'severe') {
    maxOutputTokens = 150; // Keep it simple
  } else if (scaffoldLevel >= 4) {
    maxOutputTokens = 400; // Allow more exploration
  }

  return {
    temperature,
    maxOutputTokens,
    topP: 0.85,
  };
}

// ============================================
// EXPORTS
// ============================================

const learnLMPromptsModule = {
  buildScaffoldedPrompt,
  generateMetacognitivePrompt,
  getAllMetacognitivePrompts,
  buildMetacognitiveSection,
  generateTransferPrompt,
  buildTransferSection,
  detectStruggle,
  buildStruggleResponseSection,
  getLearnLMGenerationConfig,
  DEFAULT_LEARNLM_CONFIG,
  SCAFFOLDING_TECHNIQUES,
};

export default learnLMPromptsModule;
