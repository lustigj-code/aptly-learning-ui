/**
 * Fine-tuning Configuration
 *
 * Configuration for LoRA fine-tuning of Llama models
 * for the Sage vertical AI tutor.
 */

// ============================================
// MODEL CONFIGURATIONS
// ============================================

export type BaseModel =
  | 'meta-llama/Llama-3.1-8B-Instruct'
  | 'meta-llama/Llama-3.2-3B-Instruct'
  | 'mistralai/Mistral-7B-Instruct-v0.3'
  | 'Qwen/Qwen2.5-7B-Instruct';

export type LoRAConfig = {
  // LoRA hyperparameters
  r: number;                      // Rank (typically 8, 16, 32, 64)
  loraAlpha: number;              // Scaling factor (typically 16, 32)
  loraDropout: number;            // Dropout probability (0.05-0.1)
  targetModules: string[];        // Which layers to apply LoRA to

  // Quantization
  use4bit: boolean;               // Use 4-bit quantization
  use8bit: boolean;               // Use 8-bit quantization
  bnbCompute: 'float16' | 'bfloat16';

  // Training
  batchSize: number;
  gradientAccumulationSteps: number;
  learningRate: number;
  maxSteps: number;
  warmupSteps: number;
  weightDecay: number;
  maxGradNorm: number;

  // Sequence length
  maxSeqLength: number;

  // Saving
  saveSteps: number;
  evalSteps: number;
  loggingSteps: number;
};

export type TrainingConfig = {
  // Model
  baseModel: BaseModel;
  loraConfig: LoRAConfig;

  // Data
  trainDataPath: string;
  evalDataPath?: string;
  dataFormat: 'instruction' | 'conversational' | 'preference';

  // Output
  outputDir: string;
  modelName: string;

  // Hardware
  gpuType: 'A100-40GB' | 'A100-80GB' | 'H100' | 'A10G' | 'T4';
  numGpus: number;

  // Experiment tracking
  wandbProject?: string;
  wandbRun?: string;
};

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const LORA_PRESETS = {
  // Efficient training for quick iterations
  efficient: {
    r: 8,
    loraAlpha: 16,
    loraDropout: 0.05,
    targetModules: ['q_proj', 'v_proj'],
    use4bit: true,
    use8bit: false,
    bnbCompute: 'float16' as const,
    batchSize: 4,
    gradientAccumulationSteps: 4,
    learningRate: 2e-4,
    maxSteps: 1000,
    warmupSteps: 100,
    weightDecay: 0.01,
    maxGradNorm: 1.0,
    maxSeqLength: 2048,
    saveSteps: 200,
    evalSteps: 100,
    loggingSteps: 10,
  },

  // Standard training for good quality
  standard: {
    r: 16,
    loraAlpha: 32,
    loraDropout: 0.05,
    targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj'],
    use4bit: true,
    use8bit: false,
    bnbCompute: 'bfloat16' as const,
    batchSize: 4,
    gradientAccumulationSteps: 8,
    learningRate: 1e-4,
    maxSteps: 3000,
    warmupSteps: 300,
    weightDecay: 0.01,
    maxGradNorm: 1.0,
    maxSeqLength: 4096,
    saveSteps: 500,
    evalSteps: 250,
    loggingSteps: 25,
  },

  // High quality training for production
  production: {
    r: 32,
    loraAlpha: 64,
    loraDropout: 0.1,
    targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
    use4bit: false,
    use8bit: true,
    bnbCompute: 'bfloat16' as const,
    batchSize: 2,
    gradientAccumulationSteps: 16,
    learningRate: 5e-5,
    maxSteps: 10000,
    warmupSteps: 1000,
    weightDecay: 0.01,
    maxGradNorm: 0.5,
    maxSeqLength: 4096,
    saveSteps: 1000,
    evalSteps: 500,
    loggingSteps: 50,
  },
};

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  baseModel: 'meta-llama/Llama-3.1-8B-Instruct',
  loraConfig: LORA_PRESETS.standard,
  trainDataPath: '/data/train.jsonl',
  evalDataPath: '/data/eval.jsonl',
  dataFormat: 'conversational',
  outputDir: '/outputs',
  modelName: 'sage-tutor-v1',
  gpuType: 'A100-40GB',
  numGpus: 1,
  wandbProject: 'sage-tutor',
};

// ============================================
// TRAINING DATA TEMPLATES
// ============================================

export const CHAT_TEMPLATE = `{% for message in messages %}
{% if message['role'] == 'system' %}
<|system|>
{{ message['content'] }}
{% elif message['role'] == 'user' %}
<|user|>
{{ message['content'] }}
{% elif message['role'] == 'assistant' %}
<|assistant|>
{{ message['content'] }}
{% endif %}
{% endfor %}
<|assistant|>
`;

export const INSTRUCTION_TEMPLATE = `### Instruction:
{{ instruction }}

### Input:
{{ input }}

### Response:
{{ output }}`;

// ============================================
// GPU COST ESTIMATES
// ============================================

export const GPU_COSTS = {
  'A100-40GB': { perHour: 1.10, vram: 40 },
  'A100-80GB': { perHour: 1.60, vram: 80 },
  'H100': { perHour: 2.50, vram: 80 },
  'A10G': { perHour: 0.50, vram: 24 },
  'T4': { perHour: 0.20, vram: 16 },
};

export function estimateTrainingCost(config: TrainingConfig): {
  estimatedHours: number;
  estimatedCost: number;
  recommendedGpu: TrainingConfig['gpuType'];
} {
  const stepsPerHour = config.loraConfig.use4bit ? 150 : 100;
  const estimatedHours = config.loraConfig.maxSteps / stepsPerHour;
  const gpuCost = GPU_COSTS[config.gpuType];
  const estimatedCost = estimatedHours * gpuCost.perHour * config.numGpus;

  // Recommend GPU based on model size and config
  let recommendedGpu: TrainingConfig['gpuType'] = 'A10G';
  if (config.baseModel.includes('8B') && !config.loraConfig.use4bit) {
    recommendedGpu = 'A100-40GB';
  } else if (config.loraConfig.maxSeqLength > 4096) {
    recommendedGpu = 'A100-80GB';
  }

  return {
    estimatedHours,
    estimatedCost,
    recommendedGpu,
  };
}

// ============================================
// VALIDATION
// ============================================

export function validateConfig(config: TrainingConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check LoRA config
  if (config.loraConfig.r < 4 || config.loraConfig.r > 256) {
    errors.push('LoRA rank must be between 4 and 256');
  }

  if (config.loraConfig.learningRate > 1e-3) {
    warnings.push('Learning rate > 1e-3 may cause instability');
  }

  if (config.loraConfig.batchSize * config.loraConfig.gradientAccumulationSteps < 16) {
    warnings.push('Effective batch size < 16 may result in unstable training');
  }

  // Check GPU requirements
  const vramNeeded = estimateVRAM(config);
  const vramAvailable = GPU_COSTS[config.gpuType].vram;

  if (vramNeeded > vramAvailable) {
    errors.push(`Estimated VRAM (${vramNeeded}GB) exceeds GPU capacity (${vramAvailable}GB)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function estimateVRAM(config: TrainingConfig): number {
  // Rough estimation based on model and config
  let baseVram = 0;

  if (config.baseModel.includes('8B')) baseVram = 16;
  else if (config.baseModel.includes('7B')) baseVram = 14;
  else if (config.baseModel.includes('3B')) baseVram = 6;

  // Quantization reduces VRAM
  if (config.loraConfig.use4bit) baseVram *= 0.25;
  else if (config.loraConfig.use8bit) baseVram *= 0.5;

  // Batch size increases VRAM
  baseVram += config.loraConfig.batchSize * 2;

  // Sequence length increases VRAM
  if (config.loraConfig.maxSeqLength > 2048) {
    baseVram += (config.loraConfig.maxSeqLength - 2048) / 1024 * 2;
  }

  return Math.ceil(baseVram);
}
