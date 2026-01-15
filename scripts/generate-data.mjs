#!/usr/bin/env node
/**
 * Standalone Training Data Generator
 *
 * Usage: GOOGLE_AI_API_KEY=your-key node scripts/generate-data.mjs [count]
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// AI AT WORK CURRICULUM
// ============================================

const CURRICULUM_TOPICS = [
  {
    module: 'Foundations',
    topics: [
      { id: 'M1-genai-definition', title: 'Describe what generative AI is', difficulty: 'beginner' },
      { id: 'M1-llm-explanation', title: 'Explain how LLMs like ChatGPT work', difficulty: 'beginner' },
      { id: 'M1-chatgpt-strengths', title: 'Identify strengths of ChatGPT', difficulty: 'beginner' },
      { id: 'M1-chatgpt-limitations', title: 'Identify limitations of ChatGPT', difficulty: 'beginner' },
      { id: 'M1-workflow-opportunities', title: 'Identify AI opportunities in workflow', difficulty: 'intermediate' },
      { id: 'M1-hallucination-detection', title: 'Identify AI hallucinations', difficulty: 'intermediate' },
      { id: 'M1-safe-use-practices', title: 'Apply safe AI practices', difficulty: 'intermediate' },
    ],
  },
  {
    module: 'Prompting Fundamentals',
    topics: [
      { id: 'M2-prompt-components', title: 'Identify prompt components (Role, Task, Context, Format)', difficulty: 'beginner' },
      { id: 'M2-prompt-clarity', title: 'Explain clarity impact on AI output quality', difficulty: 'beginner' },
      { id: 'M2-prompt-writing', title: 'Write structured prompts using RTCF framework', difficulty: 'intermediate' },
      { id: 'M2-tone-adjustment', title: 'Adjust tone and voice in prompts', difficulty: 'intermediate' },
      { id: 'M2-format-control', title: 'Control output format (lists, tables, JSON)', difficulty: 'intermediate' },
      { id: 'M2-prompt-debugging', title: 'Debug weak prompts systematically', difficulty: 'advanced' },
    ],
  },
  {
    module: 'Advanced Prompting & Custom GPTs',
    topics: [
      { id: 'M3-prompt-chaining', title: 'Define and use prompt chaining', difficulty: 'intermediate' },
      { id: 'M3-task-breakdown', title: 'Break complex tasks into prompt chains', difficulty: 'intermediate' },
      { id: 'M3-gpt-task-selection', title: 'Identify tasks suitable for Custom GPTs', difficulty: 'intermediate' },
      { id: 'M3-gpt-building', title: 'Configure Custom GPT builder', difficulty: 'intermediate' },
      { id: 'M3-gpt-evaluation', title: 'Evaluate and revise Custom GPTs', difficulty: 'advanced' },
    ],
  },
  {
    module: 'No-Code AI Agents',
    topics: [
      { id: 'M4-agent-purpose', title: 'Describe ChatGPT agent capabilities', difficulty: 'beginner' },
      { id: 'M4-agent-vs-gpt', title: 'Distinguish agents from Custom GPTs', difficulty: 'beginner' },
      { id: 'M4-agent-use-cases', title: 'Recognize agent automation use cases', difficulty: 'intermediate' },
      { id: 'M4-workflow-planning', title: 'Plan agent workflows', difficulty: 'intermediate' },
      { id: 'M4-agent-configuration', title: 'Configure ChatGPT agents', difficulty: 'intermediate' },
      { id: 'M4-agent-deployment', title: 'Deploy agents responsibly', difficulty: 'advanced' },
    ],
  },
];

const STUDENT_PERSONAS = [
  {
    id: 'beginner-professional',
    name: 'Alex',
    background: 'Office professional curious about using AI at work',
    level: 'beginner',
    goal: 'Learn to use ChatGPT effectively for daily tasks',
    struggles: ['Technical jargon', 'Writing good prompts'],
  },
  {
    id: 'beginner-manager',
    name: 'Jordan',
    background: 'Team manager wanting to introduce AI to their team',
    level: 'beginner',
    goal: 'Understand AI capabilities to guide team adoption',
    struggles: ['AI limitations', 'Security concerns'],
  },
  {
    id: 'intermediate-power-user',
    name: 'Sam',
    background: 'Knowledge worker already using ChatGPT but wants to level up',
    level: 'intermediate',
    goal: 'Build Custom GPTs and automate repetitive workflows',
    struggles: ['Prompt chaining', 'Building reliable GPTs'],
  },
  {
    id: 'advanced-implementer',
    name: 'Taylor',
    background: 'Operations specialist building AI-powered workflows',
    level: 'advanced',
    goal: 'Create no-code AI agents for business automation',
    struggles: ['Agent architecture', 'Error handling'],
  },
];

// ============================================
// GENERATION PROMPT
// ============================================

const GENERATION_PROMPT = `You are generating training data for a Socratic AI tutor named Sage who teaches professionals how to use AI effectively at work.

Generate a realistic tutoring conversation where Sage uses the Socratic method.

RULES FOR SAGE:
1. NEVER give direct answers - guide discovery through questions
2. Ask questions that connect to the student's work experience
3. Use practical workplace examples (emails, reports, documentation)
4. Build on what the student already knows
5. Celebrate when they figure something out
6. End every response with a follow-up question

STUDENT: {persona}
TOPIC: {topic}
DIFFICULTY: {difficulty}

Generate a 4-6 turn conversation. Output ONLY valid JSON:
{
  "messages": [
    {"role": "system", "content": "You are Sage, a Socratic AI tutor helping professionals master AI tools at work."},
    {"role": "user", "content": "student question"},
    {"role": "assistant", "content": "Sage response with guiding questions"},
    {"role": "user", "content": "student follow-up"},
    {"role": "assistant", "content": "Sage continues guiding"}
  ]
}`;

// ============================================
// MAIN
// ============================================

async function main() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY environment variable required');
    process.exit(1);
  }

  const count = parseInt(process.argv[2]) || 50;
  console.log(`\n🎓 Sage AI Tutor - Training Data Generator`);
  console.log(`==========================================`);
  console.log(`Generating ${count} examples...\n`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const conversations = [];
  let generated = 0;
  let errors = 0;

  // Flatten topics
  const allTopics = CURRICULUM_TOPICS.flatMap(m => m.topics);

  for (let i = 0; i < count; i++) {
    const topic = allTopics[i % allTopics.length];
    const persona = STUDENT_PERSONAS[i % STUDENT_PERSONAS.length];

    // Skip mismatched difficulties
    if (topic.difficulty === 'advanced' && persona.level === 'beginner') continue;

    const prompt = GENERATION_PROMPT
      .replace('{persona}', `${persona.name} - ${persona.background}. Struggles with: ${persona.struggles.join(', ')}`)
      .replace('{topic}', topic.title)
      .replace('{difficulty}', topic.difficulty);

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
      });

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.messages && data.messages.length >= 3) {
          conversations.push(data);
          generated++;
          process.stdout.write(`\r✓ Generated: ${generated}/${count} (errors: ${errors})`);
        }
      }
    } catch (err) {
      errors++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n✅ Generated ${generated} conversations (${errors} errors)`);

  // Save
  const outputDir = './training-data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `train_${timestamp}.jsonl`;
  const filepath = path.join(outputDir, filename);

  const jsonl = conversations.map(c => JSON.stringify(c)).join('\n');
  fs.writeFileSync(filepath, jsonl);

  console.log(`💾 Saved to: ${filepath}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Review the data: head -5 ${filepath}`);
  console.log(`   2. Upload to Modal: modal volume put sage-training-data ${filepath} /train.jsonl`);
  console.log(`   3. Run training: modal run src/lib/training/finetune/modal_train.py --preset efficient`);
}

main().catch(console.error);
