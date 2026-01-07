"""
Reward Model for Sage Tutor RLHF

This reward model is trained to predict the quality of tutor responses
based on educational effectiveness signals:
- Socratic method usage
- Learning outcome improvement
- Student engagement
- Pedagogical quality

The reward model provides dense rewards for PPO training.
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Tuple

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoModel,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    PreTrainedModel,
)
from peft import LoraConfig, get_peft_model, TaskType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# REWARD DIMENSIONS
# ============================================

REWARD_DIMENSIONS = {
    "socratic_quality": {
        "weight": 0.30,
        "description": "Uses Socratic method effectively",
    },
    "learning_outcome": {
        "weight": 0.25,
        "description": "Contributes to learning progress",
    },
    "pedagogical_clarity": {
        "weight": 0.20,
        "description": "Explains clearly at appropriate level",
    },
    "engagement": {
        "weight": 0.15,
        "description": "Maintains student engagement",
    },
    "appropriateness": {
        "weight": 0.10,
        "description": "Response is appropriate and safe",
    },
}


# ============================================
# REWARD MODEL ARCHITECTURE
# ============================================

class SageRewardModel(nn.Module):
    """
    Reward model for Sage tutor responses.

    Takes (context, response) pairs and outputs a scalar reward.
    Uses a frozen base LLM with a learned reward head.
    """

    def __init__(
        self,
        base_model: str = "meta-llama/Llama-3.1-8B-Instruct",
        use_lora: bool = True,
        lora_r: int = 16,
        hidden_size: int = 4096,
    ):
        super().__init__()

        self.tokenizer = AutoTokenizer.from_pretrained(base_model)
        self.tokenizer.pad_token = self.tokenizer.eos_token

        # Load base model
        self.backbone = AutoModel.from_pretrained(
            base_model,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )

        # Apply LoRA for efficient training
        if use_lora:
            lora_config = LoraConfig(
                r=lora_r,
                lora_alpha=32,
                target_modules=["q_proj", "v_proj"],
                lora_dropout=0.05,
                bias="none",
                task_type=TaskType.FEATURE_EXTRACTION,
            )
            self.backbone = get_peft_model(self.backbone, lora_config)

        # Reward head - single scalar output
        self.reward_head = nn.Sequential(
            nn.Linear(hidden_size, 1024),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(1024, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 1),
        )

        # Multi-dimensional reward heads (optional)
        self.dimension_heads = nn.ModuleDict({
            dim: nn.Linear(hidden_size, 1)
            for dim in REWARD_DIMENSIONS
        })

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        return_dimensions: bool = False,
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass to compute reward.

        Args:
            input_ids: Tokenized (context, response) pair
            attention_mask: Attention mask
            return_dimensions: If True, also return per-dimension scores

        Returns:
            Dictionary with 'reward' and optionally dimension scores
        """
        # Get hidden states from backbone
        outputs = self.backbone(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=True,
        )

        # Use last hidden state of last token
        last_hidden = outputs.last_hidden_state

        # Get the last non-padding token for each sequence
        sequence_lengths = attention_mask.sum(dim=1) - 1
        batch_size = input_ids.shape[0]

        pooled = last_hidden[
            torch.arange(batch_size, device=last_hidden.device),
            sequence_lengths,
        ]

        # Compute main reward
        reward = self.reward_head(pooled).squeeze(-1)

        result = {"reward": reward}

        # Optionally compute dimension-wise rewards
        if return_dimensions:
            for dim in REWARD_DIMENSIONS:
                dim_score = self.dimension_heads[dim](pooled).squeeze(-1)
                result[dim] = dim_score

        return result

    def compute_reward(
        self,
        context: str,
        response: str,
        return_dimensions: bool = False,
    ) -> Dict[str, float]:
        """
        Compute reward for a single (context, response) pair.

        Args:
            context: The conversation context (system + user messages)
            response: The tutor's response

        Returns:
            Dictionary with reward score(s)
        """
        # Format input
        text = f"Context:\n{context}\n\nResponse:\n{response}"

        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=2048,
        ).to(self.backbone.device)

        # Compute reward
        with torch.no_grad():
            result = self.forward(
                inputs["input_ids"],
                inputs["attention_mask"],
                return_dimensions=return_dimensions,
            )

        # Convert to Python floats
        return {k: v.item() for k, v in result.items()}


# ============================================
# PREFERENCE DATASET
# ============================================

class PreferenceDataset(Dataset):
    """
    Dataset of (context, chosen, rejected) triplets for reward model training.
    """

    def __init__(
        self,
        data_path: str,
        tokenizer: AutoTokenizer,
        max_length: int = 2048,
    ):
        self.tokenizer = tokenizer
        self.max_length = max_length

        # Load data
        self.examples = []
        with open(data_path, 'r') as f:
            for line in f:
                if line.strip():
                    self.examples.append(json.loads(line))

        logger.info(f"Loaded {len(self.examples)} preference pairs")

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        example = self.examples[idx]

        context = example.get("context", example.get("prompt", ""))
        chosen = example.get("chosen", example.get("preferred", ""))
        rejected = example.get("rejected", example.get("dispreferred", ""))

        # Tokenize chosen
        chosen_text = f"Context:\n{context}\n\nResponse:\n{chosen}"
        chosen_tokens = self.tokenizer(
            chosen_text,
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )

        # Tokenize rejected
        rejected_text = f"Context:\n{context}\n\nResponse:\n{rejected}"
        rejected_tokens = self.tokenizer(
            rejected_text,
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )

        return {
            "chosen_input_ids": chosen_tokens["input_ids"].squeeze(0),
            "chosen_attention_mask": chosen_tokens["attention_mask"].squeeze(0),
            "rejected_input_ids": rejected_tokens["input_ids"].squeeze(0),
            "rejected_attention_mask": rejected_tokens["attention_mask"].squeeze(0),
        }


# ============================================
# REWARD MODEL TRAINER
# ============================================

class RewardModelTrainer:
    """
    Trainer for the reward model using Bradley-Terry preference learning.
    """

    def __init__(
        self,
        model: SageRewardModel,
        train_dataset: PreferenceDataset,
        eval_dataset: Optional[PreferenceDataset] = None,
        learning_rate: float = 1e-5,
        batch_size: int = 4,
        num_epochs: int = 3,
        output_dir: str = "./reward_model",
    ):
        self.model = model
        self.train_dataset = train_dataset
        self.eval_dataset = eval_dataset
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.num_epochs = num_epochs
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=learning_rate,
            weight_decay=0.01,
        )

    def compute_loss(
        self,
        chosen_input_ids: torch.Tensor,
        chosen_attention_mask: torch.Tensor,
        rejected_input_ids: torch.Tensor,
        rejected_attention_mask: torch.Tensor,
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        """
        Compute Bradley-Terry preference loss.

        The loss encourages: reward(chosen) > reward(rejected)
        """
        # Get rewards for chosen responses
        chosen_output = self.model(chosen_input_ids, chosen_attention_mask)
        chosen_reward = chosen_output["reward"]

        # Get rewards for rejected responses
        rejected_output = self.model(rejected_input_ids, rejected_attention_mask)
        rejected_reward = rejected_output["reward"]

        # Bradley-Terry loss: -log(sigmoid(r_chosen - r_rejected))
        loss = -torch.nn.functional.logsigmoid(chosen_reward - rejected_reward).mean()

        # Compute accuracy
        accuracy = (chosen_reward > rejected_reward).float().mean().item()

        # Compute reward margins
        margin = (chosen_reward - rejected_reward).mean().item()

        metrics = {
            "loss": loss.item(),
            "accuracy": accuracy,
            "margin": margin,
            "chosen_reward": chosen_reward.mean().item(),
            "rejected_reward": rejected_reward.mean().item(),
        }

        return loss, metrics

    def train(self) -> Dict[str, List[float]]:
        """Run training loop."""
        logger.info("Starting reward model training...")

        train_loader = DataLoader(
            self.train_dataset,
            batch_size=self.batch_size,
            shuffle=True,
        )

        history = {
            "loss": [],
            "accuracy": [],
            "margin": [],
        }

        self.model.train()

        for epoch in range(self.num_epochs):
            epoch_loss = 0
            epoch_accuracy = 0
            num_batches = 0

            for batch in train_loader:
                # Move to device
                batch = {k: v.to(self.model.backbone.device) for k, v in batch.items()}

                # Forward pass
                loss, metrics = self.compute_loss(
                    batch["chosen_input_ids"],
                    batch["chosen_attention_mask"],
                    batch["rejected_input_ids"],
                    batch["rejected_attention_mask"],
                )

                # Backward pass
                self.optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                self.optimizer.step()

                epoch_loss += metrics["loss"]
                epoch_accuracy += metrics["accuracy"]
                num_batches += 1

                if num_batches % 10 == 0:
                    logger.info(
                        f"Epoch {epoch+1}/{self.num_epochs} | "
                        f"Batch {num_batches} | "
                        f"Loss: {metrics['loss']:.4f} | "
                        f"Acc: {metrics['accuracy']:.2%}"
                    )

            # Epoch stats
            avg_loss = epoch_loss / num_batches
            avg_accuracy = epoch_accuracy / num_batches

            history["loss"].append(avg_loss)
            history["accuracy"].append(avg_accuracy)

            logger.info(
                f"Epoch {epoch+1} complete | "
                f"Avg Loss: {avg_loss:.4f} | "
                f"Avg Accuracy: {avg_accuracy:.2%}"
            )

            # Evaluate
            if self.eval_dataset:
                eval_metrics = self.evaluate()
                logger.info(f"Eval | Loss: {eval_metrics['loss']:.4f} | Acc: {eval_metrics['accuracy']:.2%}")

            # Save checkpoint
            self.save_checkpoint(epoch + 1)

        return history

    def evaluate(self) -> Dict[str, float]:
        """Evaluate on eval dataset."""
        if not self.eval_dataset:
            return {}

        eval_loader = DataLoader(
            self.eval_dataset,
            batch_size=self.batch_size,
        )

        self.model.eval()
        total_loss = 0
        total_accuracy = 0
        num_batches = 0

        with torch.no_grad():
            for batch in eval_loader:
                batch = {k: v.to(self.model.backbone.device) for k, v in batch.items()}

                loss, metrics = self.compute_loss(
                    batch["chosen_input_ids"],
                    batch["chosen_attention_mask"],
                    batch["rejected_input_ids"],
                    batch["rejected_attention_mask"],
                )

                total_loss += metrics["loss"]
                total_accuracy += metrics["accuracy"]
                num_batches += 1

        self.model.train()

        return {
            "loss": total_loss / num_batches,
            "accuracy": total_accuracy / num_batches,
        }

    def save_checkpoint(self, epoch: int):
        """Save model checkpoint."""
        checkpoint_path = self.output_dir / f"checkpoint-{epoch}"
        checkpoint_path.mkdir(exist_ok=True)

        # Save model
        torch.save(self.model.state_dict(), checkpoint_path / "model.pt")

        # Save tokenizer
        self.model.tokenizer.save_pretrained(checkpoint_path)

        logger.info(f"Checkpoint saved to: {checkpoint_path}")


# ============================================
# RULE-BASED REWARD COMPONENTS
# ============================================

class RuleBasedRewardCalculator:
    """
    Rule-based reward components that don't require training.
    Used alongside the learned reward model.
    """

    @staticmethod
    def socratic_reward(response: str) -> float:
        """
        Calculate reward based on Socratic teaching indicators.
        Returns a score between 0 and 1.
        """
        score = 0.0
        response_lower = response.lower()

        # Contains a question (essential for Socratic method)
        if "?" in response:
            score += 0.3

        # Uses guiding language
        guiding_phrases = [
            "what do you think",
            "can you tell me",
            "how might",
            "what if",
            "think about",
            "what would happen",
            "why do you think",
            "what do you already know",
            "let's consider",
        ]
        for phrase in guiding_phrases:
            if phrase in response_lower:
                score += 0.1
                break

        # Avoids direct answers (check for absence of giving-answer phrases)
        direct_answer_phrases = [
            "the answer is",
            "it equals",
            "the solution is",
            "here's the answer",
        ]
        gives_direct_answer = any(p in response_lower for p in direct_answer_phrases)
        if not gives_direct_answer:
            score += 0.2

        # Encourages student
        encouragement_phrases = [
            "great", "good", "nice", "excellent", "well done",
            "you're on the right track", "keep going",
        ]
        for phrase in encouragement_phrases:
            if phrase in response_lower:
                score += 0.1
                break

        # Breaks down problem
        breakdown_phrases = ["first", "step", "let's start", "begin by"]
        for phrase in breakdown_phrases:
            if phrase in response_lower:
                score += 0.1
                break

        # Length penalty (too short or too long)
        word_count = len(response.split())
        if 20 <= word_count <= 200:
            score += 0.1
        elif word_count < 10 or word_count > 400:
            score -= 0.1

        return max(0.0, min(1.0, score))

    @staticmethod
    def learning_outcome_reward(
        pre_understanding: float,
        post_understanding: float,
        problem_solved: bool,
    ) -> float:
        """
        Calculate reward based on learning outcomes.

        Args:
            pre_understanding: Student's understanding before (0-1)
            post_understanding: Student's understanding after (0-1)
            problem_solved: Whether the problem was eventually solved

        Returns:
            Reward score between 0 and 1
        """
        score = 0.0

        # Improvement in understanding
        improvement = post_understanding - pre_understanding
        score += improvement * 0.5

        # Problem solved bonus
        if problem_solved:
            score += 0.3

        # Achieved high understanding
        if post_understanding >= 0.8:
            score += 0.2

        return max(0.0, min(1.0, score))

    @staticmethod
    def engagement_reward(
        response_length: int,
        student_continued: bool,
        time_on_task: float,
    ) -> float:
        """
        Calculate reward based on engagement signals.

        Args:
            response_length: Number of words in student's next response
            student_continued: Whether student continued the conversation
            time_on_task: Time student spent before responding (seconds)

        Returns:
            Reward score between 0 and 1
        """
        score = 0.0

        # Student continued the conversation
        if student_continued:
            score += 0.4

        # Student gave a substantive response
        if response_length > 10:
            score += 0.2
        if response_length > 30:
            score += 0.1

        # Time on task (thinking time, not abandonment)
        if 5 <= time_on_task <= 120:  # 5 seconds to 2 minutes
            score += 0.2

        return max(0.0, min(1.0, score))


# ============================================
# COMPOSITE REWARD
# ============================================

def compute_composite_reward(
    learned_reward: float,
    socratic_reward: float,
    outcome_reward: Optional[float] = None,
    engagement_reward: Optional[float] = None,
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Combine learned and rule-based rewards into a single score.

    Args:
        learned_reward: Score from the trained reward model
        socratic_reward: Score from rule-based Socratic check
        outcome_reward: Score from learning outcome (if available)
        engagement_reward: Score from engagement signals (if available)
        weights: Custom weights for each component

    Returns:
        Composite reward score
    """
    if weights is None:
        weights = {
            "learned": 0.4,
            "socratic": 0.3,
            "outcome": 0.2,
            "engagement": 0.1,
        }

    reward = (
        learned_reward * weights["learned"] +
        socratic_reward * weights["socratic"]
    )

    if outcome_reward is not None:
        reward += outcome_reward * weights["outcome"]
    else:
        # Redistribute weight
        reward = reward / (weights["learned"] + weights["socratic"])

    if engagement_reward is not None:
        reward += engagement_reward * weights["engagement"]

    return reward


# ============================================
# CLI
# ============================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Train Sage Reward Model")
    parser.add_argument("--train-data", type=str, required=True)
    parser.add_argument("--eval-data", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default="./reward_model")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-5)

    args = parser.parse_args()

    # Initialize model
    model = SageRewardModel()

    # Load datasets
    train_dataset = PreferenceDataset(
        args.train_data,
        model.tokenizer,
    )

    eval_dataset = None
    if args.eval_data:
        eval_dataset = PreferenceDataset(
            args.eval_data,
            model.tokenizer,
        )

    # Train
    trainer = RewardModelTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        output_dir=args.output_dir,
    )

    history = trainer.train()

    print("\n✅ Reward model training complete!")
    print(f"Final accuracy: {history['accuracy'][-1]:.2%}")


if __name__ == "__main__":
    main()
