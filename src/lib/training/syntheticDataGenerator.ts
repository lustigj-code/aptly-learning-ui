/**
 * Synthetic Training Data Generator
 *
 * Generates high-quality Socratic dialogue examples for training
 * when real user data is insufficient.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  type InstructionExample,
  type ConversationalExample,
  type PreferencePair,
} from './schema';

// ============================================
// SOCIAL MEDIA MARKETING CURRICULUM
// ============================================

export const CURRICULUM_TOPICS = [
  // Module 1: Fundamentals
  {
    module: 'Fundamentals',
    topics: [
      { id: 'smm-intro', title: 'Introduction to Social Media Marketing', difficulty: 'beginner' },
      { id: 'platform-overview', title: 'Social Media Platform Overview', difficulty: 'beginner' },
      { id: 'audience-basics', title: 'Understanding Your Audience', difficulty: 'beginner' },
      { id: 'content-strategy', title: 'Content Strategy Basics', difficulty: 'beginner' },
    ],
  },
  // Module 2: Campaign Structure
  {
    module: 'Campaign Structure',
    topics: [
      { id: 'campaign-objectives', title: 'Campaign Objectives (Awareness, Consideration, Conversion)', difficulty: 'intermediate' },
      { id: 'campaign-structure', title: 'Campaign, Ad Set, Ad Structure', difficulty: 'intermediate' },
      { id: 'budget-types', title: 'Budget Types and Optimization', difficulty: 'intermediate' },
      { id: 'scheduling', title: 'Ad Scheduling and Delivery', difficulty: 'intermediate' },
    ],
  },
  // Module 3: Audience Targeting
  {
    module: 'Audience Targeting',
    topics: [
      { id: 'core-audiences', title: 'Core Audiences (Demographics, Interests, Behaviors)', difficulty: 'intermediate' },
      { id: 'custom-audiences', title: 'Custom Audiences from Data Sources', difficulty: 'intermediate' },
      { id: 'lookalike-audiences', title: 'Lookalike Audiences', difficulty: 'intermediate' },
      { id: 'audience-exclusions', title: 'Audience Exclusions and Overlap', difficulty: 'advanced' },
    ],
  },
  // Module 4: Ad Creative
  {
    module: 'Ad Creative',
    topics: [
      { id: 'ad-formats', title: 'Ad Formats (Image, Video, Carousel, Collection)', difficulty: 'intermediate' },
      { id: 'creative-best-practices', title: 'Creative Best Practices', difficulty: 'intermediate' },
      { id: 'copywriting', title: 'Ad Copywriting for Social', difficulty: 'intermediate' },
      { id: 'creative-testing', title: 'A/B Testing Creative Elements', difficulty: 'advanced' },
    ],
  },
  // Module 5: Measurement & Analytics
  {
    module: 'Measurement & Analytics',
    topics: [
      { id: 'pixel-setup', title: 'Facebook Pixel Setup and Events', difficulty: 'intermediate' },
      { id: 'conversion-tracking', title: 'Conversion Tracking and Attribution', difficulty: 'advanced' },
      { id: 'reporting', title: 'Reporting and Analysis', difficulty: 'intermediate' },
      { id: 'optimization', title: 'Campaign Optimization Strategies', difficulty: 'advanced' },
    ],
  },
];

// ============================================
// STUDENT PERSONA TEMPLATES
// ============================================

export const STUDENT_PERSONAS = [
  {
    id: 'beginner-career-changer',
    name: 'Alex',
    background: 'Former retail manager looking to switch to digital marketing',
    level: 'beginner',
    goal: 'Get certified and land first marketing job',
    struggles: ['Marketing jargon', 'Technical setup'],
    strengths: ['Understanding customers', 'Sales experience'],
  },
  {
    id: 'intermediate-small-biz',
    name: 'Jordan',
    background: 'Small business owner running their own ads',
    level: 'intermediate',
    goal: 'Improve ad performance and reduce costs',
    struggles: ['Scaling campaigns', 'Analytics interpretation'],
    strengths: ['Knows their product well', 'Budget conscious'],
  },
  {
    id: 'intermediate-agency',
    name: 'Sam',
    background: 'Junior marketer at agency, managing multiple clients',
    level: 'intermediate',
    goal: 'Become senior strategist',
    struggles: ['Advanced targeting', 'Client reporting'],
    strengths: ['Fast learner', 'Good with tools'],
  },
  {
    id: 'advanced-specialist',
    name: 'Taylor',
    background: 'E-commerce specialist wanting to master Meta ads',
    level: 'advanced',
    goal: 'Expert-level optimization skills',
    struggles: ['Cutting-edge strategies', 'Attribution'],
    strengths: ['Data analysis', 'Technical skills'],
  },
];

// ============================================
// QUESTION TEMPLATES BY TYPE
// ============================================

const QUESTION_TEMPLATES = {
  conceptual: [
    'What is {concept}?',
    'Can you explain {concept} to me?',
    'I don\'t understand {concept}. Help?',
    'What\'s the difference between {conceptA} and {conceptB}?',
    'Why is {concept} important?',
  ],
  practical: [
    'How do I set up {thing}?',
    'What\'s the best way to {action}?',
    'I\'m trying to {goal}, how should I approach it?',
    'My {metric} is low, how can I improve it?',
    'Should I use {optionA} or {optionB} for {goal}?',
  ],
  troubleshooting: [
    'My {thing} isn\'t working, what\'s wrong?',
    'I followed the steps but {result}. Why?',
    'I\'m getting an error when I try to {action}.',
    'My campaign isn\'t spending, help!',
    'The results don\'t match what I expected.',
  ],
  strategic: [
    'How much budget should I allocate to {thing}?',
    'When should I use {strategy}?',
    'What\'s your opinion on {tactic}?',
    'How do I know if {thing} is working?',
    'What metrics matter most for {goal}?',
  ],
};

// ============================================
// GENERATION PROMPTS
// ============================================

const SOCRATIC_GENERATION_PROMPT = `You are generating training data for a Socratic AI tutor.

Your task is to generate a realistic tutoring conversation where the tutor (Sage) uses the Socratic method.

RULES FOR SAGE'S RESPONSES:
1. NEVER give direct answers
2. Always ask questions that guide the student to discover the answer
3. Use real-world examples from actual brands/campaigns
4. Build on what the student already knows
5. Celebrate when they figure something out
6. If they're confused, break it down into smaller steps
7. End every response with a follow-up question

STUDENT PROFILE:
{studentProfile}

TOPIC: {topic}
DIFFICULTY: {difficulty}

Generate a conversation with 4-6 exchanges where:
- The student asks a question or expresses confusion about the topic
- Sage guides them through discovery using questions
- The student shows progression in understanding
- Sage celebrates their "aha" moment

Format as JSON:
{
  "conversations": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."},
    ...
  ],
  "topic": "...",
  "quality_indicators": {
    "socratic_turns": number,
    "questions_asked": number,
    "examples_used": number,
    "understanding_demonstrated": boolean
  }
}`;

const PREFERENCE_GENERATION_PROMPT = `Generate a preference pair for training a reward model.

Given this student question in the context of "{topic}":

STUDENT: {question}

Generate TWO tutor responses:
1. CHOSEN: An excellent Socratic response that guides discovery through questions
2. REJECTED: A poor response that just gives the answer directly

Format as JSON:
{
  "prompt": "...",
  "chosen": "...",
  "rejected": "...",
  "preference_reason": "..."
}`;

// ============================================
// GENERATION FUNCTIONS
// ============================================

/**
 * Generate synthetic Socratic conversations
 */
export async function generateSocraticConversations(
  genAI: GoogleGenerativeAI,
  count: number = 100,
  onProgress?: (completed: number, total: number) => void
): Promise<ConversationalExample[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const conversations: ConversationalExample[] = [];

  let completed = 0;

  for (const moduleData of CURRICULUM_TOPICS) {
    for (const topic of moduleData.topics) {
      if (conversations.length >= count) break;

      for (const persona of STUDENT_PERSONAS) {
        if (conversations.length >= count) break;

        // Skip mismatched difficulties
        if (topic.difficulty === 'advanced' && persona.level === 'beginner') continue;

        const prompt = SOCRATIC_GENERATION_PROMPT
          .replace('{studentProfile}', JSON.stringify(persona, null, 2))
          .replace('{topic}', topic.title)
          .replace('{difficulty}', topic.difficulty);

        try {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9, // Higher for variety
              maxOutputTokens: 2048,
            },
          });

          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);

            conversations.push({
              system: buildSystemPrompt(topic.title, persona.level),
              conversations: data.conversations.map((c: { role: string; content: string }) => ({
                role: c.role as 'user' | 'assistant',
                content: c.content,
              })),
              quality_score: data.quality_indicators?.socratic_turns >= 3 ? 0.9 : 0.7,
              topic: topic.title,
              session_id: `synthetic_${topic.id}_${persona.id}_${Date.now()}`,
            });
          }

          completed++;
          onProgress?.(completed, count);

          // Rate limiting
          await sleep(500);

        } catch (error) {
          console.warn(`Failed to generate conversation for ${topic.title}:`, error);
        }
      }
    }
  }

  return conversations;
}

/**
 * Generate synthetic preference pairs
 */
export async function generatePreferencePairsData(
  genAI: GoogleGenerativeAI,
  count: number = 100,
  onProgress?: (completed: number, total: number) => void
): Promise<PreferencePair[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const pairs: PreferencePair[] = [];

  let completed = 0;

  // Generate questions for each topic
  for (const moduleData of CURRICULUM_TOPICS) {
    for (const topic of moduleData.topics) {
      if (pairs.length >= count) break;

      // Generate multiple questions per topic
      for (const templateType of Object.keys(QUESTION_TEMPLATES)) {
        if (pairs.length >= count) break;

        const templates = QUESTION_TEMPLATES[templateType as keyof typeof QUESTION_TEMPLATES];
        const template = templates[Math.floor(Math.random() * templates.length)];

        // Fill in template with topic-relevant content
        const question = fillQuestionTemplate(template, topic.title);

        const prompt = PREFERENCE_GENERATION_PROMPT
          .replace('{topic}', topic.title)
          .replace('{question}', question);

        try {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          });

          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);

            pairs.push({
              prompt: data.prompt || `Topic: ${topic.title}\n\nStudent: ${question}`,
              chosen: data.chosen,
              rejected: data.rejected,
              preference_reason: data.preference_reason,
              topic: topic.title,
              quality_delta: 0.5,
            });
          }

          completed++;
          onProgress?.(completed, count);

          await sleep(500);

        } catch (error) {
          console.warn(`Failed to generate preference pair for ${topic.title}:`, error);
        }
      }
    }
  }

  return pairs;
}

/**
 * Generate instruction-format training data
 */
export async function generateInstructionData(
  genAI: GoogleGenerativeAI,
  count: number = 100,
  onProgress?: (completed: number, total: number) => void
): Promise<InstructionExample[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const examples: InstructionExample[] = [];

  let completed = 0;

  for (const moduleData of CURRICULUM_TOPICS) {
    for (const topic of moduleData.topics) {
      if (examples.length >= count) break;

      for (const persona of STUDENT_PERSONAS) {
        if (examples.length >= count) break;

        // Generate a question-answer pair
        const questionPrompt = `Generate a realistic question a ${persona.level} student might ask about "${topic.title}" in social media marketing.

The student's background: ${persona.background}
They struggle with: ${persona.struggles.join(', ')}

Just output the question, nothing else.`;

        try {
          const questionResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: questionPrompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
          });
          const question = questionResult.response.text().trim();

          // Now generate Socratic response
          const responsePrompt = `You are Sage, a Socratic tutor for social media marketing.

A ${persona.level} student asks: "${question}"

Respond using the Socratic method:
- Ask questions to guide them to the answer
- Use real examples from actual brands
- Never give the answer directly
- End with a follow-up question

Keep your response under 200 words.`;

          const responseResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: responsePrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
          });
          const response = responseResult.response.text().trim();

          examples.push({
            instruction: `You are Sage, a Socratic tutor for social media marketing. The student is studying "${topic.title}". Respond using the Socratic method - guide them to discover the answer through questions, never give direct answers.`,
            input: question,
            output: response,
            quality_score: 0.85,
            topic: topic.title,
            difficulty: topic.difficulty,
            conversation_id: `synthetic_inst_${topic.id}_${persona.id}_${Date.now()}`,
          });

          completed++;
          onProgress?.(completed, count);

          await sleep(500);

        } catch (error) {
          console.warn(`Failed to generate instruction example for ${topic.title}:`, error);
        }
      }
    }
  }

  return examples;
}

/**
 * Generate complete synthetic training dataset
 */
export async function generateFullSyntheticDataset(
  genAI: GoogleGenerativeAI,
  config: {
    conversationCount: number;
    preferencePairCount: number;
    instructionCount: number;
  } = {
    conversationCount: 500,
    preferencePairCount: 300,
    instructionCount: 200,
  },
  onProgress?: (phase: string, completed: number, total: number) => void
): Promise<{
  conversations: ConversationalExample[];
  preferencePairs: PreferencePair[];
  instructions: InstructionExample[];
  stats: {
    totalExamples: number;
    topicsConvered: number;
    avgQualityScore: number;
  };
}> {
  console.log('[SyntheticData] Starting generation...');

  // Generate conversations
  onProgress?.('conversations', 0, config.conversationCount);
  const conversations = await generateSocraticConversations(
    genAI,
    config.conversationCount,
    (c, t) => onProgress?.('conversations', c, t)
  );

  // Generate preference pairs
  onProgress?.('preference_pairs', 0, config.preferencePairCount);
  const preferencePairs = await generatePreferencePairsData(
    genAI,
    config.preferencePairCount,
    (c, t) => onProgress?.('preference_pairs', c, t)
  );

  // Generate instruction examples
  onProgress?.('instructions', 0, config.instructionCount);
  const instructions = await generateInstructionData(
    genAI,
    config.instructionCount,
    (c, t) => onProgress?.('instructions', c, t)
  );

  // Calculate stats
  const allTopics = new Set([
    ...conversations.map(c => c.topic),
    ...preferencePairs.map(p => p.topic),
    ...instructions.map(i => i.topic),
  ]);

  const avgQuality = (
    conversations.reduce((s, c) => s + c.quality_score, 0) / conversations.length +
    instructions.reduce((s, i) => s + i.quality_score, 0) / instructions.length
  ) / 2;

  return {
    conversations,
    preferencePairs,
    instructions,
    stats: {
      totalExamples: conversations.length + preferencePairs.length + instructions.length,
      topicsConvered: allTopics.size,
      avgQualityScore: avgQuality,
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildSystemPrompt(topic: string, level: string): string {
  return `You are Sage, an expert AI tutor for social media marketing.

Your teaching principles:
1. NEVER give direct answers - use Socratic questioning
2. Ask what the student already knows
3. Use real-world examples from actual campaigns
4. Adapt to the student's level (currently: ${level})
5. Celebrate understanding and normalize confusion

Current topic: ${topic}`;
}

function fillQuestionTemplate(template: string, topic: string): string {
  const replacements: Record<string, string[]> = {
    '{concept}': [topic, 'this', 'that technique'],
    '{conceptA}': ['awareness campaigns', 'core audiences', 'CPC'],
    '{conceptB}': ['conversion campaigns', 'custom audiences', 'CPM'],
    '{thing}': ['my campaign', 'the pixel', 'my ad set', 'tracking'],
    '{action}': ['target my audience', 'optimize for conversions', 'scale my budget'],
    '{goal}': ['increasing sales', 'generating leads', 'brand awareness'],
    '{metric}': ['CTR', 'conversion rate', 'ROAS', 'CPC'],
    '{optionA}': ['automatic placements', 'CBO', 'broad targeting'],
    '{optionB}': ['manual placements', 'ABO', 'detailed targeting'],
    '{strategy}': ['lookalike audiences', 'retargeting', 'CBO'],
    '{tactic}': ['boosting posts', 'broad targeting', 'testing creative'],
    '{result}': ["it's not working", "I'm not seeing results", "the costs are high"],
  };

  let result = template;
  for (const [placeholder, options] of Object.entries(replacements)) {
    if (result.includes(placeholder)) {
      const replacement = options[Math.floor(Math.random() * options.length)];
      result = result.replace(placeholder, replacement);
    }
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Save synthetic data to files
 */
export function formatForTraining(
  data: {
    conversations: ConversationalExample[];
    preferencePairs: PreferencePair[];
    instructions: InstructionExample[];
  }
): {
  conversationsJsonl: string;
  preferencePairsJsonl: string;
  instructionsJsonl: string;
} {
  return {
    conversationsJsonl: data.conversations.map(c => JSON.stringify({
      messages: [
        { role: 'system', content: c.system },
        ...c.conversations,
      ],
    })).join('\n'),
    preferencePairsJsonl: data.preferencePairs.map(p => JSON.stringify(p)).join('\n'),
    instructionsJsonl: data.instructions.map(i => JSON.stringify(i)).join('\n'),
  };
}
