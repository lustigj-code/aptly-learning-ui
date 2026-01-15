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
// AI AT WORK CURRICULUM (41 Skills)
// ============================================

export const CURRICULUM_TOPICS = [
  // Module 1: Foundations (11 skills)
  {
    module: 'Foundations',
    topics: [
      { id: 'M1-genai-definition', title: 'Describe what generative AI is', difficulty: 'beginner' },
      { id: 'M1-llm-explanation', title: 'Explain how LLMs like ChatGPT work', difficulty: 'beginner' },
      { id: 'M1-chatgpt-strengths', title: 'Identify strengths of ChatGPT', difficulty: 'beginner' },
      { id: 'M1-chatgpt-limitations', title: 'Identify limitations of ChatGPT', difficulty: 'beginner' },
      { id: 'M1-workflow-opportunities', title: 'Identify AI opportunities in workflow', difficulty: 'intermediate' },
      { id: 'M1-task-identification', title: 'Identify repetitive/structured tasks for AI', difficulty: 'intermediate' },
      { id: 'M1-task-evaluation', title: 'Evaluate task AI-suitability', difficulty: 'intermediate' },
      { id: 'M1-workflow-mapping', title: 'Create workflow maps for AI integration', difficulty: 'intermediate' },
      { id: 'M1-ethical-risks', title: 'Describe ethical risks of AI', difficulty: 'beginner' },
      { id: 'M1-hallucination-detection', title: 'Identify AI hallucinations', difficulty: 'intermediate' },
      { id: 'M1-safe-use-practices', title: 'Apply safe AI practices', difficulty: 'intermediate' },
    ],
  },
  // Module 2: Prompting Fundamentals (9 skills)
  {
    module: 'Prompting Fundamentals',
    topics: [
      { id: 'M2-prompt-components', title: 'Identify prompt components (Role, Task, Context, Format)', difficulty: 'beginner' },
      { id: 'M2-prompt-clarity', title: 'Explain clarity impact on AI output quality', difficulty: 'beginner' },
      { id: 'M2-prompt-mistakes', title: 'Recognize common prompt mistakes', difficulty: 'intermediate' },
      { id: 'M2-prompt-writing', title: 'Write structured prompts using RTCF framework', difficulty: 'intermediate' },
      { id: 'M2-tone-adjustment', title: 'Adjust tone and voice in prompts', difficulty: 'intermediate' },
      { id: 'M2-format-control', title: 'Control output format (lists, tables, JSON)', difficulty: 'intermediate' },
      { id: 'M2-prompt-rewriting', title: 'Rewrite prompts for better outcomes', difficulty: 'intermediate' },
      { id: 'M2-followup-prompts', title: 'Use follow-up prompts effectively', difficulty: 'intermediate' },
      { id: 'M2-prompt-debugging', title: 'Debug weak prompts systematically', difficulty: 'advanced' },
    ],
  },
  // Module 3: Advanced Prompting & Custom GPTs (9 skills)
  {
    module: 'Advanced Prompting & Custom GPTs',
    topics: [
      { id: 'M3-prompt-chaining', title: 'Define and use prompt chaining', difficulty: 'intermediate' },
      { id: 'M3-task-breakdown', title: 'Break complex tasks into prompt chains', difficulty: 'intermediate' },
      { id: 'M3-chain-testing', title: 'Test sequential prompt workflows', difficulty: 'intermediate' },
      { id: 'M3-gpt-task-selection', title: 'Identify tasks suitable for Custom GPTs', difficulty: 'intermediate' },
      { id: 'M3-gpt-instructions', title: 'Define GPT instructions and output format', difficulty: 'intermediate' },
      { id: 'M3-gpt-building', title: 'Configure Custom GPT builder', difficulty: 'intermediate' },
      { id: 'M3-gpt-evaluation', title: 'Evaluate and revise Custom GPTs', difficulty: 'advanced' },
      { id: 'M3-gpt-safety', title: 'Set GPT safe-use parameters', difficulty: 'intermediate' },
      { id: 'M3-gpt-sharing', title: 'Share GPTs with usage notes', difficulty: 'beginner' },
    ],
  },
  // Module 4: No-Code AI Agents (12 skills)
  {
    module: 'No-Code AI Agents',
    topics: [
      { id: 'M4-agent-purpose', title: 'Describe ChatGPT agent capabilities', difficulty: 'beginner' },
      { id: 'M4-agent-vs-gpt', title: 'Distinguish agents from Custom GPTs', difficulty: 'beginner' },
      { id: 'M4-agent-use-cases', title: 'Recognize agent automation use cases', difficulty: 'intermediate' },
      { id: 'M4-workflow-planning', title: 'Plan agent workflows', difficulty: 'intermediate' },
      { id: 'M4-io-mapping', title: 'Map agent inputs/outputs/tools', difficulty: 'intermediate' },
      { id: 'M4-agent-configuration', title: 'Configure ChatGPT agents', difficulty: 'intermediate' },
      { id: 'M4-agent-testing', title: 'Test and refine agents', difficulty: 'intermediate' },
      { id: 'M4-agent-documentation', title: 'Document agent limitations', difficulty: 'intermediate' },
      { id: 'M4-agent-deployment', title: 'Deploy agents responsibly', difficulty: 'advanced' },
      { id: 'M4-agent-monitoring', title: 'Monitor agent performance', difficulty: 'advanced' },
      { id: 'M4-agent-compliance', title: 'Ensure agent compliance/privacy', difficulty: 'advanced' },
      { id: 'M4-agent-iteration', title: 'Iterate on agent performance', difficulty: 'advanced' },
    ],
  },
];

// ============================================
// STUDENT PERSONA TEMPLATES
// ============================================

export const STUDENT_PERSONAS = [
  {
    id: 'beginner-professional',
    name: 'Alex',
    background: 'Office professional curious about using AI at work',
    level: 'beginner',
    goal: 'Learn to use ChatGPT effectively for daily tasks',
    struggles: ['Technical jargon', 'Writing good prompts', 'Knowing when AI is right'],
    strengths: ['Willing to learn', 'Has clear work tasks to automate'],
  },
  {
    id: 'beginner-manager',
    name: 'Jordan',
    background: 'Team manager wanting to introduce AI to their team',
    level: 'beginner',
    goal: 'Understand AI capabilities to guide team adoption',
    struggles: ['AI limitations', 'Security concerns', 'Measuring ROI'],
    strengths: ['Leadership experience', 'Process thinking'],
  },
  {
    id: 'intermediate-power-user',
    name: 'Sam',
    background: 'Knowledge worker already using ChatGPT but wants to level up',
    level: 'intermediate',
    goal: 'Build Custom GPTs and automate repetitive workflows',
    struggles: ['Prompt chaining', 'Building reliable GPTs', 'Complex formatting'],
    strengths: ['Basic prompting', 'Understands their workflows', 'Tech-savvy'],
  },
  {
    id: 'advanced-implementer',
    name: 'Taylor',
    background: 'Operations specialist building AI-powered workflows',
    level: 'advanced',
    goal: 'Create no-code AI agents for business automation',
    struggles: ['Agent architecture', 'Error handling', 'Compliance concerns'],
    strengths: ['Strong prompting skills', 'Automation mindset', 'Process documentation'],
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
    'Why is {concept} important for using AI at work?',
    'How does {concept} work in practice?',
  ],
  practical: [
    'How do I write a good prompt for {task}?',
    'What\'s the best way to {action}?',
    'I\'m trying to {goal}, how should I approach it?',
    'How can I make ChatGPT give me better {output}?',
    'Should I use {optionA} or {optionB} for {goal}?',
    'How do I get consistent results when {action}?',
  ],
  troubleshooting: [
    'ChatGPT keeps {problem}, what\'s wrong?',
    'I followed the steps but {result}. Why?',
    'My prompt isn\'t working - I asked for {task} but got {result}.',
    'The AI is hallucinating, how do I fix this?',
    'My Custom GPT isn\'t behaving as expected.',
    'The output quality is inconsistent.',
  ],
  strategic: [
    'When should I use AI vs do it myself?',
    'When should I use {strategy}?',
    'How do I know if AI is the right tool for {task}?',
    'How do I evaluate if {thing} is working?',
    'What should I consider before using AI for {goal}?',
    'Is it safe to use AI for {task}?',
  ],
};

// ============================================
// GENERATION PROMPTS
// ============================================

const SOCRATIC_GENERATION_PROMPT = `You are generating training data for a Socratic AI tutor named Sage who teaches professionals how to use AI effectively at work.

Your task is to generate a realistic tutoring conversation where Sage uses the Socratic method to teach about AI, prompting, Custom GPTs, and AI agents.

RULES FOR SAGE'S RESPONSES:
1. NEVER give direct answers - guide discovery through questions
2. Ask questions that connect to the student's work experience
3. Use practical workplace examples (emails, reports, documentation, analysis)
4. Build on what the student already knows about AI
5. Celebrate when they figure something out
6. If they're confused, break it down into smaller steps
7. End every response with a thought-provoking follow-up question
8. Connect concepts to real productivity gains at work

STUDENT PROFILE:
{studentProfile}

TOPIC: {topic}
DIFFICULTY: {difficulty}

Generate a conversation with 4-6 exchanges where:
- The student asks a question or expresses confusion about using AI at work
- Sage guides them through discovery using questions
- The student applies the concept to their work context
- Sage celebrates their "aha" moment and connects to next steps

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
  return `You are Sage, an expert AI tutor helping professionals master AI tools at work.

Your teaching principles:
1. NEVER give direct answers - use Socratic questioning to guide discovery
2. Ask what the student already knows and connect to their work experience
3. Use practical workplace examples (emails, reports, analysis, documentation)
4. Adapt to the student's level (currently: ${level})
5. Celebrate understanding and normalize confusion
6. Always connect concepts to real productivity gains

Current topic: ${topic}`;
}

function fillQuestionTemplate(template: string, topic: string): string {
  const replacements: Record<string, string[]> = {
    '{concept}': [topic, 'this concept', 'that technique'],
    '{conceptA}': ['prompt chaining', 'Custom GPTs', 'zero-shot prompting'],
    '{conceptB}': ['single prompts', 'regular ChatGPT', 'few-shot prompting'],
    '{thing}': ['my prompt', 'my Custom GPT', 'my agent', 'this workflow'],
    '{task}': ['writing emails', 'summarizing reports', 'data analysis', 'content creation'],
    '{action}': ['write better prompts', 'build a Custom GPT', 'chain prompts together'],
    '{goal}': ['automating reports', 'improving productivity', 'consistent outputs'],
    '{output}': ['responses', 'summaries', 'analyses', 'formatted outputs'],
    '{optionA}': ['a Custom GPT', 'prompt chaining', 'detailed instructions'],
    '{optionB}': ['regular prompts', 'single prompts', 'brief instructions'],
    '{strategy}': ['prompt chaining', 'few-shot examples', 'role-playing prompts'],
    '{problem}': ['giving generic answers', 'hallucinating facts', 'ignoring instructions'],
    '{result}': ["it's not following my format", "the output is inconsistent", "it ignores context"],
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
