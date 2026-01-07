# Sage Tutor Vertical AI Pipeline

Complete infrastructure for training, evaluating, and deploying a specialized AI tutor optimized for educational outcomes using the Socratic method.

## Overview

This pipeline transforms a general-purpose LLM (Llama 3.1 8B) into **Sage**, a vertical AI tutor that:
- Uses Socratic questioning instead of direct answers
- Adapts to student learning levels
- Optimizes for actual learning outcomes (not just engagement)
- Is 99.7% cheaper to run than GPT-4

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        TRAINING PIPELINE                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Data       │───▶│   Fine-tune  │───▶│    RLHF      │         │
│  │  Collection  │    │   (LoRA)     │    │   (PPO)      │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│         │                   │                   │                  │
│         ▼                   ▼                   ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  Synthetic   │    │   Reward     │    │   Outcome    │         │
│  │    Data      │    │   Model      │    │   Signals    │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                        SERVING PIPELINE                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Coach      │───▶│    Model     │───▶│    Modal     │         │
│  │    API       │    │   Router     │    │   (vLLM)     │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                             │                                       │
│                             ▼                                       │
│                      ┌──────────────┐                              │
│                      │   Fallback   │                              │
│                      │   (OpenAI)   │                              │
│                      └──────────────┘                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Generate Training Data

```typescript
import { generateFullSyntheticDataset } from '@/lib/training/syntheticDataGenerator';
import { toJSONL } from '@/lib/training';

// Generate 1000 Socratic tutoring conversations
const dataset = await generateFullSyntheticDataset(1000);

// Export to JSONL
const trainData = toJSONL(dataset.conversational);
await fs.writeFile('./data/train.jsonl', trainData);
```

### 2. Fine-tune on Modal

```bash
# Install Modal CLI
pip install modal

# Set up secrets
modal secret create huggingface-secret HF_TOKEN=<your-token>
modal secret create wandb-secret WANDB_API_KEY=<your-key>

# Upload training data
modal volume put sage-training-data ./data/train.jsonl /train.jsonl

# Run fine-tuning (standard preset, ~8-12 hours)
modal run modal_train.py --preset standard

# Download trained model
modal volume get sage-training-data /outputs ./outputs
```

### 3. Deploy for Inference

```bash
# Deploy serving endpoint
modal deploy modal_serve.py

# Set environment variable
export SAGE_MODEL_ENDPOINT=https://your-username--sage-tutor-serve-generate.modal.run
export USE_SAGE_MODEL=true
```

### 4. Enable in Coach API

```typescript
// The coach API automatically uses Sage when USE_SAGE_MODEL=true
// Falls back to Gemini/OpenAI if Sage is unavailable
```

## Module Reference

### Data Collection (`/training/schema.ts`, `/training/conversationLogger.ts`)

Types and functions for logging tutoring sessions:

```typescript
import {
  type TutoringSession,
  type ConversationTurn,
  createTutoringSession,
  addTurnToSession,
  completeSession,
} from '@/lib/training';
```

### Data Export (`/training/dataExporter.ts`)

Export sessions in various training formats:

```typescript
import {
  sessionToConversationalExample,
  sessionToInstructionExamples,
  generatePreferencePairs,
  toJSONL,
  toHuggingFaceFormat,
} from '@/lib/training';
```

### Synthetic Data (`/training/syntheticDataGenerator.ts`)

Generate curriculum-aligned training data:

```typescript
import {
  generateSocraticConversations,
  generatePreferencePairsData,
  generateInstructionData,
  generateFullSyntheticDataset,
} from '@/lib/training/syntheticDataGenerator';
```

### Evaluation (`/training/evaluation.ts`)

LLM-as-judge evaluation and A/B testing:

```typescript
import {
  evaluateTurnWithLLM,
  evaluateSession,
  assignVariant,
  analyzeABTest,
  generateEvalDataset,
} from '@/lib/training';
```

### Fine-tuning (`/training/finetune/`)

LoRA training scripts for Modal:

- `config.ts` - Training configurations and presets
- `train.py` - Local training script
- `modal_train.py` - Modal deployment
- `evaluate.py` - Model evaluation harness

### RLHF (`/training/rlhf/`)

Reinforcement learning from human feedback:

- `rewardModel.py` - Reward model training
- `ppo_trainer.py` - PPO training loop
- `learningOutcomeRewards.ts` - Outcome-based reward signals

```typescript
import {
  computeLearningOutcomeReward,
  computeMasteryProgressionReward,
  computeEngagementReward,
} from '@/lib/training/rlhf';
```

### Serving (`/training/serving/`)

Model serving and routing:

```typescript
import {
  ModelRouter,
  getModelRouter,
  type GenerateRequest,
  type GenerateResponse,
} from '@/lib/training/serving';

const router = getModelRouter();
const response = await router.generate({
  messages: [{ role: 'user', content: 'How do for loops work?' }],
});
```

## Training Configurations

### Presets

| Preset | LoRA Rank | Training Time | GPU | Cost |
|--------|-----------|---------------|-----|------|
| `efficient` | 8 | ~3-4 hours | A10G | $2-5 |
| `standard` | 16 | ~8-12 hours | A100-40GB | $15-25 |
| `production` | 32 | ~24-36 hours | A100-80GB | $50-100 |

### Recommended Workflow

1. **Experiment**: Use `efficient` preset for quick iterations
2. **Validate**: Use `standard` preset to confirm improvements
3. **Deploy**: Use `production` preset for final model

## Reward Signals

The RLHF pipeline uses multiple reward signals:

### 1. Learned Reward (Reward Model)
Trained on preference pairs of better/worse tutor responses.

### 2. Rule-Based Socratic Reward
Automatic checks for Socratic teaching indicators:
- Contains guiding questions
- Avoids direct answers
- Uses encouragement
- Breaks down problems

### 3. Learning Outcome Rewards
Real signals from the platform:
- Mastery progression (did the student improve?)
- FSRS retention (are they remembering?)
- Quiz score improvement
- Engagement quality (substantive responses)
- Effort indicators

## A/B Testing

Compare model versions with statistical significance:

```typescript
// In RouterConfig
abTest: {
  enabled: true,
  testId: 'sage-v2-test',
  variants: [
    { id: 'control', weight: 0.5, config: sageV1Config },
    { id: 'treatment', weight: 0.5, config: sageV2Config },
  ],
}

// Results tracked automatically
// Analyze with:
import { analyzeABTest } from '@/lib/training';
const results = analyzeABTest(testResults);
```

## Cost Comparison

| Model | Cost per 1K tokens | Monthly (1M tokens) |
|-------|-------------------|---------------------|
| Sage (Modal) | $0.0001 | $0.10 |
| GPT-3.5 | $0.002 | $2.00 |
| GPT-4 | $0.03 | $30.00 |

**Savings with Sage: 99.7% vs GPT-4**

## Environment Variables

```bash
# Model serving
SAGE_MODEL_ENDPOINT=https://your-username--sage-tutor-serve-generate.modal.run
USE_SAGE_MODEL=true
SAGE_AB_TEST=false

# Fallback
OPENAI_API_KEY=sk-...

# Training (for Modal)
HF_TOKEN=hf_...
WANDB_API_KEY=...
```

## Monitoring

### Health Checks

```typescript
const router = getModelRouter();
const health = await router.runHealthChecks();
console.log(health);
// [
//   { provider: 'sage', healthy: true, latencyMs: 150 },
//   { provider: 'openai-gpt4', healthy: true, latencyMs: 450 },
// ]
```

### Metrics to Track

1. **Response latency** - Sage should be <500ms
2. **Socratic compliance** - % of responses using questions
3. **Learning outcomes** - Score improvement, retention
4. **Fallback rate** - How often we fall back to OpenAI

## Troubleshooting

### Sage model not responding
1. Check Modal dashboard for deployment status
2. Verify `SAGE_MODEL_ENDPOINT` is correct
3. System will automatically fall back to OpenAI

### Training fails on Modal
1. Check VRAM requirements (A100-40GB for standard)
2. Verify HuggingFace token has access to Llama
3. Check data format in volume

### Low quality responses
1. Increase training epochs
2. Add more diverse synthetic data
3. Check reward model accuracy
4. Try higher LoRA rank

## Next Steps

1. **Collect real data**: The logging is in place, gather real conversations
2. **Label preferences**: Have experts rate response pairs
3. **Iterate on prompts**: Test different system prompts
4. **Scale training**: Move to production preset with more data
5. **Deploy A/B test**: Compare Sage vs baseline in production
