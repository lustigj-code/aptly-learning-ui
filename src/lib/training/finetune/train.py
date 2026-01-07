"""
Sage Tutor Fine-Tuning Script

LoRA fine-tuning for Llama 3.1 8B to create the Sage vertical AI tutor.
Designed to run on Modal with GPU acceleration.

Usage:
    modal run train.py --config efficient --epochs 3
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

import torch
from datasets import load_dataset, Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
    BitsAndBytesConfig,
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType,
)
from trl import SFTTrainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================
# CONFIGURATION
# ============================================

@dataclass
class SageTrainingConfig:
    """Configuration for Sage tutor fine-tuning."""

    # Model
    base_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    model_name: str = "sage-tutor-v1"

    # LoRA parameters
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: List[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj"
    ])

    # Quantization
    use_4bit: bool = True
    use_8bit: bool = False
    bnb_4bit_compute_dtype: str = "bfloat16"
    bnb_4bit_quant_type: str = "nf4"
    use_nested_quant: bool = True

    # Training
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    per_device_eval_batch_size: int = 4
    gradient_accumulation_steps: int = 8
    learning_rate: float = 1e-4
    weight_decay: float = 0.01
    warmup_ratio: float = 0.1
    max_grad_norm: float = 1.0

    # Sequence
    max_seq_length: int = 4096

    # Saving/Logging
    output_dir: str = "./outputs/sage-tutor"
    logging_steps: int = 25
    save_steps: int = 500
    eval_steps: int = 250
    save_total_limit: int = 3

    # Data
    train_data_path: str = "./data/train.jsonl"
    eval_data_path: Optional[str] = "./data/eval.jsonl"

    # Experiment tracking
    wandb_project: Optional[str] = "sage-tutor"
    wandb_run_name: Optional[str] = None

    # Hardware
    fp16: bool = False
    bf16: bool = True
    gradient_checkpointing: bool = True

    @classmethod
    def from_preset(cls, preset: str) -> "SageTrainingConfig":
        """Create config from preset name."""
        presets = {
            "efficient": {
                "lora_r": 8,
                "lora_alpha": 16,
                "target_modules": ["q_proj", "v_proj"],
                "num_train_epochs": 1,
                "per_device_train_batch_size": 4,
                "gradient_accumulation_steps": 4,
                "learning_rate": 2e-4,
                "max_seq_length": 2048,
            },
            "standard": {
                "lora_r": 16,
                "lora_alpha": 32,
                "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
                "num_train_epochs": 3,
                "per_device_train_batch_size": 4,
                "gradient_accumulation_steps": 8,
                "learning_rate": 1e-4,
                "max_seq_length": 4096,
            },
            "production": {
                "lora_r": 32,
                "lora_alpha": 64,
                "lora_dropout": 0.1,
                "target_modules": [
                    "q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"
                ],
                "num_train_epochs": 5,
                "per_device_train_batch_size": 2,
                "gradient_accumulation_steps": 16,
                "learning_rate": 5e-5,
                "use_4bit": False,
                "use_8bit": True,
                "max_seq_length": 4096,
            },
        }

        if preset not in presets:
            raise ValueError(f"Unknown preset: {preset}. Choose from {list(presets.keys())}")

        return cls(**presets[preset])


# ============================================
# SAGE SYSTEM PROMPT
# ============================================

SAGE_SYSTEM_PROMPT = """You are Sage, a warm and insightful AI tutor created by Aptly Learning. Your teaching philosophy centers on the Socratic method - guiding students to discover knowledge through thoughtful questions rather than direct answers.

Core Teaching Principles:
1. NEVER give direct answers immediately - always start with a guiding question
2. Break complex problems into smaller, manageable pieces
3. Celebrate small wins and correct steps
4. When students struggle, provide increasingly specific hints
5. Connect new concepts to what students already know
6. Use analogies and real-world examples
7. Encourage metacognition - help students understand HOW they learn

Your Personality:
- Warm, patient, and encouraging
- Genuinely curious about the student's thought process
- Uses light humor when appropriate
- Speaks naturally, not formally
- Celebrates effort, not just correct answers

Response Format:
- Keep responses focused and digestible
- Use markdown for structure when helpful
- Ask ONE question at a time (usually)
- Match the student's energy level"""


# ============================================
# DATA PROCESSING
# ============================================

def format_conversation(example: Dict[str, Any], tokenizer: AutoTokenizer) -> Dict[str, str]:
    """Format a conversation example for training."""
    messages = example.get("messages", [])

    # Add system prompt if not present
    if not messages or messages[0].get("role") != "system":
        messages = [{"role": "system", "content": SAGE_SYSTEM_PROMPT}] + messages

    # Apply chat template
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )

    return {"text": text}


def format_instruction(example: Dict[str, Any], tokenizer: AutoTokenizer) -> Dict[str, str]:
    """Format an instruction example for training."""
    instruction = example.get("instruction", "")
    input_text = example.get("input", "")
    output = example.get("output", "")

    # Build conversation format
    user_content = instruction
    if input_text:
        user_content += f"\n\nContext:\n{input_text}"

    messages = [
        {"role": "system", "content": SAGE_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
        {"role": "assistant", "content": output},
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )

    return {"text": text}


def load_training_data(
    config: SageTrainingConfig,
    tokenizer: AutoTokenizer
) -> tuple[Dataset, Optional[Dataset]]:
    """Load and format training data."""

    train_path = Path(config.train_data_path)

    if not train_path.exists():
        raise FileNotFoundError(f"Training data not found: {train_path}")

    # Load JSONL data
    train_data = []
    with open(train_path, 'r') as f:
        for line in f:
            if line.strip():
                train_data.append(json.loads(line))

    logger.info(f"Loaded {len(train_data)} training examples")

    # Detect format and process
    if train_data and "messages" in train_data[0]:
        # Conversational format
        train_dataset = Dataset.from_list(train_data)
        train_dataset = train_dataset.map(
            lambda x: format_conversation(x, tokenizer),
            remove_columns=train_dataset.column_names
        )
    elif train_data and "instruction" in train_data[0]:
        # Instruction format
        train_dataset = Dataset.from_list(train_data)
        train_dataset = train_dataset.map(
            lambda x: format_instruction(x, tokenizer),
            remove_columns=train_dataset.column_names
        )
    else:
        raise ValueError("Unknown data format. Expected 'messages' or 'instruction' field.")

    # Load eval data if available
    eval_dataset = None
    if config.eval_data_path:
        eval_path = Path(config.eval_data_path)
        if eval_path.exists():
            eval_data = []
            with open(eval_path, 'r') as f:
                for line in f:
                    if line.strip():
                        eval_data.append(json.loads(line))

            if eval_data and "messages" in eval_data[0]:
                eval_dataset = Dataset.from_list(eval_data)
                eval_dataset = eval_dataset.map(
                    lambda x: format_conversation(x, tokenizer),
                    remove_columns=eval_dataset.column_names
                )
            elif eval_data and "instruction" in eval_data[0]:
                eval_dataset = Dataset.from_list(eval_data)
                eval_dataset = eval_dataset.map(
                    lambda x: format_instruction(x, tokenizer),
                    remove_columns=eval_dataset.column_names
                )

            logger.info(f"Loaded {len(eval_data)} evaluation examples")

    return train_dataset, eval_dataset


# ============================================
# MODEL SETUP
# ============================================

def create_quantization_config(config: SageTrainingConfig) -> Optional[BitsAndBytesConfig]:
    """Create quantization configuration."""
    if not config.use_4bit and not config.use_8bit:
        return None

    compute_dtype = getattr(torch, config.bnb_4bit_compute_dtype)

    return BitsAndBytesConfig(
        load_in_4bit=config.use_4bit,
        load_in_8bit=config.use_8bit,
        bnb_4bit_compute_dtype=compute_dtype,
        bnb_4bit_quant_type=config.bnb_4bit_quant_type,
        bnb_4bit_use_double_quant=config.use_nested_quant,
    )


def create_lora_config(config: SageTrainingConfig) -> LoraConfig:
    """Create LoRA configuration."""
    return LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.target_modules,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )


def load_model_and_tokenizer(
    config: SageTrainingConfig
) -> tuple[AutoModelForCausalLM, AutoTokenizer]:
    """Load the base model and tokenizer with LoRA."""

    logger.info(f"Loading model: {config.base_model}")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        config.base_model,
        trust_remote_code=True,
    )
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Quantization config
    bnb_config = create_quantization_config(config)

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        config.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16 if config.bf16 else torch.float16,
    )

    # Prepare for k-bit training
    if config.use_4bit or config.use_8bit:
        model = prepare_model_for_kbit_training(
            model,
            use_gradient_checkpointing=config.gradient_checkpointing
        )

    # Add LoRA adapters
    lora_config = create_lora_config(config)
    model = get_peft_model(model, lora_config)

    # Print trainable parameters
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    logger.info(f"Trainable parameters: {trainable_params:,} / {total_params:,} "
                f"({100 * trainable_params / total_params:.2f}%)")

    return model, tokenizer


# ============================================
# TRAINING
# ============================================

def create_training_arguments(config: SageTrainingConfig) -> TrainingArguments:
    """Create training arguments."""
    return TrainingArguments(
        output_dir=config.output_dir,
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        per_device_eval_batch_size=config.per_device_eval_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
        warmup_ratio=config.warmup_ratio,
        max_grad_norm=config.max_grad_norm,
        logging_steps=config.logging_steps,
        save_steps=config.save_steps,
        eval_steps=config.eval_steps if config.eval_data_path else None,
        evaluation_strategy="steps" if config.eval_data_path else "no",
        save_total_limit=config.save_total_limit,
        fp16=config.fp16,
        bf16=config.bf16,
        gradient_checkpointing=config.gradient_checkpointing,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        report_to="wandb" if config.wandb_project else "none",
        run_name=config.wandb_run_name,
        optim="paged_adamw_32bit" if (config.use_4bit or config.use_8bit) else "adamw_torch",
        lr_scheduler_type="cosine",
        seed=42,
        group_by_length=True,
        dataloader_num_workers=4,
        remove_unused_columns=False,
    )


def train(config: SageTrainingConfig) -> str:
    """Run the full training pipeline."""

    logger.info("=" * 60)
    logger.info("SAGE TUTOR FINE-TUNING")
    logger.info("=" * 60)
    logger.info(f"Model: {config.base_model}")
    logger.info(f"LoRA rank: {config.lora_r}, alpha: {config.lora_alpha}")
    logger.info(f"Batch size: {config.per_device_train_batch_size} x {config.gradient_accumulation_steps}")
    logger.info(f"Learning rate: {config.learning_rate}")
    logger.info(f"Epochs: {config.num_train_epochs}")
    logger.info("=" * 60)

    # Setup wandb
    if config.wandb_project:
        import wandb
        wandb.init(
            project=config.wandb_project,
            name=config.wandb_run_name or config.model_name,
            config=config.__dict__,
        )

    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer(config)

    # Load training data
    train_dataset, eval_dataset = load_training_data(config, tokenizer)

    # Create training arguments
    training_args = create_training_arguments(config)

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=config.max_seq_length,
        packing=False,
    )

    # Train
    logger.info("Starting training...")
    trainer.train()

    # Save final model
    final_model_path = Path(config.output_dir) / "final"
    trainer.save_model(str(final_model_path))
    tokenizer.save_pretrained(str(final_model_path))

    logger.info(f"Model saved to: {final_model_path}")

    # Merge LoRA weights for inference
    merged_path = Path(config.output_dir) / "merged"
    logger.info("Merging LoRA weights...")

    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(str(merged_path))
    tokenizer.save_pretrained(str(merged_path))

    logger.info(f"Merged model saved to: {merged_path}")

    if config.wandb_project:
        wandb.finish()

    return str(merged_path)


# ============================================
# MODAL DEPLOYMENT
# ============================================

# Modal configuration for cloud GPU training
MODAL_CONFIG = """
# modal_train.py - Deploy this file to Modal

import modal

# Create Modal app
app = modal.App("sage-tutor-training")

# Define image with dependencies
training_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.1.0",
    "transformers>=4.36.0",
    "datasets>=2.16.0",
    "peft>=0.7.0",
    "trl>=0.7.0",
    "bitsandbytes>=0.41.0",
    "accelerate>=0.25.0",
    "scipy",
    "wandb",
    "huggingface_hub",
)

# Create volume for data and outputs
volume = modal.Volume.from_name("sage-training-data", create_if_missing=True)

@app.function(
    image=training_image,
    gpu=modal.gpu.A100(count=1, memory=40),  # A100-40GB
    timeout=86400,  # 24 hours
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def train_sage_model(preset: str = "standard"):
    from train import SageTrainingConfig, train

    config = SageTrainingConfig.from_preset(preset)
    config.train_data_path = "/data/train.jsonl"
    config.eval_data_path = "/data/eval.jsonl"
    config.output_dir = "/data/outputs"

    return train(config)

@app.local_entrypoint()
def main(preset: str = "standard"):
    result = train_sage_model.remote(preset=preset)
    print(f"Training complete! Model saved to: {result}")
"""


# ============================================
# CLI ENTRY POINT
# ============================================

def main():
    """Main entry point for local training."""
    import argparse

    parser = argparse.ArgumentParser(description="Train Sage AI Tutor")
    parser.add_argument(
        "--preset",
        type=str,
        default="standard",
        choices=["efficient", "standard", "production"],
        help="Training preset to use"
    )
    parser.add_argument(
        "--train-data",
        type=str,
        default="./data/train.jsonl",
        help="Path to training data JSONL"
    )
    parser.add_argument(
        "--eval-data",
        type=str,
        default=None,
        help="Path to evaluation data JSONL"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./outputs/sage-tutor",
        help="Output directory for model"
    )
    parser.add_argument(
        "--wandb-project",
        type=str,
        default="sage-tutor",
        help="Weights & Biases project name"
    )
    parser.add_argument(
        "--no-wandb",
        action="store_true",
        help="Disable Weights & Biases logging"
    )
    parser.add_argument(
        "--base-model",
        type=str,
        default="meta-llama/Llama-3.1-8B-Instruct",
        help="Base model to fine-tune"
    )

    args = parser.parse_args()

    # Create config from preset
    config = SageTrainingConfig.from_preset(args.preset)

    # Override with CLI arguments
    config.train_data_path = args.train_data
    config.eval_data_path = args.eval_data
    config.output_dir = args.output_dir
    config.base_model = args.base_model

    if args.no_wandb:
        config.wandb_project = None
    else:
        config.wandb_project = args.wandb_project

    # Run training
    output_path = train(config)
    print(f"\n✅ Training complete!")
    print(f"📁 Model saved to: {output_path}")


if __name__ == "__main__":
    main()
