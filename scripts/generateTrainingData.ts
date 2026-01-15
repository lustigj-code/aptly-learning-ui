#!/usr/bin/env npx ts-node
/**
 * Training Data Generation Script
 *
 * Generates synthetic Socratic tutoring conversations for fine-tuning the Sage AI tutor.
 *
 * Usage:
 *   npx ts-node scripts/generateTrainingData.ts [options]
 *
 * Options:
 *   --conversations <n>  Number of conversational examples (default: 500)
 *   --preferences <n>    Number of preference pairs (default: 300)
 *   --instructions <n>   Number of instruction examples (default: 200)
 *   --output <dir>       Output directory (default: ./training-data)
 *   --dry-run            Show what would be generated without actually generating
 *
 * Environment:
 *   GOOGLE_AI_API_KEY    Required. Your Google AI API key for Gemini.
 *
 * Example:
 *   GOOGLE_AI_API_KEY=your-key npx ts-node scripts/generateTrainingData.ts --conversations 100
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// Import from training module
import {
  generateSocraticConversations,
  generatePreferencePairsData,
  generateInstructionData,
  formatForTraining,
  CURRICULUM_TOPICS,
  STUDENT_PERSONAS,
} from '../src/lib/training/syntheticDataGenerator';

// ============================================
// CONFIGURATION
// ============================================

interface Config {
  conversationCount: number;
  preferencePairCount: number;
  instructionCount: number;
  outputDir: string;
  dryRun: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    conversationCount: 500,
    preferencePairCount: 300,
    instructionCount: 200,
    outputDir: './training-data',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--conversations':
        config.conversationCount = parseInt(args[++i], 10);
        break;
      case '--preferences':
        config.preferencePairCount = parseInt(args[++i], 10);
        break;
      case '--instructions':
        config.instructionCount = parseInt(args[++i], 10);
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Training Data Generation Script for Sage AI Tutor

Usage:
  npx ts-node scripts/generateTrainingData.ts [options]

Options:
  --conversations <n>  Number of conversational examples (default: 500)
  --preferences <n>    Number of preference pairs (default: 300)
  --instructions <n>   Number of instruction examples (default: 200)
  --output <dir>       Output directory (default: ./training-data)
  --dry-run            Show what would be generated without actually generating
  --help               Show this help message

Environment Variables:
  GOOGLE_AI_API_KEY    Required. Your Google AI API key for Gemini.

Examples:
  # Generate full dataset
  GOOGLE_AI_API_KEY=your-key npx ts-node scripts/generateTrainingData.ts

  # Generate small test dataset
  GOOGLE_AI_API_KEY=your-key npx ts-node scripts/generateTrainingData.ts \\
    --conversations 50 --preferences 30 --instructions 20

  # Preview without generating
  npx ts-node scripts/generateTrainingData.ts --dry-run

Curriculum Topics (${CURRICULUM_TOPICS.reduce((sum, m) => sum + m.topics.length, 0)} total):
${CURRICULUM_TOPICS.map(m => `  - ${m.module}: ${m.topics.length} skills`).join('\n')}

Student Personas (${STUDENT_PERSONAS.length} total):
${STUDENT_PERSONAS.map(p => `  - ${p.name} (${p.level}): ${p.background}`).join('\n')}
`);
}

// ============================================
// PROGRESS TRACKING
// ============================================

function createProgressBar(label: string, total: number) {
  let current = 0;
  const barWidth = 30;

  return {
    update: (completed: number) => {
      current = completed;
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round((current / total) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      process.stdout.write(`\r${label}: [${bar}] ${percentage}% (${current}/${total})`);
    },
    complete: () => {
      process.stdout.write('\n');
    },
  };
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

async function main() {
  const config = parseArgs();

  console.log('\n🎓 Sage AI Tutor - Training Data Generator');
  console.log('==========================================\n');

  // Check for API key
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey && !config.dryRun) {
    console.error('❌ Error: GOOGLE_AI_API_KEY environment variable is required.');
    console.error('   Set it with: export GOOGLE_AI_API_KEY=your-key');
    process.exit(1);
  }

  // Show configuration
  console.log('📋 Configuration:');
  console.log(`   Conversations:    ${config.conversationCount}`);
  console.log(`   Preference Pairs: ${config.preferencePairCount}`);
  console.log(`   Instructions:     ${config.instructionCount}`);
  console.log(`   Output Directory: ${config.outputDir}`);
  console.log(`   Total Examples:   ${config.conversationCount + config.preferencePairCount + config.instructionCount}`);
  console.log('');

  if (config.dryRun) {
    console.log('🔍 Dry run mode - no data will be generated.\n');

    console.log('📚 Curriculum Coverage:');
    for (const module of CURRICULUM_TOPICS) {
      console.log(`   ${module.module}:`);
      for (const topic of module.topics) {
        console.log(`     - ${topic.title} (${topic.difficulty})`);
      }
    }
    console.log('');

    console.log('👤 Student Personas:');
    for (const persona of STUDENT_PERSONAS) {
      console.log(`   ${persona.name} (${persona.level}):`);
      console.log(`     Background: ${persona.background}`);
      console.log(`     Goal: ${persona.goal}`);
      console.log(`     Struggles: ${persona.struggles.join(', ')}`);
    }

    console.log('\n✅ Dry run complete. Run without --dry-run to generate data.');
    return;
  }

  // Initialize Gemini
  console.log('🔌 Initializing Google AI...');
  const genAI = new GoogleGenerativeAI(apiKey!);

  // Create output directory
  const outputDir = path.resolve(config.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  const startTime = Date.now();

  // Generate conversations
  console.log('\n📝 Generating Socratic conversations...');
  const convProgress = createProgressBar('Conversations', config.conversationCount);
  const conversations = await generateSocraticConversations(
    genAI,
    config.conversationCount,
    (completed, total) => convProgress.update(completed)
  );
  convProgress.complete();
  console.log(`   ✓ Generated ${conversations.length} conversations`);

  // Generate preference pairs
  console.log('\n⚖️ Generating preference pairs...');
  const prefProgress = createProgressBar('Preferences', config.preferencePairCount);
  const preferencePairs = await generatePreferencePairsData(
    genAI,
    config.preferencePairCount,
    (completed, total) => prefProgress.update(completed)
  );
  prefProgress.complete();
  console.log(`   ✓ Generated ${preferencePairs.length} preference pairs`);

  // Generate instruction examples
  console.log('\n📖 Generating instruction examples...');
  const instProgress = createProgressBar('Instructions', config.instructionCount);
  const instructions = await generateInstructionData(
    genAI,
    config.instructionCount,
    (completed, total) => instProgress.update(completed)
  );
  instProgress.complete();
  console.log(`   ✓ Generated ${instructions.length} instruction examples`);

  // Format and save data
  console.log('\n💾 Saving training data...');

  const formatted = formatForTraining({
    conversations,
    preferencePairs,
    instructions,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Save each format
  const files = [
    {
      name: `conversations_${timestamp}.jsonl`,
      content: formatted.conversationsJsonl,
      count: conversations.length,
    },
    {
      name: `preference_pairs_${timestamp}.jsonl`,
      content: formatted.preferencePairsJsonl,
      count: preferencePairs.length,
    },
    {
      name: `instructions_${timestamp}.jsonl`,
      content: formatted.instructionsJsonl,
      count: instructions.length,
    },
  ];

  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`   ✓ ${file.name} (${file.count} examples)`);
  }

  // Save combined training file for fine-tuning
  const combinedPath = path.join(outputDir, `train_${timestamp}.jsonl`);
  const combinedContent = [
    formatted.conversationsJsonl,
    formatted.instructionsJsonl,
  ].filter(Boolean).join('\n');
  fs.writeFileSync(combinedPath, combinedContent);
  console.log(`   ✓ train_${timestamp}.jsonl (combined for fine-tuning)`);

  // Save metadata
  const metadata = {
    generated_at: new Date().toISOString(),
    config,
    stats: {
      conversations: conversations.length,
      preferencePairs: preferencePairs.length,
      instructions: instructions.length,
      total: conversations.length + preferencePairs.length + instructions.length,
    },
    curriculum: {
      modules: CURRICULUM_TOPICS.length,
      totalSkills: CURRICULUM_TOPICS.reduce((sum, m) => sum + m.topics.length, 0),
    },
    duration_seconds: Math.round((Date.now() - startTime) / 1000),
  };

  const metadataPath = path.join(outputDir, `metadata_${timestamp}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`   ✓ metadata_${timestamp}.json`);

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n==========================================');
  console.log('✅ Training Data Generation Complete!');
  console.log('==========================================');
  console.log(`   Total examples: ${metadata.stats.total}`);
  console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`   Output: ${outputDir}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Review the generated data for quality');
  console.log('   2. Upload to Modal: modal volume put sage-training-data ./training-data/train_*.jsonl /train.jsonl');
  console.log('   3. Run fine-tuning: modal run src/lib/training/finetune/modal_train.py --preset efficient');
  console.log('');
}

// Run
main().catch((error) => {
  console.error('\n❌ Error during generation:', error);
  process.exit(1);
});
