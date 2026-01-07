"""
PPO Trainer for Sage Tutor RLHF

Proximal Policy Optimization (PPO) training for aligning the Sage tutor
with educational reward signals.

This implements:
- PPO with clipped objective
- KL penalty to prevent divergence from reference model
- Integration with our custom reward model
- Learning outcome-based rewards

Based on the TRL library's PPO implementation with educational adaptations.
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable
from collections import deque

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    GenerationConfig,
)
from peft import PeftModel
from tqdm import tqdm

from rewardModel import SageRewardModel, RuleBasedRewardCalculator, compute_composite_reward

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# PPO CONFIGURATION
# ============================================

@dataclass
class PPOConfig:
    """Configuration for PPO training."""

    # Model paths
    sft_model_path: str = "./outputs/merged"
    reward_model_path: str = "./reward_model/checkpoint-final"

    # PPO hyperparameters
    learning_rate: float = 1e-5
    batch_size: int = 4
    mini_batch_size: int = 1
    ppo_epochs: int = 4
    max_steps: int = 10000

    # PPO coefficients
    gamma: float = 1.0
    gae_lambda: float = 0.95
    clip_range: float = 0.2
    clip_range_value: float = 0.2
    value_coefficient: float = 0.1
    entropy_coefficient: float = 0.01
    max_grad_norm: float = 0.5

    # KL penalty
    init_kl_coeff: float = 0.2
    target_kl: float = 0.1
    kl_penalty_mode: str = "adaptive"  # "fixed", "adaptive"

    # Generation
    max_new_tokens: int = 256
    temperature: float = 0.8
    top_p: float = 0.9

    # Reward shaping
    use_rule_based_reward: bool = True
    reward_baseline: float = 0.0

    # Output
    output_dir: str = "./rlhf_outputs"
    save_steps: int = 500
    logging_steps: int = 10

    # Experiment tracking
    wandb_project: Optional[str] = "sage-rlhf"


# ============================================
# PROMPT DATASET
# ============================================

class PromptDataset(Dataset):
    """
    Dataset of prompts for PPO training.
    Each prompt is a student question/context that the model should respond to.
    """

    def __init__(self, data_path: str, tokenizer: AutoTokenizer):
        self.tokenizer = tokenizer
        self.prompts = []

        with open(data_path, 'r') as f:
            for line in f:
                if line.strip():
                    example = json.loads(line)
                    # Extract the prompt (context + user message)
                    if "messages" in example:
                        # Conversational format
                        messages = example["messages"]
                        # Take everything up to last assistant turn
                        prompt_messages = []
                        for msg in messages:
                            if msg["role"] == "assistant":
                                break
                            prompt_messages.append(msg)
                        self.prompts.append(prompt_messages)
                    elif "prompt" in example:
                        self.prompts.append(example["prompt"])
                    elif "instruction" in example:
                        self.prompts.append(example["instruction"])

        logger.info(f"Loaded {len(self.prompts)} prompts for PPO")

    def __len__(self) -> int:
        return len(self.prompts)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return {"prompt": self.prompts[idx]}


# ============================================
# PPO ROLLOUT BUFFER
# ============================================

@dataclass
class PPOExperience:
    """Single PPO experience."""
    query_ids: torch.Tensor
    response_ids: torch.Tensor
    logprobs: torch.Tensor
    values: torch.Tensor
    rewards: torch.Tensor
    advantages: torch.Tensor
    returns: torch.Tensor


class RolloutBuffer:
    """Buffer to store PPO rollouts."""

    def __init__(self, buffer_size: int = 256):
        self.buffer_size = buffer_size
        self.experiences: List[PPOExperience] = []

    def add(self, experience: PPOExperience):
        """Add experience to buffer."""
        self.experiences.append(experience)

    def clear(self):
        """Clear the buffer."""
        self.experiences = []

    def is_full(self) -> bool:
        """Check if buffer is full."""
        return len(self.experiences) >= self.buffer_size

    def get_batches(self, mini_batch_size: int):
        """Generate mini-batches from buffer."""
        indices = torch.randperm(len(self.experiences))

        for start in range(0, len(self.experiences), mini_batch_size):
            end = min(start + mini_batch_size, len(self.experiences))
            batch_indices = indices[start:end]

            batch = [self.experiences[i] for i in batch_indices]
            yield batch


# ============================================
# VALUE HEAD
# ============================================

class ValueHead(torch.nn.Module):
    """Value head for PPO critic."""

    def __init__(self, hidden_size: int = 4096):
        super().__init__()
        self.head = torch.nn.Sequential(
            torch.nn.Linear(hidden_size, 1024),
            torch.nn.ReLU(),
            torch.nn.Linear(1024, 1),
        )

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        return self.head(hidden_states).squeeze(-1)


# ============================================
# PPO TRAINER
# ============================================

class SagePPOTrainer:
    """
    PPO Trainer for Sage tutor alignment.

    Implements PPO with:
    - Clipped surrogate objective
    - Value function learning
    - KL divergence penalty
    - Educational reward signals
    """

    def __init__(self, config: PPOConfig):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Load models
        self._load_models()

        # Initialize optimizer
        self.optimizer = torch.optim.AdamW(
            list(self.model.parameters()) + list(self.value_head.parameters()),
            lr=config.learning_rate,
            weight_decay=0.01,
        )

        # KL coefficient (adaptive)
        self.kl_coeff = config.init_kl_coeff

        # Metrics tracking
        self.metrics_history = {
            "reward": deque(maxlen=100),
            "kl": deque(maxlen=100),
            "policy_loss": deque(maxlen=100),
            "value_loss": deque(maxlen=100),
            "entropy": deque(maxlen=100),
        }

        # Rollout buffer
        self.buffer = RolloutBuffer()

        # Rule-based reward calculator
        self.rule_calculator = RuleBasedRewardCalculator()

        # Output directory
        self.output_dir = Path(config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _load_models(self):
        """Load policy, reference, reward, and value models."""
        logger.info("Loading models...")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.config.sft_model_path)
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.tokenizer.padding_side = "left"

        # Load policy model (the model we're training)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.sft_model_path,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )

        # Load reference model (frozen, for KL penalty)
        self.ref_model = AutoModelForCausalLM.from_pretrained(
            self.config.sft_model_path,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        self.ref_model.eval()
        for param in self.ref_model.parameters():
            param.requires_grad = False

        # Load reward model
        self.reward_model = SageRewardModel()
        reward_state = torch.load(
            Path(self.config.reward_model_path) / "model.pt",
            map_location=self.device,
        )
        self.reward_model.load_state_dict(reward_state)
        self.reward_model.eval()
        for param in self.reward_model.parameters():
            param.requires_grad = False

        # Value head
        hidden_size = self.model.config.hidden_size
        self.value_head = ValueHead(hidden_size).to(self.device)

        logger.info("Models loaded successfully")

    def generate_response(
        self,
        prompts: List[Any],
    ) -> tuple[List[str], torch.Tensor, torch.Tensor]:
        """
        Generate responses from the policy model.

        Returns:
            responses: Generated response texts
            response_ids: Token IDs of responses
            logprobs: Log probabilities of each token
        """
        # Format prompts
        formatted_prompts = []
        for prompt in prompts:
            if isinstance(prompt, list):
                # Messages format
                text = self.tokenizer.apply_chat_template(
                    prompt,
                    tokenize=False,
                    add_generation_prompt=True,
                )
            else:
                # String prompt
                text = prompt

            formatted_prompts.append(text)

        # Tokenize
        inputs = self.tokenizer(
            formatted_prompts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=1024,
        ).to(self.device)

        # Generate
        self.model.eval()
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=self.config.max_new_tokens,
                temperature=self.config.temperature,
                top_p=self.config.top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.pad_token_id,
                return_dict_in_generate=True,
                output_scores=True,
            )

        # Extract response tokens (everything after the prompt)
        response_ids = outputs.sequences[:, inputs["input_ids"].shape[1]:]

        # Calculate log probabilities
        logprobs = self._compute_logprobs(inputs["input_ids"], response_ids)

        # Decode responses
        responses = self.tokenizer.batch_decode(
            response_ids,
            skip_special_tokens=True,
        )

        self.model.train()

        return responses, response_ids, logprobs

    def _compute_logprobs(
        self,
        query_ids: torch.Tensor,
        response_ids: torch.Tensor,
    ) -> torch.Tensor:
        """Compute log probabilities of response tokens."""
        full_ids = torch.cat([query_ids, response_ids], dim=1)
        attention_mask = (full_ids != self.tokenizer.pad_token_id).long()

        with torch.no_grad():
            outputs = self.model(
                input_ids=full_ids,
                attention_mask=attention_mask,
            )

        # Get logits for response tokens
        logits = outputs.logits[:, query_ids.shape[1]-1:-1, :]

        # Compute log probabilities
        logprobs = F.log_softmax(logits, dim=-1)

        # Gather log probs for actual tokens
        response_logprobs = torch.gather(
            logprobs,
            dim=-1,
            index=response_ids.unsqueeze(-1),
        ).squeeze(-1)

        return response_logprobs

    def compute_rewards(
        self,
        prompts: List[Any],
        responses: List[str],
    ) -> torch.Tensor:
        """
        Compute rewards for responses using reward model and rules.
        """
        rewards = []

        for prompt, response in zip(prompts, responses):
            # Format context
            if isinstance(prompt, list):
                context = "\n".join([
                    f"{m['role']}: {m['content']}"
                    for m in prompt
                ])
            else:
                context = prompt

            # Get learned reward
            learned_result = self.reward_model.compute_reward(context, response)
            learned_reward = learned_result["reward"]

            # Get rule-based reward
            socratic_reward = self.rule_calculator.socratic_reward(response)

            # Combine rewards
            if self.config.use_rule_based_reward:
                reward = compute_composite_reward(
                    learned_reward=learned_reward,
                    socratic_reward=socratic_reward,
                )
            else:
                reward = learned_reward

            # Apply baseline
            reward = reward - self.config.reward_baseline

            rewards.append(reward)

        return torch.tensor(rewards, device=self.device)

    def compute_values(
        self,
        query_ids: torch.Tensor,
        response_ids: torch.Tensor,
    ) -> torch.Tensor:
        """Compute value estimates for each token position."""
        full_ids = torch.cat([query_ids, response_ids], dim=1)
        attention_mask = (full_ids != self.tokenizer.pad_token_id).long()

        with torch.no_grad():
            outputs = self.model(
                input_ids=full_ids,
                attention_mask=attention_mask,
                output_hidden_states=True,
            )

        # Get hidden states for response tokens
        hidden_states = outputs.hidden_states[-1][:, query_ids.shape[1]:, :]

        # Compute values
        values = self.value_head(hidden_states)

        return values

    def compute_advantages(
        self,
        rewards: torch.Tensor,
        values: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Compute advantages using GAE (Generalized Advantage Estimation).
        """
        batch_size, seq_len = values.shape

        # Last value is 0 (end of episode)
        next_values = torch.cat([
            values[:, 1:],
            torch.zeros(batch_size, 1, device=self.device),
        ], dim=1)

        # TD errors
        deltas = rewards.unsqueeze(1) / seq_len + self.config.gamma * next_values - values

        # GAE
        advantages = torch.zeros_like(values)
        last_advantage = 0

        for t in reversed(range(seq_len)):
            advantages[:, t] = deltas[:, t] + self.config.gamma * self.config.gae_lambda * last_advantage
            last_advantage = advantages[:, t]

        # Returns
        returns = advantages + values

        # Normalize advantages
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        return advantages, returns

    def compute_kl_divergence(
        self,
        query_ids: torch.Tensor,
        response_ids: torch.Tensor,
        logprobs: torch.Tensor,
    ) -> torch.Tensor:
        """Compute KL divergence from reference model."""
        full_ids = torch.cat([query_ids, response_ids], dim=1)
        attention_mask = (full_ids != self.tokenizer.pad_token_id).long()

        with torch.no_grad():
            ref_outputs = self.ref_model(
                input_ids=full_ids,
                attention_mask=attention_mask,
            )

        # Reference log probs
        ref_logits = ref_outputs.logits[:, query_ids.shape[1]-1:-1, :]
        ref_logprobs = F.log_softmax(ref_logits, dim=-1)
        ref_response_logprobs = torch.gather(
            ref_logprobs,
            dim=-1,
            index=response_ids.unsqueeze(-1),
        ).squeeze(-1)

        # KL divergence
        kl = logprobs - ref_response_logprobs

        return kl.sum(dim=-1)

    def ppo_step(self, batch: List[PPOExperience]) -> Dict[str, float]:
        """
        Execute one PPO update step.
        """
        total_policy_loss = 0
        total_value_loss = 0
        total_entropy = 0
        total_kl = 0

        for experience in batch:
            # Get current log probs
            current_logprobs = self._compute_logprobs(
                experience.query_ids,
                experience.response_ids,
            )

            # Ratio
            ratio = torch.exp(current_logprobs - experience.logprobs)

            # Clipped surrogate objective
            policy_loss_1 = ratio * experience.advantages
            policy_loss_2 = torch.clamp(
                ratio,
                1 - self.config.clip_range,
                1 + self.config.clip_range,
            ) * experience.advantages

            policy_loss = -torch.min(policy_loss_1, policy_loss_2).mean()

            # Value loss
            current_values = self.compute_values(
                experience.query_ids,
                experience.response_ids,
            )
            value_loss = F.mse_loss(current_values, experience.returns)

            # Entropy bonus
            entropy = -current_logprobs.mean()

            # KL penalty
            kl = self.compute_kl_divergence(
                experience.query_ids,
                experience.response_ids,
                experience.logprobs,
            )
            kl_loss = self.kl_coeff * kl.mean()

            # Total loss
            loss = (
                policy_loss +
                self.config.value_coefficient * value_loss -
                self.config.entropy_coefficient * entropy +
                kl_loss
            )

            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                list(self.model.parameters()) + list(self.value_head.parameters()),
                self.config.max_grad_norm,
            )
            self.optimizer.step()

            total_policy_loss += policy_loss.item()
            total_value_loss += value_loss.item()
            total_entropy += entropy.item()
            total_kl += kl.mean().item()

        n = len(batch)
        return {
            "policy_loss": total_policy_loss / n,
            "value_loss": total_value_loss / n,
            "entropy": total_entropy / n,
            "kl": total_kl / n,
        }

    def adapt_kl_coefficient(self, mean_kl: float):
        """Adaptively adjust KL coefficient."""
        if self.config.kl_penalty_mode == "adaptive":
            if mean_kl > self.config.target_kl * 1.5:
                self.kl_coeff *= 1.5
            elif mean_kl < self.config.target_kl / 1.5:
                self.kl_coeff /= 1.5

            self.kl_coeff = max(0.001, min(1.0, self.kl_coeff))

    def train(
        self,
        prompt_dataset: PromptDataset,
    ) -> Dict[str, List[float]]:
        """
        Run PPO training loop.
        """
        logger.info("Starting PPO training...")
        logger.info(f"Config: {self.config}")

        # Setup wandb
        if self.config.wandb_project:
            import wandb
            wandb.init(
                project=self.config.wandb_project,
                config=self.config.__dict__,
            )

        dataloader = DataLoader(
            prompt_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
        )

        step = 0
        history = {"reward": [], "kl": [], "policy_loss": [], "value_loss": []}

        for epoch in range(100):  # Outer loop
            for batch in tqdm(dataloader, desc=f"Epoch {epoch+1}"):
                prompts = batch["prompt"]

                # Generate responses
                responses, response_ids, logprobs = self.generate_response(prompts)

                # Compute rewards
                rewards = self.compute_rewards(prompts, responses)

                # Tokenize prompts for value computation
                formatted = []
                for p in prompts:
                    if isinstance(p, list):
                        formatted.append(self.tokenizer.apply_chat_template(
                            p, tokenize=False, add_generation_prompt=True
                        ))
                    else:
                        formatted.append(p)

                query_tokens = self.tokenizer(
                    formatted,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                ).to(self.device)
                query_ids = query_tokens["input_ids"]

                # Compute values
                values = self.compute_values(query_ids, response_ids)

                # Compute advantages
                advantages, returns = self.compute_advantages(rewards, values)

                # Store experience
                experience = PPOExperience(
                    query_ids=query_ids,
                    response_ids=response_ids,
                    logprobs=logprobs,
                    values=values.detach(),
                    rewards=rewards,
                    advantages=advantages.detach(),
                    returns=returns.detach(),
                )
                self.buffer.add(experience)

                # PPO update when buffer is full
                if self.buffer.is_full():
                    for _ in range(self.config.ppo_epochs):
                        for mini_batch in self.buffer.get_batches(self.config.mini_batch_size):
                            metrics = self.ppo_step(mini_batch)

                            self.metrics_history["policy_loss"].append(metrics["policy_loss"])
                            self.metrics_history["value_loss"].append(metrics["value_loss"])
                            self.metrics_history["entropy"].append(metrics["entropy"])
                            self.metrics_history["kl"].append(metrics["kl"])

                    # Adapt KL coefficient
                    mean_kl = sum(self.metrics_history["kl"]) / len(self.metrics_history["kl"])
                    self.adapt_kl_coefficient(mean_kl)

                    self.buffer.clear()

                # Track rewards
                self.metrics_history["reward"].extend(rewards.tolist())
                history["reward"].append(rewards.mean().item())

                step += 1

                # Logging
                if step % self.config.logging_steps == 0:
                    avg_reward = sum(self.metrics_history["reward"]) / len(self.metrics_history["reward"])
                    avg_kl = sum(self.metrics_history["kl"]) / max(len(self.metrics_history["kl"]), 1)

                    logger.info(
                        f"Step {step} | "
                        f"Reward: {avg_reward:.4f} | "
                        f"KL: {avg_kl:.4f} | "
                        f"KL coeff: {self.kl_coeff:.4f}"
                    )

                    if self.config.wandb_project:
                        import wandb
                        wandb.log({
                            "reward": avg_reward,
                            "kl": avg_kl,
                            "kl_coeff": self.kl_coeff,
                            "step": step,
                        })

                # Save checkpoint
                if step % self.config.save_steps == 0:
                    self.save_checkpoint(step)

                if step >= self.config.max_steps:
                    break

            if step >= self.config.max_steps:
                break

        # Final save
        self.save_checkpoint(step, final=True)

        if self.config.wandb_project:
            import wandb
            wandb.finish()

        return history

    def save_checkpoint(self, step: int, final: bool = False):
        """Save model checkpoint."""
        name = "final" if final else f"step-{step}"
        checkpoint_dir = self.output_dir / name
        checkpoint_dir.mkdir(exist_ok=True)

        # Save model
        self.model.save_pretrained(checkpoint_dir)
        self.tokenizer.save_pretrained(checkpoint_dir)

        # Save value head
        torch.save(self.value_head.state_dict(), checkpoint_dir / "value_head.pt")

        # Save config
        with open(checkpoint_dir / "config.json", "w") as f:
            json.dump(self.config.__dict__, f, indent=2)

        logger.info(f"Checkpoint saved: {checkpoint_dir}")


# ============================================
# CLI
# ============================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="PPO Training for Sage Tutor")
    parser.add_argument("--sft-model", type=str, required=True)
    parser.add_argument("--reward-model", type=str, required=True)
    parser.add_argument("--prompts", type=str, required=True)
    parser.add_argument("--output-dir", type=str, default="./rlhf_outputs")
    parser.add_argument("--max-steps", type=int, default=10000)
    parser.add_argument("--batch-size", type=int, default=4)

    args = parser.parse_args()

    config = PPOConfig(
        sft_model_path=args.sft_model,
        reward_model_path=args.reward_model,
        output_dir=args.output_dir,
        max_steps=args.max_steps,
        batch_size=args.batch_size,
    )

    trainer = SagePPOTrainer(config)

    # Load prompts
    prompt_dataset = PromptDataset(args.prompts, trainer.tokenizer)

    # Train
    trainer.train(prompt_dataset)

    print("\n✅ PPO training complete!")


if __name__ == "__main__":
    main()
