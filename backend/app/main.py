import collections
import json
import threading
import uuid

import os
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    LogitsProcessorList,
    TextIteratorStreamer,
)

from .detector import detect_watermark
from .watermark import WatermarkLogitsProcessor


# In-memory LRU cache to preserve generated token IDs for token-exact detection
generation_cache: collections.OrderedDict[str, dict] = collections.OrderedDict()
CACHE_MAX_SIZE = 100


MODEL_NAME = "Qwen/Qwen3-0.6B"

app = FastAPI(title="LLM Watermarking Playground")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Generation-ID"],
)


print("Loading model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype="auto",
    device_map="auto",
)

print("Model loaded!")


class GenerateRequest(BaseModel):
    prompt: str

    watermark: bool = False
    secret_key: str = "default-secret"

    context_length: int = 4
    gamma: float = 2.0
    green_fraction: float = 0.5

    temperature: float = 0.7
    top_p: float = 0.9

    max_tokens: int = 100
    stream_format: str = "text"  # "text" (default) or "sse"
    enable_thinking: bool = False


class DetectRequest(BaseModel):
    prompt: str
    text: str | None = None
    token_ids: list[int] | None = None
    generation_id: str | None = None

    secret_key: str = "default-secret"

    context_length: int = 4
    green_fraction: float = 0.5
    enable_thinking: bool = False
    detection_threshold: float = 3.0


@app.get("/")
def root():
    return {
        "message": "LLM Watermarking API is running"
    }


@app.post("/generate")
def generate(request: GenerateRequest):

    # Convert the user's prompt into a Qwen chat conversation.
    messages = [
        {
            "role": "user",
            "content": request.prompt,
        }
    ]

    # Qwen's chat template converts the conversation into
    # the exact token sequence expected by the model.
    chat_template_kwargs = {
        "tokenize": True,
        "add_generation_prompt": True,
        "return_tensors": "pt",
        "return_dict": True,
    }
    if hasattr(tokenizer, "chat_template") and tokenizer.chat_template and "enable_thinking" in tokenizer.chat_template:
        chat_template_kwargs["enable_thinking"] = request.enable_thinking

    model_inputs = tokenizer.apply_chat_template(
        messages,
        **chat_template_kwargs,
    ).to(model.device)

    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )

    generation_kwargs = {
        **model_inputs,
        "streamer": streamer,
        "max_new_tokens": request.max_tokens,
        "do_sample": True,
        "temperature": request.temperature,
        "top_p": request.top_p,
    }

    if request.watermark:

        watermark_processor = WatermarkLogitsProcessor(
            secret_key=request.secret_key,
            context_length=request.context_length,
            gamma=request.gamma,
            green_fraction=request.green_fraction,
        )

        generation_kwargs["logits_processor"] = LogitsProcessorList(
            [watermark_processor]
        )

    generation_id = str(uuid.uuid4())
    generated_tokens_holder = []
    full_text_holder = []

    def generate_worker():
        output_ids = model.generate(**generation_kwargs)
        prompt_len = model_inputs["input_ids"].shape[1]
        gen_token_ids = output_ids[0, prompt_len:].tolist()
        generated_tokens_holder.extend(gen_token_ids)

    thread = threading.Thread(
        target=generate_worker,
    )

    thread.start()

    def cache_generation():
        generation_cache[generation_id] = {
            "token_ids": list(generated_tokens_holder),
            "prompt": request.prompt,
            "text": "".join(full_text_holder),
            "secret_key": request.secret_key,
            "context_length": request.context_length,
            "green_fraction": request.green_fraction,
            "enable_thinking": request.enable_thinking,
        }
        if len(generation_cache) > CACHE_MAX_SIZE:
            generation_cache.popitem(last=False)

    headers = {
        "X-Generation-ID": generation_id,
        "Access-Control-Expose-Headers": "X-Generation-ID",
    }

    if request.stream_format == "sse":

        def sse_stream():
            for text in streamer:
                full_text_holder.append(text)
                yield f"data: {json.dumps({'text': text})}\n\n"

            thread.join()
            cache_generation()

            yield f"data: {json.dumps({'done': True, 'generation_id': generation_id, 'token_ids': generated_tokens_holder})}\n\n"

        return StreamingResponse(
            sse_stream(),
            media_type="text/event-stream",
            headers=headers,
        )

    def text_stream():

        for text in streamer:
            full_text_holder.append(text)
            yield text

        thread.join()
        cache_generation()

    return StreamingResponse(
        text_stream(),
        media_type="text/plain",
        headers=headers,
    )


@app.post("/detect")
def detect(request: DetectRequest):

    token_ids = request.token_ids
    enable_thinking = request.enable_thinking

    # If generation_id is provided, retrieve the preserved token IDs
    if not token_ids and request.generation_id:
        cached = generation_cache.get(request.generation_id)
        if not cached:
            raise HTTPException(
                status_code=404,
                detail=f"Generation ID '{request.generation_id}' not found in cache.",
            )
        token_ids = cached["token_ids"]
        if not request.prompt and cached.get("prompt"):
            request.prompt = cached["prompt"]
        if "enable_thinking" in cached:
            enable_thinking = cached["enable_thinking"]

    result = detect_watermark(
        prompt=request.prompt,
        text=request.text,
        token_ids=token_ids,
        tokenizer=tokenizer,
        vocab_size=model.config.vocab_size,
        secret_key=request.secret_key,
        context_length=request.context_length,
        green_fraction=request.green_fraction,
        enable_thinking=enable_thinking,
        detection_threshold=request.detection_threshold,
    )

    if request.generation_id:
        result["generation_id"] = request.generation_id

    return result


@app.get("/generations/{generation_id}")
def get_generation(generation_id: str):
    if generation_id not in generation_cache:
        raise HTTPException(
            status_code=404,
            detail=f"Generation ID '{generation_id}' not found in cache.",
        )
    return generation_cache[generation_id]


# Mount compiled frontend static assets if available (Production / Unified Container)
STATIC_DIRS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.abspath("dist"),
]

for s_dir in STATIC_DIRS:
    if os.path.isdir(s_dir):
        print(f"Mounting static frontend files from: {s_dir}")
        app.mount("/", StaticFiles(directory=s_dir, html=True), name="static")
        break