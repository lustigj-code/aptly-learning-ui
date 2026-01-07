"""
Modal Deployment for Sage Tutor Training

This script deploys the fine-tuning pipeline to Modal for GPU training.
Supports A100, H100, and other NVIDIA GPUs.

Usage:
    # Upload training data first
    modal volume put sage-training-data ./data/train.jsonl /train.jsonl
    modal volume put sage-training-data ./data/eval.jsonl /eval.jsonl

    # Run training
    modal run modal_train.py --preset standard

    # Download trained model
    modal volume get sage-training-data /outputs ./local-outputs
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional

import modal

# ============================================
# MODAL APP CONFIGURATION
# ============================================

app = modal.App("sage-tutor-training")

# Training image with all dependencies
training_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "torch>=2.1.0",
        "transformers>=4.40.0",
        "datasets>=2.18.0",
        "peft>=0.10.0",
        "trl>=0.8.0",
        "bitsandbytes>=0.43.0",
        "accelerate>=0.29.0",
        "scipy>=1.12.0",
        "wandb>=0.16.0",
        "huggingface_hub>=0.22.0",
        "flash-attn>=2.5.0",  # Flash attention for faster training
        "sentencepiece>=0.2.0",
        "protobuf>=4.25.0",
    )
)

# Volume for persistent storage
training_volume = modal.Volume.from_name("sage-training-data", create_if_missing=True)

# GPU configurations
GPU_CONFIGS = {
    "a100-40gb": modal.gpu.A100(count=1, size="40GB"),
    "a100-80gb": modal.gpu.A100(count=1, size="80GB"),
    "h100": modal.gpu.H100(count=1),
    "a10g": modal.gpu.A10G(count=1),
    "t4": modal.gpu.T4(count=1),
}


# ============================================
# TRAINING CONFIGURATION
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
- Celebrates effort, not just correct answers"""

TRAINING_PRESETS = {
    "efficient": {
        "lora_r": 8,
        "lora_alpha": 16,
        "target_modules": ["q_proj", "v_proj"],
        "num_train_epochs": 1,
        "per_device_train_batch_size": 4,
        "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4,
        "max_seq_length": 2048,
        "use_4bit": True,
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
        "use_4bit": True,
    },
    "production": {
        "lora_r": 32,
        "lora_alpha": 64,
        "lora_dropout": 0.1,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "num_train_epochs": 5,
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 16,
        "learning_rate": 5e-5,
        "use_4bit": False,
        "use_8bit": True,
        "max_seq_length": 4096,
    },
}


# ============================================
# TRAINING FUNCTION
# ============================================

@app.function(
    image=training_image,
    gpu=modal.gpu.A100(count=1, size="40GB"),
    timeout=86400,  # 24 hours
    volumes={"/data": training_volume},
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("wandb-secret", required=False),
    ],
)
def train_sage_model(
    preset: str = "standard",
    base_model: str = "meta-llama/Llama-3.1-8B-Instruct",
    wandb_project: Optional[str] = "sage-tutor",
    run_name: Optional[str] = None,
) -> dict:
    """Train the Sage tutor model with LoRA fine-tuning."""
    import torch
    from datasets import Dataset
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        BitsAndBytesConfig,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
    from trl import SFTTrainer

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Get preset configuration
    config = TRAINING_PRESETS.get(preset, TRAINING_PRESETS["standard"])

    logger.info("=" * 60)
    logger.info("SAGE TUTOR FINE-TUNING")
    logger.info("=" * 60)
    logger.info(f"Preset: {preset}")
    logger.info(f"Model: {base_model}")
    logger.info(f"LoRA rank: {config['lora_r']}")
    logger.info("=" * 60)

    # Initialize wandb if available
    if wandb_project and os.environ.get("WANDB_API_KEY"):
        import wandb
        wandb.init(
            project=wandb_project,
            name=run_name or f"sage-{preset}",
            config=config,
        )

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Quantization config
    bnb_config = None
    if config.get("use_4bit", False):
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )
    elif config.get("use_8bit", False):
        bnb_config = BitsAndBytesConfig(load_in_8bit=True)

    # Load model
    logger.info(f"Loading model: {base_model}")
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2",  # Use flash attention
    )

    # Prepare for training
    if bnb_config:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

    # LoRA config
    lora_config = LoraConfig(
        r=config["lora_r"],
        lora_alpha=config["lora_alpha"],
        lora_dropout=config.get("lora_dropout", 0.05),
        target_modules=config["target_modules"],
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)

    # Print trainable params
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logger.info(f"Trainable: {trainable:,} / {total:,} ({100 * trainable / total:.2f}%)")

    # Load training data
    def load_jsonl(path: str) -> list:
        data = []
        with open(path, 'r') as f:
            for line in f:
                if line.strip():
                    data.append(json.loads(line))
        return data

    def format_example(example: dict) -> dict:
        if "messages" in example:
            messages = example["messages"]
            if not messages or messages[0].get("role") != "system":
                messages = [{"role": "system", "content": SAGE_SYSTEM_PROMPT}] + messages
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        elif "instruction" in example:
            user_content = example["instruction"]
            if example.get("input"):
                user_content += f"\n\n{example['input']}"
            messages = [
                {"role": "system", "content": SAGE_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": example.get("output", "")},
            ]
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        else:
            text = example.get("text", "")
        return {"text": text}

    # Load and format data
    train_data = load_jsonl("/data/train.jsonl")
    logger.info(f"Loaded {len(train_data)} training examples")

    train_dataset = Dataset.from_list(train_data)
    train_dataset = train_dataset.map(format_example, remove_columns=train_dataset.column_names)

    eval_dataset = None
    if Path("/data/eval.jsonl").exists():
        eval_data = load_jsonl("/data/eval.jsonl")
        eval_dataset = Dataset.from_list(eval_data)
        eval_dataset = eval_dataset.map(format_example, remove_columns=eval_dataset.column_names)
        logger.info(f"Loaded {len(eval_data)} eval examples")

    # Training arguments
    training_args = TrainingArguments(
        output_dir="/data/outputs/checkpoints",
        num_train_epochs=config["num_train_epochs"],
        per_device_train_batch_size=config["per_device_train_batch_size"],
        per_device_eval_batch_size=config["per_device_train_batch_size"],
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        learning_rate=config["learning_rate"],
        weight_decay=0.01,
        warmup_ratio=0.1,
        max_grad_norm=1.0,
        logging_steps=25,
        save_steps=500,
        eval_steps=250 if eval_dataset else None,
        evaluation_strategy="steps" if eval_dataset else "no",
        save_total_limit=3,
        bf16=True,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        report_to="wandb" if wandb_project and os.environ.get("WANDB_API_KEY") else "none",
        run_name=run_name,
        optim="paged_adamw_32bit" if bnb_config else "adamw_torch",
        lr_scheduler_type="cosine",
        seed=42,
        group_by_length=True,
        dataloader_num_workers=4,
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=config["max_seq_length"],
        packing=False,
    )

    # Train!
    logger.info("Starting training...")
    trainer.train()

    # Save LoRA weights
    lora_path = "/data/outputs/lora"
    trainer.save_model(lora_path)
    tokenizer.save_pretrained(lora_path)
    logger.info(f"LoRA weights saved to: {lora_path}")

    # Merge and save full model
    logger.info("Merging LoRA weights...")
    merged_model = model.merge_and_unload()
    merged_path = "/data/outputs/merged"
    merged_model.save_pretrained(merged_path)
    tokenizer.save_pretrained(merged_path)
    logger.info(f"Merged model saved to: {merged_path}")

    # Commit volume changes
    training_volume.commit()

    if wandb_project and os.environ.get("WANDB_API_KEY"):
        import wandb
        wandb.finish()

    return {
        "status": "success",
        "lora_path": lora_path,
        "merged_path": merged_path,
        "trainable_params": trainable,
        "total_params": total,
    }


# ============================================
# DATA UPLOAD HELPERS
# ============================================

@app.function(
    image=modal.Image.debian_slim(),
    volumes={"/data": training_volume},
)
def upload_training_data(train_data: str, eval_data: Optional[str] = None):
    """Upload training data to the Modal volume."""
    with open("/data/train.jsonl", "w") as f:
        f.write(train_data)

    if eval_data:
        with open("/data/eval.jsonl", "w") as f:
            f.write(eval_data)

    training_volume.commit()
    return {"status": "uploaded", "train_lines": len(train_data.splitlines())}


@app.function(
    image=modal.Image.debian_slim(),
    volumes={"/data": training_volume},
)
def list_volume_contents() -> list:
    """List contents of the training volume."""
    contents = []
    for root, dirs, files in os.walk("/data"):
        for f in files:
            path = os.path.join(root, f)
            size = os.path.getsize(path)
            contents.append({"path": path, "size": size})
    return contents


# ============================================
# MODEL EXPORT
# ============================================

@app.function(
    image=training_image,
    gpu=modal.gpu.A10G(count=1),
    volumes={"/data": training_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def push_to_hub(
    repo_id: str,
    model_path: str = "/data/outputs/merged",
    private: bool = True,
):
    """Push the trained model to Hugging Face Hub."""
    from huggingface_hub import HfApi, login
    import os

    login(token=os.environ["HF_TOKEN"])
    api = HfApi()

    api.upload_folder(
        folder_path=model_path,
        repo_id=repo_id,
        repo_type="model",
        private=private,
    )

    return {"status": "pushed", "repo": repo_id}


# ============================================
# CLI ENTRYPOINT
# ============================================

@app.local_entrypoint()
def main(
    preset: str = "standard",
    model: str = "meta-llama/Llama-3.1-8B-Instruct",
    wandb_project: str = "sage-tutor",
    run_name: str = None,
    upload_data: str = None,
    list_data: bool = False,
    push_hub: str = None,
):
    """
    Sage Tutor Training CLI

    Examples:
        # Train with standard preset
        modal run modal_train.py --preset standard

        # Train with production preset
        modal run modal_train.py --preset production

        # List volume contents
        modal run modal_train.py --list-data

        # Push to HuggingFace
        modal run modal_train.py --push-hub your-username/sage-tutor
    """
    if list_data:
        contents = list_volume_contents.remote()
        print("\n📁 Volume Contents:")
        for item in contents:
            print(f"  {item['path']} ({item['size']:,} bytes)")
        return

    if push_hub:
        result = push_to_hub.remote(repo_id=push_hub)
        print(f"\n✅ Model pushed to: https://huggingface.co/{push_hub}")
        return

    print(f"\n🚀 Starting Sage Tutor Training")
    print(f"   Preset: {preset}")
    print(f"   Model: {model}")
    print(f"   W&B Project: {wandb_project}")

    result = train_sage_model.remote(
        preset=preset,
        base_model=model,
        wandb_project=wandb_project,
        run_name=run_name,
    )

    print("\n✅ Training Complete!")
    print(f"   LoRA weights: {result['lora_path']}")
    print(f"   Merged model: {result['merged_path']}")
    print(f"   Trainable params: {result['trainable_params']:,}")
