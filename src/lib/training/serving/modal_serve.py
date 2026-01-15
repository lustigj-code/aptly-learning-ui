"""
Model Serving Infrastructure for Sage Tutor

Serves the fine-tuned Sage tutor model using Modal with vLLM
for high-performance inference.

Features:
- vLLM for fast inference with continuous batching
- Auto-scaling based on load
- Health checks and monitoring
- A/B testing support with model variants

Usage:
    # Deploy the model
    modal deploy modal_serve.py

    # Call the endpoint
    curl -X POST https://your-username--sage-tutor-serve.modal.run/generate \
      -H "Content-Type: application/json" \
      -d '{"messages": [{"role": "user", "content": "Help me understand derivatives"}]}'
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import modal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# MODAL APP CONFIGURATION
# ============================================

app = modal.App("sage-tutor-serve")

# Model serving image with Transformers + bitsandbytes (for 4-bit quantized models)
serving_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "torch>=2.1.0",
        "transformers>=4.40.0",
        "accelerate>=0.27.0",
        "bitsandbytes>=0.42.0",
        "fastapi>=0.109.0",
        "uvicorn>=0.27.0",
        "pydantic>=2.5.0",
        "huggingface_hub>=0.22.0",
        "scipy",
    )
)

# Volume for model weights
model_volume = modal.Volume.from_name("sage-model-weights", create_if_missing=True)

# GPU configuration
GPU_CONFIG = "A10G"  # A10G is cost-effective for inference


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
# REQUEST/RESPONSE MODELS
# ============================================

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    messages: List[Message]
    max_tokens: int = Field(default=512, le=2048)
    temperature: float = Field(default=0.7, ge=0, le=2)
    top_p: float = Field(default=0.9, ge=0, le=1)
    model_variant: Optional[str] = None  # For A/B testing


class GenerateResponse(BaseModel):
    content: str
    model: str
    usage: Dict[str, int]
    latency_ms: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    uptime_seconds: float


# ============================================
# MODEL SERVER
# ============================================

@app.cls(
    image=serving_image,
    gpu=GPU_CONFIG,
    scaledown_window=300,  # Keep warm for 5 minutes
    volumes={"/models": model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class SageTutorServer:
    """
    Serving for Sage tutor model using Transformers.

    Supports 4-bit quantized models via bitsandbytes.
    """

    @modal.enter()
    def load_model(self):
        """Load the model when container starts."""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        self.start_time = datetime.now()

        # Determine which model to load
        model_path = os.environ.get("SAGE_MODEL_PATH", "/models/sage-tutor-v1")

        # Check if we have a local model
        if os.path.exists(model_path):
            logger.info(f"Loading model from: {model_path}")
            self.model_name = model_path
        else:
            # Fall back to base model
            self.model_name = "meta-llama/Llama-3.1-8B-Instruct"
            logger.info(f"Local model not found, using: {self.model_name}")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # Load model - it will auto-detect 4-bit quantization from config
        logger.info("Loading model (this may take a minute)...")
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True,
        )
        self.model.eval()

        logger.info("Model loaded successfully!")

    @modal.method()
    def generate(self, request: GenerateRequest) -> GenerateResponse:
        """Generate a response from the model."""
        import torch
        import time

        start_time = time.time()

        # Build messages with system prompt
        messages = [{"role": "system", "content": SAGE_SYSTEM_PROMPT}]
        messages.extend([m.model_dump() for m in request.messages])

        # Apply chat template
        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        prompt_tokens = inputs.input_ids.shape[1]

        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                do_sample=request.temperature > 0,
                pad_token_id=self.tokenizer.pad_token_id,
            )

        # Decode only the new tokens
        generated_text = self.tokenizer.decode(
            outputs[0][prompt_tokens:],
            skip_special_tokens=True
        )

        latency_ms = (time.time() - start_time) * 1000
        completion_tokens = outputs[0].shape[0] - prompt_tokens

        return GenerateResponse(
            content=generated_text,
            model=self.model_name,
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            },
            latency_ms=latency_ms,
        )

    @modal.method()
    def health(self) -> HealthResponse:
        """Health check endpoint."""
        uptime = (datetime.now() - self.start_time).total_seconds()

        return HealthResponse(
            status="healthy",
            model_loaded=hasattr(self, 'llm'),
            model_name=getattr(self, 'model_name', 'not_loaded'),
            uptime_seconds=uptime,
        )


# ============================================
# WEB ENDPOINTS
# ============================================

@app.function(image=serving_image)
@modal.web_endpoint(method="POST", docs=True)
def generate(request: GenerateRequest) -> GenerateResponse:
    """
    Generate a tutoring response.

    Example:
        curl -X POST https://your-username--sage-tutor-serve-generate.modal.run \
          -H "Content-Type: application/json" \
          -d '{
            "messages": [
              {"role": "user", "content": "How do I solve 2x + 5 = 13?"}
            ]
          }'
    """
    server = SageTutorServer()
    return server.generate.remote(request)


@app.function(image=serving_image)
@modal.web_endpoint(method="GET", docs=True)
def health() -> HealthResponse:
    """Health check endpoint."""
    server = SageTutorServer()
    return server.health.remote()


# ============================================
# STREAMING ENDPOINT
# ============================================

@app.function(
    image=serving_image,
    gpu=GPU_CONFIG,
    container_idle_timeout=300,
    volumes={"/models": model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def generate_stream(
    messages: List[Dict[str, str]],
    max_tokens: int = 512,
    temperature: float = 0.7,
):
    """
    Streaming generation for real-time responses.

    Yields tokens as they're generated for a better UX.
    """
    from vllm import LLM, SamplingParams
    from transformers import AutoTokenizer

    model_path = os.environ.get("SAGE_MODEL_PATH", "/models/sage-tutor-v1")
    model_name = model_path if os.path.exists(model_path) else "meta-llama/Llama-3.1-8B-Instruct"

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Build prompt
    full_messages = [{"role": "system", "content": SAGE_SYSTEM_PROMPT}]
    full_messages.extend(messages)

    prompt = tokenizer.apply_chat_template(
        full_messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    llm = LLM(
        model=model_name,
        tensor_parallel_size=1,
        gpu_memory_utilization=0.9,
    )

    sampling_params = SamplingParams(
        max_tokens=max_tokens,
        temperature=temperature,
    )

    # Generate with streaming
    for output in llm.generate([prompt], sampling_params, use_tqdm=False):
        for token in output.outputs[0].token_ids:
            text = tokenizer.decode([token])
            yield text


# ============================================
# MODEL MANAGEMENT
# ============================================

@app.function(
    image=serving_image,
    volumes={"/models": model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=3600,
)
def upload_model(model_path: str, target_name: str = "sage-tutor-v1"):
    """
    Upload a trained model to the serving volume.

    Args:
        model_path: Local path or HuggingFace repo ID
        target_name: Name to use in the volume
    """
    from huggingface_hub import snapshot_download
    import shutil

    target_path = f"/models/{target_name}"

    if model_path.startswith("/") or model_path.startswith("./"):
        # Local path - copy
        shutil.copytree(model_path, target_path, dirs_exist_ok=True)
    else:
        # HuggingFace repo - download
        snapshot_download(
            repo_id=model_path,
            local_dir=target_path,
            local_dir_use_symlinks=False,
        )

    model_volume.commit()
    logger.info(f"Model uploaded to: {target_path}")

    return {"status": "uploaded", "path": target_path}


@app.function(
    image=serving_image,
    volumes={"/models": model_volume},
)
def list_models() -> List[Dict[str, Any]]:
    """List available models in the serving volume."""
    import os

    models = []
    for name in os.listdir("/models"):
        path = f"/models/{name}"
        if os.path.isdir(path):
            # Check for model files
            files = os.listdir(path)
            has_weights = any(f.endswith(".safetensors") or f.endswith(".bin") for f in files)
            has_config = "config.json" in files

            models.append({
                "name": name,
                "path": path,
                "has_weights": has_weights,
                "has_config": has_config,
                "files": files[:10],  # First 10 files
            })

    return models


# ============================================
# A/B TESTING SUPPORT
# ============================================

@app.function(
    image=serving_image,
    gpu=GPU_CONFIG,
    volumes={"/models": model_volume},
)
def generate_ab_test(
    messages: List[Dict[str, str]],
    variant: str,
    max_tokens: int = 512,
) -> Dict[str, Any]:
    """
    Generate response for A/B testing with specific model variant.

    Variants:
    - "control": Base Llama model with prompting
    - "sft": Supervised fine-tuned model
    - "rlhf": RLHF-aligned model
    """
    from vllm import LLM, SamplingParams
    from transformers import AutoTokenizer
    import time

    # Model mapping
    variant_models = {
        "control": "meta-llama/Llama-3.1-8B-Instruct",
        "sft": "/models/sage-tutor-sft",
        "rlhf": "/models/sage-tutor-rlhf",
    }

    model_name = variant_models.get(variant, variant_models["control"])

    # Check if variant exists
    if model_name.startswith("/models") and not os.path.exists(model_name):
        model_name = variant_models["control"]
        variant = "control_fallback"

    start_time = time.time()

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Build prompt
    full_messages = [{"role": "system", "content": SAGE_SYSTEM_PROMPT}]
    full_messages.extend(messages)

    prompt = tokenizer.apply_chat_template(
        full_messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    llm = LLM(
        model=model_name,
        tensor_parallel_size=1,
        gpu_memory_utilization=0.9,
    )

    sampling_params = SamplingParams(
        max_tokens=max_tokens,
        temperature=0.7,
    )

    outputs = llm.generate([prompt], sampling_params)
    generated_text = outputs[0].outputs[0].text

    latency_ms = (time.time() - start_time) * 1000

    return {
        "content": generated_text,
        "variant": variant,
        "model": model_name,
        "latency_ms": latency_ms,
    }


# ============================================
# CLI ENTRYPOINT
# ============================================

@app.local_entrypoint()
def main(
    action: str = "serve",
    model: str = None,
    target: str = "sage-tutor-v1",
):
    """
    Sage Tutor Model Serving CLI

    Actions:
        serve: Start the serving endpoint (default)
        upload: Upload a model to the serving volume
        list: List available models

    Examples:
        # Deploy serving endpoint
        modal deploy modal_serve.py

        # Upload a model
        modal run modal_serve.py --action upload --model ./outputs/merged

        # List models
        modal run modal_serve.py --action list
    """
    if action == "upload" and model:
        result = upload_model.remote(model, target)
        print(f"✅ Model uploaded: {result}")

    elif action == "list":
        models = list_models.remote()
        print("\n📁 Available Models:")
        for m in models:
            status = "✅" if m["has_weights"] else "⚠️"
            print(f"  {status} {m['name']}")
            print(f"     Path: {m['path']}")
            if m["files"]:
                print(f"     Files: {', '.join(m['files'][:5])}...")

    else:
        print("To deploy, run: modal deploy modal_serve.py")
        print("The endpoint will be available at: https://your-username--sage-tutor-serve-generate.modal.run")
