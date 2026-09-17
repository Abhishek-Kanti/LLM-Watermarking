import hashlib

import torch
from transformers import LogitsProcessor


def generate_seed(
    secret_key: str,
    context_tokens: list[int],
) -> int:
    """
    Generate a deterministic seed from:
        secret key + token context
    """

    context_string = ",".join(map(str, context_tokens))

    seed_input = f"{secret_key}:{context_string}"

    hash_bytes = hashlib.sha256(
        seed_input.encode("utf-8")
    ).digest()

    # Convert first 8 bytes into an integer
    return int.from_bytes(hash_bytes[:8], "big")


def get_green_mask(
    vocab_size: int,
    secret_key: str,
    context_tokens: list[int],
    green_fraction: float,
    device: torch.device,
) -> torch.Tensor:
    """
    Reconstruct the deterministic green/red partition
    for a particular token context.
    """

    seed = generate_seed(
        secret_key,
        context_tokens,
    )

    generator = torch.Generator(device=device)
    generator.manual_seed(seed)

    random_values = torch.rand(
        vocab_size,
        generator=generator,
        device=device,
    )

    green_mask = random_values < green_fraction

    return green_mask


class WatermarkLogitsProcessor(LogitsProcessor):
    """
    Applies the watermark during generation.

    Green tokens receive a logit bonus of gamma.
    Red tokens remain unchanged.
    """

    def __init__(
        self,
        secret_key: str,
        context_length: int = 4,
        gamma: float = 2.0,
        green_fraction: float = 0.5,
    ):
        self.secret_key = secret_key
        self.context_length = context_length
        self.gamma = gamma
        self.green_fraction = green_fraction

    def __call__(
        self,
        input_ids: torch.LongTensor,
        scores: torch.FloatTensor,
    ) -> torch.FloatTensor:

        # Get the most recent N tokens
        context_tokens = input_ids[
            0,
            -self.context_length:
        ].tolist()

        green_mask = get_green_mask(
            vocab_size=scores.shape[-1],
            secret_key=self.secret_key,
            context_tokens=context_tokens,
            green_fraction=self.green_fraction,
            device=scores.device,
        )

        # Increase probability of green tokens
        scores[:, green_mask] += self.gamma

        return scores