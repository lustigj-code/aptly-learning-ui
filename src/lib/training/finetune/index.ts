/**
 * Fine-tuning Module Exports
 *
 * This module provides TypeScript configuration and types for fine-tuning.
 * The actual training runs in Python (train.py, modal_train.py).
 */

export {
  type BaseModel,
  type LoRAConfig,
  type TrainingConfig,
  LORA_PRESETS,
  DEFAULT_TRAINING_CONFIG,
  CHAT_TEMPLATE,
  INSTRUCTION_TEMPLATE,
  GPU_COSTS,
  estimateTrainingCost,
  validateConfig,
} from './config';

/**
 * Fine-tuning Pipeline Overview
 *
 * The fine-tuning pipeline consists of:
 *
 * 1. Data Preparation (TypeScript)
 *    - Generate synthetic data with syntheticDataGenerator.ts
 *    - Export training data with dataExporter.ts
 *    - Output: train.jsonl, eval.jsonl
 *
 * 2. Training (Python on Modal)
 *    - modal_train.py: Deploy and run on cloud GPUs
 *    - train.py: Local training script
 *    - Uses LoRA for efficient fine-tuning
 *    - Supports Llama 3.1 8B, Mistral 7B, Qwen 2.5 7B
 *
 * 3. Evaluation (Python)
 *    - evaluate.py: Comprehensive model evaluation
 *    - LLM-as-judge for Socratic quality
 *    - Automated checks for teaching indicators
 *
 * Quick Start:
 *
 * 1. Generate training data:
 *    ```typescript
 *    import { generateFullSyntheticDataset } from './syntheticDataGenerator';
 *    const data = await generateFullSyntheticDataset(1000);
 *    ```
 *
 * 2. Export to JSONL:
 *    ```typescript
 *    import { toJSONL } from './dataExporter';
 *    const jsonl = toJSONL(data.conversational);
 *    ```
 *
 * 3. Upload to Modal and train:
 *    ```bash
 *    modal volume put sage-training-data ./train.jsonl /train.jsonl
 *    modal run modal_train.py --preset standard
 *    ```
 *
 * 4. Evaluate the model:
 *    ```bash
 *    modal volume get sage-training-data /outputs ./outputs
 *    python evaluate.py --model ./outputs/merged
 *    ```
 */

// Training presets with descriptions
export const TRAINING_PRESET_DESCRIPTIONS = {
  efficient: {
    name: 'Efficient',
    description: 'Quick iterations for testing. ~3-4 hours on A10G.',
    recommended_for: 'Development and experimentation',
    estimated_cost: '$2-5',
  },
  standard: {
    name: 'Standard',
    description: 'Balanced quality and speed. ~8-12 hours on A100-40GB.',
    recommended_for: 'Initial production model',
    estimated_cost: '$15-25',
  },
  production: {
    name: 'Production',
    description: 'Maximum quality. ~24-36 hours on A100-80GB.',
    recommended_for: 'Final production deployment',
    estimated_cost: '$50-100',
  },
} as const;

// Model recommendations
export const MODEL_RECOMMENDATIONS = {
  'meta-llama/Llama-3.1-8B-Instruct': {
    name: 'Llama 3.1 8B',
    recommended: true,
    pros: ['Best instruction following', 'Strong reasoning', 'Good chat format'],
    cons: ['Requires HF access approval'],
    vram: '16GB (4-bit), 32GB (8-bit)',
  },
  'meta-llama/Llama-3.2-3B-Instruct': {
    name: 'Llama 3.2 3B',
    recommended: false,
    pros: ['Fast inference', 'Low VRAM', 'Cheap to run'],
    cons: ['Lower quality', 'Less nuanced responses'],
    vram: '6GB (4-bit), 12GB (8-bit)',
  },
  'mistralai/Mistral-7B-Instruct-v0.3': {
    name: 'Mistral 7B',
    recommended: false,
    pros: ['No approval needed', 'Good quality'],
    cons: ['Different chat format', 'Slightly worse instruction following'],
    vram: '14GB (4-bit), 28GB (8-bit)',
  },
  'Qwen/Qwen2.5-7B-Instruct': {
    name: 'Qwen 2.5 7B',
    recommended: false,
    pros: ['No approval needed', 'Strong multilingual'],
    cons: ['Less tested for education'],
    vram: '14GB (4-bit), 28GB (8-bit)',
  },
} as const;
