import collections
import hashlib
import json
import os
import threading
import time
import uuid

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

# Limit PyTorch CPU threads to 2 to prevent thread contention during concurrent requests
if not torch.cuda.is_available():
    try:
        torch.set_num_threads(2)
    except Exception:
        pass

# In-memory response cache for instant replay (0% CPU cost on repeat or preset queries)
RESPONSE_CACHE: collections.OrderedDict[str, dict] = collections.OrderedDict()
MAX_RESPONSE_CACHE = 100


def get_cache_key(req: "GenerateRequest") -> str:
    components = [
        req.prompt.strip().lower(),
        str(req.watermark),
        req.secret_key.strip(),
        str(req.context_length),
        f"{req.gamma:.2f}",
        f"{req.green_fraction:.2f}",
    ]
    raw = "||".join(components)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


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


def warmup_presets():
    """Background worker that pre-warms the cache for the standard prompt presets."""
    preset_prompts = [
        "Explain artificial intelligence in simple words for a beginner.",
        "Write a short sci-fi story about astronomers detecting a mysterious repeating signal from deep space.",
        "Explain how statistical green-red watermarking works in large language models and why it resists tampering.",
        "Summarize the potential breakthroughs and challenges of quantum computing in the next decade.",
    ]
    time.sleep(2)  # brief pause to allow server to bind port first
    print("Starting background preset cache warmup...")
    for prompt_text in preset_prompts:
        for wm in [True, False]:
            try:
                dummy_req = GenerateRequest(
                    prompt=prompt_text,
                    watermark=wm,
                    secret_key="kanti-private-key-2026",
                    context_length=4,
                    gamma=2.0,
                    green_fraction=0.5,
                    max_tokens=90,
                    temperature=0.7,
                    top_p=0.9,
                    enable_thinking=False,
                )
                ckey = get_cache_key(dummy_req)
                if ckey in RESPONSE_CACHE:
                    continue

                messages = [{"role": "user", "content": prompt_text}]
                chat_kwargs = {
                    "tokenize": True,
                    "add_generation_prompt": True,
                    "return_tensors": "pt",
                    "return_dict": True,
                }
                if hasattr(tokenizer, "chat_template") and tokenizer.chat_template and "enable_thinking" in tokenizer.chat_template:
                    chat_kwargs["enable_thinking"] = False

                model_inputs = tokenizer.apply_chat_template(messages, **chat_kwargs).to(model.device)
                gen_kwargs = {
                    **model_inputs,
                    "max_new_tokens": 90,
                    "do_sample": True,
                    "temperature": 0.7,
                    "top_p": 0.9,
                }
                if wm:
                    proc = WatermarkLogitsProcessor(
                        secret_key="kanti-private-key-2026",
                        context_length=4,
                        gamma=2.0,
                        green_fraction=0.5,
                    )
                    gen_kwargs["logits_processor"] = LogitsProcessorList([proc])

                output_ids = model.generate(**gen_kwargs)
                prompt_len = model_inputs["input_ids"].shape[1]
                token_ids = output_ids[0, prompt_len:].tolist()
                chunks = [tokenizer.decode([tid]) for tid in token_ids]
                full_text = "".join(chunks)

                RESPONSE_CACHE[ckey] = {
                    "chunks": chunks,
                    "token_ids": token_ids,
                    "text": full_text,
                    "prompt": prompt_text,
                    "secret_key": "kanti-private-key-2026",
                    "context_length": 4,
                    "green_fraction": 0.5,
                    "enable_thinking": False,
                }
                print(f"Pre-warmed preset: '{prompt_text[:28]}...' (wm={wm}, tokens={len(token_ids)})")
            except Exception as e:
                print(f"Preset warmup error for {prompt_text[:20]}: {e}")
    print("Preset cache warmup complete! Presets will serve instantly with 0 CPU cost.")


threading.Thread(target=warmup_presets, daemon=True).start()


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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "LLM Watermarking API is running",
        "cached_entries": len(RESPONSE_CACHE),
    }


@app.post("/generate")
def generate(request: GenerateRequest):
    # Guardrail: clamp max_tokens between 10 and 200 to prevent CPU lockup
    request.max_tokens = min(max(request.max_tokens, 10), 200)

    cache_key = get_cache_key(request)

    # 1. CACHE HIT: Stream from memory at reading pace (0% CPU inference)
    if cache_key in RESPONSE_CACHE:
        cached = RESPONSE_CACHE[cache_key]
        generation_id = str(uuid.uuid4())

        # Register in generation_cache so detection verifies immediately with 0 ms latency
        generation_cache[generation_id] = {
            "token_ids": list(cached["token_ids"]),
            "prompt": request.prompt,
            "text": cached["text"],
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
            "X-Cache-Status": "HIT",
        }

        if request.stream_format == "sse":
            def sse_cached_stream():
                for chunk in cached["chunks"]:
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                    time.sleep(0.025)  # 25ms delay simulates smooth ~40 tok/s typing
                yield f"data: {json.dumps({'done': True, 'generation_id': generation_id, 'token_ids': cached['token_ids']})}\n\n"

            return StreamingResponse(
                sse_cached_stream(),
                media_type="text/event-stream",
                headers=headers,
            )

        def text_cached_stream():
            for chunk in cached["chunks"]:
                yield chunk
                time.sleep(0.025)

        return StreamingResponse(
            text_cached_stream(),
            media_type="text/plain",
            headers=headers,
        )

    # 2. CACHE MISS: Live Qwen3-0.6B generation
    messages = [
        {
            "role": "user",
            "content": request.prompt,
        }
    ]

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
        generation_kwargs["logits_processor"] = LogitsProcessorList([watermark_processor])

    generation_id = str(uuid.uuid4())
    generated_tokens_holder = []
    full_text_holder = []

    def generate_worker():
        output_ids = model.generate(**generation_kwargs)
        prompt_len = model_inputs["input_ids"].shape[1]
        gen_token_ids = output_ids[0, prompt_len:].tolist()
        generated_tokens_holder.extend(gen_token_ids)

    thread = threading.Thread(target=generate_worker)
    thread.start()

    def cache_generation():
        full_text = "".join(full_text_holder)
        # 1. Cache for detection lookup
        generation_cache[generation_id] = {
            "token_ids": list(generated_tokens_holder),
            "prompt": request.prompt,
            "text": full_text,
            "secret_key": request.secret_key,
            "context_length": request.context_length,
            "green_fraction": request.green_fraction,
            "enable_thinking": request.enable_thinking,
        }
        if len(generation_cache) > CACHE_MAX_SIZE:
            generation_cache.popitem(last=False)

        # 2. Cache response for future visitors
        RESPONSE_CACHE[cache_key] = {
            "chunks": list(full_text_holder),
            "token_ids": list(generated_tokens_holder),
            "text": full_text,
            "prompt": request.prompt,
            "secret_key": request.secret_key,
            "context_length": request.context_length,
            "green_fraction": request.green_fraction,
            "enable_thinking": request.enable_thinking,
        }
        if len(RESPONSE_CACHE) > MAX_RESPONSE_CACHE:
            RESPONSE_CACHE.popitem(last=False)

    headers = {
        "X-Generation-ID": generation_id,
        "Access-Control-Expose-Headers": "X-Generation-ID",
        "X-Cache-Status": "MISS",
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
        index_html = os.path.join(s_dir, "index.html")
        if os.path.isfile(index_html):
            from fastapi.responses import FileResponse

            @app.get("/", include_in_schema=False)
            def serve_root():
                return FileResponse(index_html)

        app.mount("/", StaticFiles(directory=s_dir, html=True), name="static")
        break