/**
 * Content Variants System
 *
 * Provides content variants based on learner state:
 * - Simpler versions: more examples, simpler language
 * - Standard versions: original content
 * - Advanced versions: faster pace, deeper concepts
 */

import type { StruggleSignals } from '@/lib/adaptive/struggleDetection';

// ============================================
// TYPES
// ============================================

export interface AtomContent {
  title: string;
  body: string;
  keyPoints: string[];
  examples: Example[];
  videoUrl?: string;
  estimatedMinutes: number;
}

export interface Example {
  title: string;
  scenario: string;
  explanation: string;
}

export interface ContentVariant {
  id: string;
  baseAtomId: string; // The original atom this is a variant of
  difficulty: 'simpler' | 'standard' | 'advanced';
  style: 'visual' | 'textual' | 'example-heavy' | 'conceptual';
  content: AtomContent;
}

export interface LearnerState {
  skillMastery: number;
  preferredStyle: string;
  struggleHistory: StruggleSignals[];
  consecutiveCorrect: number;
  averageTimePerQuestion: number;
}

// ============================================
// CONTENT VARIANTS DATABASE
// ============================================

/**
 * Content variants for key lessons
 * Each base atom can have simpler, standard, and advanced variants
 */
export const CONTENT_VARIANTS: Record<string, ContentVariant[]> = {
  // Lesson 1.1: What is Generative AI?
  'atom-1.1-intro': [
    {
      id: 'atom-1.1-intro-simpler',
      baseAtomId: 'atom-1.1-intro',
      difficulty: 'simpler',
      style: 'example-heavy',
      content: {
        title: 'What is Generative AI? (Simple Version)',
        body: `
Think of Generative AI like a very creative assistant that learned from reading millions of books, articles, and conversations.

**The Simple Explanation:**
When you type something to ChatGPT, it's like asking a friend who's read everything ever written: "Based on everything you know, what would be a good response to this?"

The AI doesn't "think" like we do - it predicts what words should come next, kind of like your phone's autocomplete, but way more sophisticated.

**What makes it special?**
- It creates NEW content, not just searches for existing answers
- It can write in different styles and tones
- It improves based on how you phrase your questions
        `.trim(),
        keyPoints: [
          'AI predicts good responses based on patterns it learned',
          'It creates new content, not just searches',
          'Better questions = better answers',
        ],
        examples: [
          {
            title: 'Email Assistant',
            scenario: 'You need to write a polite email declining a meeting',
            explanation: 'ChatGPT can draft this because it has seen millions of professional emails and knows what "polite decline" looks like.',
          },
          {
            title: 'Recipe Helper',
            scenario: 'You have chicken, rice, and vegetables - what can you cook?',
            explanation: 'The AI combines its knowledge of cooking patterns to suggest recipes you might not have thought of.',
          },
        ],
        estimatedMinutes: 8,
      },
    },
    {
      id: 'atom-1.1-intro-standard',
      baseAtomId: 'atom-1.1-intro',
      difficulty: 'standard',
      style: 'textual',
      content: {
        title: 'Understanding Generative AI',
        body: `
Generative AI represents a significant shift in how we interact with technology. Unlike traditional software that follows pre-programmed rules, generative AI systems like ChatGPT create new content by recognizing patterns in vast amounts of training data.

**How It Works:**
Large Language Models (LLMs) are trained on billions of words from books, websites, and other text sources. Through this training, they learn:
- Language patterns and grammar
- Relationships between concepts
- Different writing styles and tones
- How ideas connect and flow

**Key Capabilities:**
1. **Content Generation**: Writing emails, reports, code, creative text
2. **Analysis**: Summarizing documents, extracting key points
3. **Transformation**: Rewriting content in different styles or formats
4. **Conversation**: Engaging in natural dialogue with context awareness

**Important Limitations:**
- Knowledge cutoff dates (doesn't know recent events)
- Can generate plausible-sounding but incorrect information
- No true understanding - pattern matching at scale
        `.trim(),
        keyPoints: [
          'LLMs learn patterns from massive text datasets',
          'They generate new content, not retrieve existing answers',
          'Powerful but with important limitations to understand',
        ],
        examples: [
          {
            title: 'Business Writing',
            scenario: 'Drafting a proposal executive summary',
            explanation: 'ChatGPT can structure arguments, maintain professional tone, and highlight key benefits based on patterns from successful proposals.',
          },
          {
            title: 'Code Assistance',
            scenario: 'Writing a function to parse CSV data',
            explanation: 'The model has seen millions of code examples and can generate syntactically correct, functional code.',
          },
        ],
        estimatedMinutes: 12,
      },
    },
    {
      id: 'atom-1.1-intro-advanced',
      baseAtomId: 'atom-1.1-intro',
      difficulty: 'advanced',
      style: 'conceptual',
      content: {
        title: 'Generative AI: Deep Dive',
        body: `
**Transformer Architecture & Attention**

Modern generative AI is built on the transformer architecture, which uses self-attention mechanisms to process sequences in parallel. This allows the model to weigh the relevance of different parts of the input when generating each output token.

**Training Process:**
1. **Pre-training**: Learning general language patterns from internet-scale data
2. **Fine-tuning**: Specialized training on curated datasets for specific tasks
3. **RLHF**: Reinforcement Learning from Human Feedback to align outputs with human preferences

**Emergent Capabilities:**
As models scale, they exhibit emergent capabilities not explicitly trained:
- In-context learning (few-shot prompting)
- Chain-of-thought reasoning
- Task decomposition

**Limitations & Mitigation:**
- Hallucinations: Mitigate with retrieval-augmented generation (RAG)
- Bias: Address through diverse training data and careful prompting
- Outdated knowledge: Supplement with real-time data retrieval
        `.trim(),
        keyPoints: [
          'Transformer architecture enables parallel processing of sequences',
          'RLHF aligns model outputs with human preferences',
          'Emergent capabilities appear at scale',
          'Understand limitations to use effectively',
        ],
        examples: [
          {
            title: 'RAG Implementation',
            scenario: 'Building a chatbot that answers questions about company policies',
            explanation: 'Combining LLM generation with document retrieval ensures accurate, up-to-date responses grounded in actual policy documents.',
          },
        ],
        estimatedMinutes: 15,
      },
    },
  ],

  // Lesson 2.1: Prompt Components
  'atom-2.1-rtcf': [
    {
      id: 'atom-2.1-rtcf-simpler',
      baseAtomId: 'atom-2.1-rtcf',
      difficulty: 'simpler',
      style: 'example-heavy',
      content: {
        title: 'The 4 Parts of a Good Prompt (Simple)',
        body: `
Every good prompt has 4 parts - think of it like ordering at a restaurant!

**R - Role:** Who is the AI pretending to be?
"Act as a friendly teacher..."

**T - Task:** What do you want done?
"...who explains concepts simply..."

**C - Context:** What background info helps?
"...for a beginner learning about AI..."

**F - Format:** How should the answer look?
"...using bullet points and one example."

**The Restaurant Analogy:**
- Role = What kind of restaurant (Italian, casual)
- Task = What dish you want (pasta)
- Context = Your dietary needs (no gluten)
- Format = How you want it (to-go, on a plate)
        `.trim(),
        keyPoints: [
          'R = Role (who is AI being?)',
          'T = Task (what to do?)',
          'C = Context (helpful background)',
          'F = Format (how should output look?)',
        ],
        examples: [
          {
            title: 'Bad Prompt',
            scenario: '"Write about marketing"',
            explanation: 'Too vague - no role, unclear task, no context, no format specified.',
          },
          {
            title: 'Good Prompt',
            scenario: '"Act as a marketing expert (R). Write 5 social media post ideas (T) for a small bakery launching a new cupcake flavor (C). Format as numbered list with emoji suggestions (F)."',
            explanation: 'All 4 parts are clear - AI knows exactly what you need.',
          },
        ],
        estimatedMinutes: 8,
      },
    },
    {
      id: 'atom-2.1-rtcf-standard',
      baseAtomId: 'atom-2.1-rtcf',
      difficulty: 'standard',
      style: 'textual',
      content: {
        title: 'RTCF Prompt Framework',
        body: `
The RTCF framework provides a systematic approach to crafting effective prompts that consistently produce high-quality outputs.

**Role** - Establish the AI's persona
Defining a role activates relevant knowledge and adjusts tone:
- "You are an experienced marketing strategist"
- "Act as a senior software engineer"
- "Assume the role of a patient educator"

**Task** - Specify the action clearly
Use action verbs and be specific about outcomes:
- "Analyze the following data and identify trends"
- "Write a persuasive email that addresses objections"
- "Create a step-by-step guide for beginners"

**Context** - Provide relevant background
Include information that shapes the response:
- Target audience characteristics
- Industry or domain constraints
- Previous related information
- Goals and success criteria

**Format** - Define output structure
Specify how you want information presented:
- Length (word count, number of items)
- Structure (bullets, paragraphs, tables)
- Style (formal, casual, technical)
- Include/exclude elements
        `.trim(),
        keyPoints: [
          'Role activates relevant AI knowledge and adjusts tone',
          'Task should use clear action verbs',
          'Context provides constraints and background',
          'Format ensures usable output structure',
        ],
        examples: [
          {
            title: 'Marketing Brief',
            scenario: 'Creating ad copy for a product launch',
            explanation: 'Role: creative director. Task: write 3 headline variants. Context: luxury watch, affluent 35-50 audience. Format: headline + 10-word subhead each.',
          },
        ],
        estimatedMinutes: 12,
      },
    },
  ],

  // Lesson 3.1: Prompt Chaining
  'atom-3.1-chaining': [
    {
      id: 'atom-3.1-chaining-simpler',
      baseAtomId: 'atom-3.1-chaining',
      difficulty: 'simpler',
      style: 'example-heavy',
      content: {
        title: 'Breaking Big Tasks into Steps (Simple)',
        body: `
Prompt chaining is like giving step-by-step instructions instead of one big ask.

**Why Chain Prompts?**
Imagine asking someone to "Plan my entire vacation." That's overwhelming!

Instead, break it down:
1. "What are good destinations for beach lovers in March?"
2. "For [chosen destination], what are must-see attractions?"
3. "Create a 5-day itinerary visiting those attractions"
4. "What hotels are near those locations?"

**The Recipe Analogy:**
You don't say "make me a cake." You say:
- First, gather ingredients
- Then, mix dry ingredients
- Next, add wet ingredients
- Finally, bake and decorate

Each step builds on the last!
        `.trim(),
        keyPoints: [
          'Break big tasks into smaller steps',
          'Each step builds on the previous answer',
          'Better control and easier to fix mistakes',
        ],
        examples: [
          {
            title: 'Content Creation Chain',
            scenario: 'Writing a blog post',
            explanation: 'Step 1: Outline. Step 2: Draft intro. Step 3: Expand each section. Step 4: Edit for tone. Each prompt uses output from the previous one.',
          },
        ],
        estimatedMinutes: 8,
      },
    },
  ],
};

// ============================================
// VARIANT SELECTION
// ============================================

/**
 * Select the appropriate content variant based on learner state
 */
export function selectVariant(
  baseAtomId: string,
  learnerState: LearnerState
): ContentVariant | null {
  const variants = CONTENT_VARIANTS[baseAtomId];
  if (!variants || variants.length === 0) return null;

  // Determine appropriate difficulty
  const difficulty = determineDifficulty(learnerState);

  // Find variant matching difficulty
  const matchingVariant = variants.find(v => v.difficulty === difficulty);

  // Fall back to standard if specific difficulty not available
  return matchingVariant || variants.find(v => v.difficulty === 'standard') || variants[0];
}

/**
 * Determine difficulty level based on learner state
 */
function determineDifficulty(state: LearnerState): 'simpler' | 'standard' | 'advanced' {
  const { skillMastery, struggleHistory, consecutiveCorrect, averageTimePerQuestion } = state;

  // Recent struggles -> simpler content
  const recentStruggles = struggleHistory.filter(
    s => s.severity === 'moderate' || s.severity === 'severe'
  );
  if (recentStruggles.length >= 2) {
    return 'simpler';
  }

  // Low mastery -> simpler content
  if (skillMastery < 0.4) {
    return 'simpler';
  }

  // High mastery + consistent performance -> advanced
  if (skillMastery > 0.8 && consecutiveCorrect >= 3) {
    return 'advanced';
  }

  // Fast accurate responses suggest readiness for advanced
  if (skillMastery > 0.7 && averageTimePerQuestion < 30 && consecutiveCorrect >= 2) {
    return 'advanced';
  }

  return 'standard';
}

/**
 * Get all available variants for an atom
 */
export function getVariantsForAtom(baseAtomId: string): ContentVariant[] {
  return CONTENT_VARIANTS[baseAtomId] || [];
}

/**
 * Check if simpler variant is available for an atom
 */
export function hasSimplerVariant(baseAtomId: string): boolean {
  const variants = CONTENT_VARIANTS[baseAtomId];
  return variants?.some(v => v.difficulty === 'simpler') ?? false;
}

/**
 * Get simpler variant for remediation
 */
export function getSimplerVariant(baseAtomId: string): ContentVariant | null {
  const variants = CONTENT_VARIANTS[baseAtomId];
  return variants?.find(v => v.difficulty === 'simpler') || null;
}

// ============================================
// VARIANT METADATA
// ============================================

/**
 * Get estimated time savings from simpler content
 */
export function getTimeSavings(baseAtomId: string, currentDifficulty: string): number {
  const variants = CONTENT_VARIANTS[baseAtomId];
  if (!variants) return 0;

  const current = variants.find(v => v.difficulty === currentDifficulty);
  const standard = variants.find(v => v.difficulty === 'standard');

  if (!current || !standard) return 0;

  return standard.content.estimatedMinutes - current.content.estimatedMinutes;
}

/**
 * List atoms that have content variants
 */
export function getAtomsWithVariants(): string[] {
  return Object.keys(CONTENT_VARIANTS);
}

// Types are already exported at their definitions above
