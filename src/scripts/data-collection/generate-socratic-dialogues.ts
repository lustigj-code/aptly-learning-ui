/**
 * Socratic Dialogue Generator
 * Phase 1.2: Generate synthetic training data for fine-tuning
 *
 * Uses FREE Gemini API to generate 1000+ Socratic teaching dialogues
 * Cost: $0 (within Gemini free tier: 15 requests/minute)
 *
 * Usage: npx tsx src/scripts/data-collection/generate-socratic-dialogues.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { BlueprintConcept } from './scrape-meta-blueprint';

const OUTPUT_DIR = join(process.cwd(), 'data', 'training');
const CONCEPTS_FILE = join(process.cwd(), 'data', 'meta-blueprint', 'concepts.json');

type SocraticDialogue = {
  id: string;
  concept: string;
  scenario: 'discovery' | 'misconception' | 'application' | 'struggle';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  quality_score?: number;
};

// Socratic teaching principles for generation
const SOCRATIC_SYSTEM_PROMPT = `You are Sage, an expert Socratic tutor specializing in social media marketing education.

CORE PRINCIPLES:
1. NEVER give direct answers - guide discovery through questions
2. Ask leading questions that help students reason their way to understanding
3. Reference real-world examples from actual campaigns
4. Build on student's existing knowledge
5. Normalize struggle - learning is a process
6. Celebrate insights when student discovers the answer themselves

STYLE:
- Conversational and encouraging
- Patient and non-judgmental
- Connects concepts to practical application
- Uses analogies and real examples
- Ends most responses with a question

AVOID:
- Giving the answer directly
- Being condescending
- Using jargon without explanation
- Long lectures - keep responses concise (2-4 sentences + question)`;

/**
 * Generate Socratic dialogues from concepts
 */
export async function generateSocraticDialogues(targetCount: number = 1000) {
  console.log('🎓 Generating Socratic Dialogues...');
  console.log(`🎯 Target: ${targetCount} dialogues`);
  console.log('💰 Cost: $0 (FREE Gemini API)');
  console.log('');

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    throw new Error('GOOGLE_GENAI_API_KEY required. Get free key at https://makersuite.google.com/app/apikey');
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // FREE tier

  // Load concepts
  const concepts: BlueprintConcept[] = JSON.parse(readFileSync(CONCEPTS_FILE, 'utf-8'));

  if (concepts.length === 0) {
    throw new Error('No concepts found. Run scrape-meta-blueprint.ts first.');
  }

  console.log(`📚 Loaded ${concepts.length} concepts from Meta Blueprint`);
  console.log('');

  // Ensure output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const dialogues: SocraticDialogue[] = [];
  const scenarios: SocraticDialogue['scenario'][] = ['discovery', 'misconception', 'application', 'struggle'];

  // Generate dialogues
  let generatedCount = 0;

  for (const concept of concepts) {
    // Generate 2-4 dialogues per concept (different scenarios)
    const dialoguesPerConcept = Math.min(4, Math.ceil(targetCount / concepts.length));

    for (let i = 0; i < dialoguesPerConcept && generatedCount < targetCount; i++) {
      const scenario = scenarios[i % scenarios.length];

      try {
        const dialogue = await generateDialogue(model, concept, scenario);

        if (dialogue) {
          dialogues.push(dialogue);
          generatedCount++;

          console.log(`✅ [${generatedCount}/${targetCount}] Generated ${scenario} dialogue for: ${concept.title}`);

          // Save incrementally (in case of interruption)
          if (generatedCount % 50 === 0) {
            saveDialogues(dialogues, 'partial');
          }
        }

        // Rate limiting: FREE tier is 15 requests/minute
        // Wait 4 seconds between requests = ~15/min
        await new Promise((resolve) => setTimeout(resolve, 4000));
      } catch (error) {
        console.error(`  ❌ Failed to generate for ${concept.title}: ${error}`);
      }
    }
  }

  // Final save
  saveDialogues(dialogues, 'final');

  // Create train/val/test splits
  createDataSplits(dialogues);

  console.log('');
  console.log('🎉 Generation complete!');
  console.log(`📊 Total dialogues: ${dialogues.length}`);
  console.log(`💾 Saved to: ${OUTPUT_DIR}`);

  return dialogues;
}

/**
 * Generate a single Socratic dialogue
 */
async function generateDialogue(
  model: any,
  concept: BlueprintConcept,
  scenario: SocraticDialogue['scenario']
): Promise<SocraticDialogue | null> {
  const scenarioPrompts = {
    discovery: `Generate a Socratic dialogue where a student is learning about "${concept.title}" for the first time. The tutor guides them to discover the concept through questions, never giving the answer directly. Include 4-6 exchanges.`,

    misconception: `Generate a Socratic dialogue where a student has a common misconception about "${concept.title}". The tutor gently corrects them through leading questions that reveal the flaw in their thinking. Include 4-6 exchanges.`,

    application: `Generate a Socratic dialogue where a student understands "${concept.title}" theoretically but struggles to apply it to a real campaign. The tutor guides them through a practical scenario using questions. Include 4-6 exchanges.`,

    struggle: `Generate a Socratic dialogue where a student is stuck on "${concept.title}" after multiple attempts. The tutor breaks it down differently, using analogies and simpler questions, until they have an "aha moment." Include 4-6 exchanges.`,
  };

  const prompt = `${SOCRATIC_SYSTEM_PROMPT}

${scenarioPrompts[scenario]}

Context: ${concept.content.substring(0, 1000)}

Format as JSON:
{
  "messages": [
    {"role": "system", "content": "You are Sage, a Socratic tutor..."},
    {"role": "user", "content": "Student's question or statement"},
    {"role": "assistant", "content": "Sage's Socratic response (must end with a question)"},
    ...
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const dialogue: SocraticDialogue = {
      id: `${concept.id}-${scenario}-${Date.now()}`,
      concept: concept.title,
      scenario,
      messages: parsed.messages,
    };

    return dialogue;
  } catch (error) {
    console.error(`Generation error: ${error}`);
    return null;
  }
}

/**
 * Save dialogues to file
 */
function saveDialogues(dialogues: SocraticDialogue[], suffix: string) {
  const path = join(OUTPUT_DIR, `socratic-dialogues-${suffix}.json`);
  writeFileSync(path, JSON.stringify(dialogues, null, 2));

  // Also save as JSONL for training
  const jsonlPath = join(OUTPUT_DIR, `socratic-dialogues-${suffix}.jsonl`);
  const jsonlContent = dialogues.map((d) => JSON.stringify(d)).join('\n');
  writeFileSync(jsonlPath, jsonlContent);
}

/**
 * Create train/validation/test splits (80/10/10)
 */
function createDataSplits(dialogues: SocraticDialogue[]) {
  // Shuffle
  const shuffled = [...dialogues].sort(() => Math.random() - 0.5);

  const trainSize = Math.floor(shuffled.length * 0.8);
  const valSize = Math.floor(shuffled.length * 0.1);

  const train = shuffled.slice(0, trainSize);
  const val = shuffled.slice(trainSize, trainSize + valSize);
  const test = shuffled.slice(trainSize + valSize);

  writeFileSync(join(OUTPUT_DIR, 'train.jsonl'), train.map((d) => JSON.stringify(d)).join('\n'));
  writeFileSync(join(OUTPUT_DIR, 'val.jsonl'), val.map((d) => JSON.stringify(d)).join('\n'));
  writeFileSync(join(OUTPUT_DIR, 'test.jsonl'), test.map((d) => JSON.stringify(d)).join('\n'));

  console.log('');
  console.log('📊 Data splits:');
  console.log(`  Train: ${train.length} (80%)`);
  console.log(`  Val: ${val.length} (10%)`);
  console.log(`  Test: ${test.length} (10%)`);
}

// CLI execution
if (require.main === module) {
  const targetCount = parseInt(process.argv[2] || '1000');

  generateSocraticDialogues(targetCount)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Failed:', error);
      process.exit(1);
    });
}
