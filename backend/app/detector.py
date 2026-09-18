import math

import torch

from .watermark import get_green_mask


def normal_survival_function(z: float) -> float:
    """
    Calculate the upper-tail probability of a standard normal
    distribution.

    This gives us the probability of observing a z-score this
    large or larger under the null hypothesis.
    """

    return 0.5 * math.erfc(z / math.sqrt(2))


def detect_watermark(
    prompt: str,
    tokenizer,
    secret_key: str,
    context_length: int,
    green_fraction: float,
    vocab_size: int | None = None,
    text: str | None = None,
    token_ids: list[int] | None = None,
    enable_thinking: bool = False,
    detection_threshold: float = 3.0,
):
    """
    Detect a watermark in generated text.

    The prompt is converted using the same chat template used
    during generation so that the detector reconstructs the
    same token context.

    Returns:
        - token-level green/red classification
        - green/red counts
        - green ratio
        - expected ratio
        - z-score
        - p-value
        - detection decision
    """

    # ---------------------------------------------------------
    # 1. Reconstruct the exact prompt token sequence
    # ---------------------------------------------------------

    messages = [
        {
            "role": "user",
            "content": prompt,
        }
    ]

    chat_template_kwargs = {
        "tokenize": True,
        "add_generation_prompt": True,
    }
    # If the tokenizer's chat_template supports enable_thinking, pass it
    if hasattr(tokenizer, "chat_template") and tokenizer.chat_template and "enable_thinking" in tokenizer.chat_template:
        chat_template_kwargs["enable_thinking"] = enable_thinking

    prompt_output = tokenizer.apply_chat_template(
        messages,
        **chat_template_kwargs,
    )

    # Extract raw token ID list from BatchEncoding, Tensor, or list
    if hasattr(prompt_output, "input_ids"):
        prompt_ids = prompt_output.input_ids
    elif isinstance(prompt_output, dict) and "input_ids" in prompt_output:
        prompt_ids = prompt_output["input_ids"]
    else:
        prompt_ids = prompt_output

    if isinstance(prompt_ids, torch.Tensor):
        prompt_ids = prompt_ids.squeeze().tolist()
    elif isinstance(prompt_ids, list) and prompt_ids and isinstance(prompt_ids[0], list):
        prompt_ids = prompt_ids[0]

    # ---------------------------------------------------------
    # 2. Extract generated tokens (Token-Exact or Tokenize Text)
    # ---------------------------------------------------------

    token_exact = token_ids is not None

    if token_ids is not None:
        generated_ids = list(token_ids)
    elif text is not None:
        generated_ids = tokenizer.encode(
            text,
            add_special_tokens=False,
        )
    else:
        raise ValueError("Either 'token_ids' or 'text' must be provided for detection.")

    total_tokens = len(generated_ids)

    if total_tokens == 0:
        return {
            "tokens": [],
            "total_tokens": 0,
            "green_tokens": 0,
            "red_tokens": 0,
            "green_ratio": 0.0,
            "expected_ratio": green_fraction,
            "z_score": 0.0,
            "p_value": 1.0,
            "detection_threshold": 4.0,
            "detected": False,
            "token_exact": token_exact,
        }

    # ---------------------------------------------------------
    # 3. Combine prompt + generated tokens
    # ---------------------------------------------------------

    all_ids = prompt_ids + generated_ids

    prompt_length = len(prompt_ids)

    token_results = []

    green_count = 0

    effective_vocab_size = vocab_size or getattr(tokenizer, "vocab_size", len(tokenizer))
    effective_vocab_size = max(effective_vocab_size, len(tokenizer))

    # ---------------------------------------------------------
    # 4. Reconstruct the green/red decision for every
    #    generated token
    # ---------------------------------------------------------

    for generated_index, token_id in enumerate(generated_ids):

        # Position of this generated token in the complete
        # prompt + generated sequence.
        position = prompt_length + generated_index

        # Get the preceding context.
        context_start = max(
            0,
            position - context_length,
        )

        context_tokens = all_ids[
            context_start:position
        ]

        # Recreate the exact green list used by the watermark
        # processor.
        green_mask = get_green_mask(
            vocab_size=effective_vocab_size,
            secret_key=secret_key,
            context_tokens=context_tokens,
            green_fraction=green_fraction,
            device=torch.device("cpu"),
        )

        is_green = (
            bool(green_mask[token_id].item())
            if token_id < effective_vocab_size
            else False
        )

        if is_green:
            green_count += 1

        # Decode this individual token.
        token_text = tokenizer.decode(
            [token_id],
            skip_special_tokens=True,
        )

        token_results.append(
            {
                "token_id": token_id,
                "token": token_text,
                "color": "green" if is_green else "red",
            }
        )

    # ---------------------------------------------------------
    # 5. Basic statistics
    # ---------------------------------------------------------

    red_count = total_tokens - green_count

    green_ratio = green_count / total_tokens

    expected_green = (
        total_tokens * green_fraction
    )

    # ---------------------------------------------------------
    # 6. Z-score
    # ---------------------------------------------------------

    variance = (
        total_tokens
        * green_fraction
        * (1 - green_fraction)
    )

    standard_deviation = math.sqrt(variance)

    if standard_deviation > 0:

        z_score = (
            green_count - expected_green
        ) / standard_deviation

    else:

        z_score = 0.0

    # ---------------------------------------------------------
    # 7. P-value
    # ---------------------------------------------------------

    p_value = normal_survival_function(
        z_score
    )

    # ---------------------------------------------------------
    # 8. Detection decision
    # ---------------------------------------------------------

    detected = (
        z_score >= detection_threshold
    )

    # ---------------------------------------------------------
    # 9. Return results
    # ---------------------------------------------------------

    return {
        "tokens": token_results,

        "total_tokens": total_tokens,

        "green_tokens": green_count,

        "red_tokens": red_count,

        "green_ratio": green_ratio,

        "expected_ratio": green_fraction,

        "z_score": z_score,

        "p_value": p_value,

        "detection_threshold": detection_threshold,

        "detected": detected,

        "token_exact": token_exact,
    }