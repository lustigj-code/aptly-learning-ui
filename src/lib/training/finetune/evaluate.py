"""
Model Evaluation Harness

Comprehensive evaluation of fine-tuned Sage tutor models against:
- Socratic teaching quality
- Educational effectiveness
- Response appropriateness
- Comparison with baseline models

Usage:
    python evaluate.py --model ./outputs/merged --dataset ./data/eval.jsonl
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from datasets import Dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# EVALUATION DIMENSIONS
# ============================================

EVALUATION_DIMENSIONS = {
    "socratic_method": {
        "name": "Socratic Method",
        "description": "Uses guiding questions instead of direct answers",
        "weight": 0.25,
        "rubric": {
            5: "Perfectly Socratic - guides discovery through questions",
            4: "Mostly Socratic with occasional direct hints",
            3: "Mix of Socratic and direct approaches",
            2: "Mostly direct with few guiding questions",
            1: "Gives answers directly without guiding questions",
        },
    },
    "pedagogical_clarity": {
        "name": "Pedagogical Clarity",
        "description": "Explains concepts clearly at appropriate level",
        "weight": 0.20,
        "rubric": {
            5: "Crystal clear, perfectly calibrated to student level",
            4: "Very clear with minor calibration issues",
            3: "Generally clear but some concepts muddled",
            2: "Often confusing or poorly calibrated",
            1: "Unclear or inappropriate for student level",
        },
    },
    "scaffolding": {
        "name": "Scaffolding",
        "description": "Breaks complex problems into manageable steps",
        "weight": 0.20,
        "rubric": {
            5: "Excellent scaffolding, perfect problem decomposition",
            4: "Good scaffolding with minor gaps",
            3: "Adequate scaffolding but could be more granular",
            2: "Insufficient scaffolding, too many leaps",
            1: "No scaffolding, expects student to make large jumps",
        },
    },
    "encouragement": {
        "name": "Encouragement & Tone",
        "description": "Warm, encouraging, celebrates progress",
        "weight": 0.15,
        "rubric": {
            5: "Perfectly warm and encouraging, celebrates all progress",
            4: "Generally warm with consistent encouragement",
            3: "Neutral tone, occasional encouragement",
            2: "Cold or inconsistent, rarely encouraging",
            1: "Dismissive or discouraging",
        },
    },
    "accuracy": {
        "name": "Content Accuracy",
        "description": "Factually correct and educationally sound",
        "weight": 0.20,
        "rubric": {
            5: "Completely accurate, educationally excellent",
            4: "Accurate with very minor issues",
            3: "Mostly accurate, some minor errors",
            2: "Several accuracy issues",
            1: "Significant factual errors",
        },
    },
}


# ============================================
# EVALUATION CONFIG
# ============================================

@dataclass
class EvaluationConfig:
    """Configuration for model evaluation."""

    # Model paths
    model_path: str = "./outputs/merged"
    baseline_model: Optional[str] = "meta-llama/Llama-3.1-8B-Instruct"

    # Data
    eval_dataset_path: str = "./data/eval.jsonl"

    # Evaluation settings
    num_samples: int = 100  # Number of examples to evaluate
    max_new_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9

    # LLM-as-judge settings
    judge_model: str = "gpt-4"  # Model to use for evaluation
    judge_temperature: float = 0.0

    # Output
    output_dir: str = "./evaluation_results"


# ============================================
# TEST CASES
# ============================================

SOCRATIC_TEST_CASES = [
    {
        "context": "Student learning Python loops",
        "student_message": "How do for loops work in Python?",
        "expected_behavior": "Ask guiding question about iteration concept",
    },
    {
        "context": "Student stuck on algebra problem: 2x + 5 = 13",
        "student_message": "I don't know how to solve 2x + 5 = 13",
        "expected_behavior": "Guide student to isolate variable step by step",
    },
    {
        "context": "Student made an error in their code",
        "student_message": "Why isn't my code printing anything? print(Hello)",
        "expected_behavior": "Ask about string syntax without revealing answer",
    },
    {
        "context": "Student learning about photosynthesis",
        "student_message": "What is photosynthesis?",
        "expected_behavior": "Ask what student already knows about how plants get energy",
    },
    {
        "context": "Student frustrated with calculus",
        "student_message": "I give up, derivatives are impossible",
        "expected_behavior": "Acknowledge frustration, simplify concept, encourage",
    },
    {
        "context": "Student asking for homework answer",
        "student_message": "What's the answer to question 3?",
        "expected_behavior": "Redirect to understanding, not just answer",
    },
    {
        "context": "Student partially solved a problem",
        "student_message": "I got x = 4, is that right?",
        "expected_behavior": "Ask how they can verify, celebrate attempt",
    },
    {
        "context": "Student learning about World War 2",
        "student_message": "Why did World War 2 start?",
        "expected_behavior": "Ask about prior knowledge of events leading to war",
    },
]


# ============================================
# MODEL LOADING
# ============================================

def load_model(model_path: str, device: str = "auto") -> tuple:
    """Load model and tokenizer for evaluation."""
    logger.info(f"Loading model from: {model_path}")

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.bfloat16,
        device_map=device,
    )

    return model, tokenizer


def generate_response(
    model,
    tokenizer,
    system_prompt: str,
    user_message: str,
    max_new_tokens: int = 512,
    temperature: float = 0.7,
) -> str:
    """Generate a response from the model."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    return response.strip()


# ============================================
# LLM-AS-JUDGE EVALUATION
# ============================================

def create_judge_prompt(
    student_context: str,
    student_message: str,
    tutor_response: str,
    dimensions: Dict[str, Any],
) -> str:
    """Create prompt for LLM judge."""

    dimension_text = "\n".join([
        f"- {dim['name']}: {dim['description']}"
        for dim in dimensions.values()
    ])

    rubric_text = ""
    for key, dim in dimensions.items():
        rubric_text += f"\n{dim['name']}:\n"
        for score, desc in dim['rubric'].items():
            rubric_text += f"  {score}: {desc}\n"

    return f"""You are an expert educator evaluating an AI tutor's response.

CONTEXT:
{student_context}

STUDENT MESSAGE:
{student_message}

TUTOR RESPONSE:
{tutor_response}

EVALUATION DIMENSIONS:
{dimension_text}

SCORING RUBRIC:
{rubric_text}

Please evaluate the tutor response on each dimension (1-5 scale).
Respond in JSON format:

{{
    "socratic_method": <score>,
    "pedagogical_clarity": <score>,
    "scaffolding": <score>,
    "encouragement": <score>,
    "accuracy": <score>,
    "reasoning": "<brief explanation for scores>"
}}

Important: Use the rubric strictly. Be objective and critical."""


def evaluate_with_llm_judge(
    student_context: str,
    student_message: str,
    tutor_response: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Evaluate a response using an LLM as judge."""
    import openai

    client = openai.OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))

    prompt = create_judge_prompt(
        student_context,
        student_message,
        tutor_response,
        EVALUATION_DIMENSIONS,
    )

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    return result


# ============================================
# AUTOMATED CHECKS
# ============================================

def check_socratic_indicators(response: str) -> Dict[str, Any]:
    """Check for Socratic teaching indicators in response."""

    checks = {
        "contains_question": "?" in response,
        "avoids_direct_answer": True,  # Will be refined
        "uses_guiding_language": False,
        "encourages_thinking": False,
        "breaks_down_problem": False,
    }

    # Guiding language indicators
    guiding_phrases = [
        "what do you think",
        "can you tell me",
        "how might",
        "what if",
        "let's consider",
        "think about",
        "what would happen",
        "why do you think",
        "what do you already know",
        "can you try",
        "what's your understanding",
        "let's break this down",
    ]

    response_lower = response.lower()

    for phrase in guiding_phrases:
        if phrase in response_lower:
            checks["uses_guiding_language"] = True
            break

    # Check for encouragement
    encouragement_phrases = [
        "great", "good", "nice", "excellent", "well done",
        "you're on the right track", "that's a good start",
        "i like how", "keep going", "you've got this",
    ]

    for phrase in encouragement_phrases:
        if phrase in response_lower:
            checks["encourages_thinking"] = True
            break

    # Check for problem breakdown
    breakdown_indicators = [
        "first", "step", "let's start with",
        "begin by", "to start", "one way to approach",
    ]

    for phrase in breakdown_indicators:
        if phrase in response_lower:
            checks["breaks_down_problem"] = True
            break

    # Direct answer detection (negative)
    direct_answer_phrases = [
        "the answer is",
        "it equals",
        "the solution is",
        "here's the answer",
        "the result is",
    ]

    for phrase in direct_answer_phrases:
        if phrase in response_lower:
            checks["avoids_direct_answer"] = False
            break

    # Calculate score
    checks["automated_score"] = sum([
        checks["contains_question"] * 25,
        checks["avoids_direct_answer"] * 25,
        checks["uses_guiding_language"] * 20,
        checks["encourages_thinking"] * 15,
        checks["breaks_down_problem"] * 15,
    ]) / 100

    return checks


# ============================================
# FULL EVALUATION
# ============================================

def run_evaluation(config: EvaluationConfig) -> Dict[str, Any]:
    """Run full model evaluation."""

    results = {
        "config": config.__dict__,
        "timestamp": datetime.now().isoformat(),
        "model_scores": {},
        "baseline_scores": {},
        "test_cases": [],
        "summary": {},
    }

    # Load model
    model, tokenizer = load_model(config.model_path)

    # System prompt
    system_prompt = """You are Sage, a warm and insightful AI tutor created by Aptly Learning. Your teaching philosophy centers on the Socratic method - guiding students to discover knowledge through thoughtful questions rather than direct answers.

Core Teaching Principles:
1. NEVER give direct answers immediately - always start with a guiding question
2. Break complex problems into smaller, manageable pieces
3. Celebrate small wins and correct steps
4. When students struggle, provide increasingly specific hints
5. Connect new concepts to what students already know

Your Personality:
- Warm, patient, and encouraging
- Genuinely curious about the student's thought process
- Uses light humor when appropriate
- Celebrates effort, not just correct answers"""

    # Run test cases
    logger.info(f"Running {len(SOCRATIC_TEST_CASES)} test cases...")

    all_scores = {dim: [] for dim in EVALUATION_DIMENSIONS}

    for i, test_case in enumerate(SOCRATIC_TEST_CASES):
        logger.info(f"Test case {i+1}/{len(SOCRATIC_TEST_CASES)}")

        # Generate response
        response = generate_response(
            model,
            tokenizer,
            system_prompt,
            test_case["student_message"],
            max_new_tokens=config.max_new_tokens,
            temperature=config.temperature,
        )

        # Automated checks
        auto_checks = check_socratic_indicators(response)

        # LLM judge evaluation (if API key available)
        llm_scores = None
        if os.environ.get("OPENAI_API_KEY"):
            try:
                llm_scores = evaluate_with_llm_judge(
                    test_case["context"],
                    test_case["student_message"],
                    response,
                )

                for dim in EVALUATION_DIMENSIONS:
                    if dim in llm_scores:
                        all_scores[dim].append(llm_scores[dim])

            except Exception as e:
                logger.warning(f"LLM judge failed: {e}")

        results["test_cases"].append({
            "context": test_case["context"],
            "student_message": test_case["student_message"],
            "expected_behavior": test_case["expected_behavior"],
            "model_response": response,
            "automated_checks": auto_checks,
            "llm_scores": llm_scores,
        })

    # Calculate summary statistics
    for dim in EVALUATION_DIMENSIONS:
        if all_scores[dim]:
            results["model_scores"][dim] = {
                "mean": sum(all_scores[dim]) / len(all_scores[dim]),
                "min": min(all_scores[dim]),
                "max": max(all_scores[dim]),
            }

    # Overall weighted score
    if results["model_scores"]:
        weighted_sum = 0
        weight_sum = 0
        for dim, dim_config in EVALUATION_DIMENSIONS.items():
            if dim in results["model_scores"]:
                weighted_sum += results["model_scores"][dim]["mean"] * dim_config["weight"]
                weight_sum += dim_config["weight"]

        results["summary"]["overall_score"] = weighted_sum / weight_sum if weight_sum > 0 else 0
        results["summary"]["num_test_cases"] = len(SOCRATIC_TEST_CASES)

    # Automated checks summary
    auto_scores = [tc["automated_checks"]["automated_score"] for tc in results["test_cases"]]
    results["summary"]["automated_avg_score"] = sum(auto_scores) / len(auto_scores)

    # Save results
    output_dir = Path(config.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Results saved to: {output_file}")

    return results


def print_results(results: Dict[str, Any]):
    """Print evaluation results in a formatted way."""

    print("\n" + "=" * 60)
    print("SAGE TUTOR EVALUATION RESULTS")
    print("=" * 60)

    if results["model_scores"]:
        print("\n📊 Dimension Scores (1-5 scale):")
        print("-" * 40)
        for dim, scores in results["model_scores"].items():
            dim_name = EVALUATION_DIMENSIONS[dim]["name"]
            print(f"  {dim_name}: {scores['mean']:.2f} (range: {scores['min']}-{scores['max']})")

    print("\n📈 Summary:")
    print("-" * 40)
    if "overall_score" in results["summary"]:
        print(f"  Overall Score: {results['summary']['overall_score']:.2f}/5.0")
    print(f"  Automated Score: {results['summary']['automated_avg_score']:.2%}")
    print(f"  Test Cases: {results['summary']['num_test_cases']}")

    print("\n📝 Sample Responses:")
    print("-" * 40)
    for i, tc in enumerate(results["test_cases"][:3]):
        print(f"\n[Test {i+1}] {tc['context']}")
        print(f"Student: {tc['student_message']}")
        print(f"Sage: {tc['model_response'][:200]}...")
        print(f"Auto Score: {tc['automated_checks']['automated_score']:.2%}")

    print("\n" + "=" * 60)


# ============================================
# CLI
# ============================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate Sage Tutor Model")
    parser.add_argument("--model", type=str, required=True, help="Path to model")
    parser.add_argument("--output-dir", type=str, default="./evaluation_results")
    parser.add_argument("--num-samples", type=int, default=100)

    args = parser.parse_args()

    config = EvaluationConfig(
        model_path=args.model,
        output_dir=args.output_dir,
        num_samples=args.num_samples,
    )

    results = run_evaluation(config)
    print_results(results)


if __name__ == "__main__":
    main()
