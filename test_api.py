# import json
# import urllib.request

# url = "http://localhost:8000/generate"
# payload = {
#     "prompt": "Explain artificial intelligence in simple words.",
#     "watermark": True,
#     "max_tokens": 1000,
# }

# req = urllib.request.Request(
#     url,
#     data=json.dumps(payload).encode("utf-8"),
#     headers={"Content-Type": "application/json"},
# )

# print("Streaming response from LLM:\n")
# with urllib.request.urlopen(req) as response:
#     while True:
#         chunk = response.read(16)
#         if not chunk:
#             break
#         print(chunk.decode("utf-8", errors="ignore"), end="", flush=True)

# print("\n\n--- Done ---")

import json
import urllib.request


BASE_URL = "http://localhost:8000"

prompt = "Explain artificial intelligence in simple words."

payload = {
    "prompt": prompt,
    "watermark": True,
    "secret_key": "test123",
    "context_length": 4,
    "gamma": 2.0,
    "green_fraction": 0.5,
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 200,
}


# ---------------------------------------------------------
# 1. Generate watermarked text
# ---------------------------------------------------------

print("Generating...\n")

req = urllib.request.Request(
    f"{BASE_URL}/generate",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)

generation_id = None
generated_text = ""

with urllib.request.urlopen(req) as response:

    generation_id = response.headers.get("X-Generation-ID")

    while True:

        chunk = response.read(32)

        if not chunk:
            break

        text = chunk.decode(
            "utf-8",
            errors="ignore",
        )

        print(text, end="", flush=True)

        generated_text += text


print(f"\n\n--- Generation complete (Generation ID: {generation_id}) ---")


# ---------------------------------------------------------
# 2. Detect watermark (Token-Exact using preserved IDs)
# ---------------------------------------------------------

detect_payload = {
    "generation_id": generation_id,
    "prompt": prompt,
    "text": generated_text,
    "secret_key": payload["secret_key"],
    "context_length": payload["context_length"],
    "green_fraction": payload["green_fraction"],
}


detect_req = urllib.request.Request(
    f"{BASE_URL}/detect",
    data=json.dumps(detect_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)


with urllib.request.urlopen(detect_req) as response:

    result = json.loads(
        response.read().decode("utf-8")
    )


# ---------------------------------------------------------
# 3. Display statistics
# ---------------------------------------------------------

print("\n\n========== DETECTION RESULTS ==========")

print(
    "Mode:",
    "Token-exact (Preserved IDs)" if result.get("token_exact") else "Re-tokenized text",
)

print(
    "Total tokens:",
    result["total_tokens"],
)

print(
    "Green tokens:",
    result["green_tokens"],
)

print(
    "Red tokens:",
    result["red_tokens"],
)

print(
    "Green ratio:",
    f'{result["green_ratio"]:.2%}',
)

print(
    "Expected ratio:",
    f'{result["expected_ratio"]:.2%}',
)

print(
    "Z-score:",
    f'{result["z_score"]:.4f}',
)

print(
    "P-value:",
    f'{result["p_value"]:.6f}',
)

print(
    "Detection threshold:",
    result["detection_threshold"],
)

print(
    "Watermark detected:",
    result["detected"],
)


# ---------------------------------------------------------
# 4. Show first few token classifications
# ---------------------------------------------------------

print("\n========== TOKENS ==========")

for token in result["tokens"][:50]:

    print(
        f'{token["color"]:>5} | '
        f'{token["token"]!r}'
    )