"""
anti_generative.py
==================
Task 2.3 — Strict Anti-Generative AI Rule Enforcement.

Provides a code-level guard that ensures ZERO generative AI (image synthesis,
inpainting, face hallucination, diffusion models, LLM-driven pixel generation)
is ever executed inside the ArtifyBharat CV Studio or NLP Cataloger pipeline.

The guard works in two complementary layers:

1. **Import-time scan** (``enforce_non_generative``):
   Inspects ``sys.modules`` for any banned generative library.  This catches
   accidental imports that happen to be present in the Python environment.

2. **Decorator** (``@non_generative``):
   Wraps a function so the import-time scan is re-executed on every call.
   Any violation raises ``NonGenerativeViolationError`` *before* the wrapped
   function body runs — guaranteeing the artisan's authentic craft asset is
   never touched by a generative model.

Usage::

    from app.core.anti_generative import non_generative

    class ComputerVisionService:
        @non_generative
        def enhance_image_with_detail(self, image_bytes: bytes) -> StudioPipelineResult:
            ...  # safe — will raise if a generative lib is imported

Policy statement (human-readable, also surfaced in API responses):
    "Zero Generative Hallucination • Authentic Weave Texture Preserved •
     Non-Synthetic Non-Generative AI Pipeline Only"
"""

from __future__ import annotations

import sys
import asyncio
import functools
import logging
from typing import Callable, FrozenSet

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Canonical banned-module registry
# Each entry is a Python top-level module (or dotted sub-module) whose mere
# *presence in sys.modules* is considered a policy violation when executing
# inside a non-generative pipeline function.
# ---------------------------------------------------------------------------
BANNED_GENERATIVE_MODULES: FrozenSet[str] = frozenset(
    {
        # ── OpenAI image generation / DALL-E ────────────────────────────────
        "openai",
        # ── Stability AI SDK ─────────────────────────────────────────────────
        "stability_sdk",
        "stability_sdk.client",
        # ── Hugging Face Diffusers (Stable Diffusion, ControlNet, …) ────────
        "diffusers",
        "diffusers.pipelines",
        # ── Replicate.com hosted generative models ───────────────────────────
        "replicate",
        # ── DeepAI image generation API ─────────────────────────────────────
        "deepai",
        # ── Midjourney unofficial clients ───────────────────────────────────
        "midjourney",
        # ── Clipdrop / Stability API wrappers ───────────────────────────────
        "clipdrop",
        # ── RunwayML ────────────────────────────────────────────────────────
        "runway",
        # ── Ideogram / Adobe Firefly unofficial clients ──────────────────────
        "ideogram",
        # ── Vertex AI image generation (Imagen) ─────────────────────────────
        # Note: "google.cloud.aiplatform" alone is NOT banned — it is used for
        # non-generative Vision AI.  Only the imagen sub-path is banned.
        "vertexai.preview.vision_models",
        # ── Anthropic Claude image generation (if ever released) ────────────
        # Standard text use of anthropic is also flagged to be safe.
        "anthropic",
    }
)

# Human-readable policy statement embedded in every API response.
AUTHENTICITY_GUARANTEE: str = (
    "Zero Generative Hallucination • Authentic Weave Texture Preserved • "
    "Non-Synthetic Non-Generative AI Pipeline Only"
)


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------


class NonGenerativeViolationError(RuntimeError):
    """
    Raised when a banned generative-AI library is detected inside a function
    decorated with ``@non_generative``.

    Attributes
    ----------
    violations:
        Frozenset of the specific banned module name(s) that were found.
    """

    def __init__(self, violations: FrozenSet[str]) -> None:
        self.violations = violations
        module_list = ", ".join(sorted(violations))
        super().__init__(
            f"[Task 2.3 — Anti-Generative Violation] "
            f"Banned generative module(s) detected in sys.modules: [{module_list}]. "
            f"The ArtifyBharat CV Studio and NLP Cataloger pipelines are strictly "
            f"non-generative. No pixel synthesis, inpainting, diffusion, or face "
            f"hallucination is permitted. Remove the offending import(s) and retry."
        )


# ---------------------------------------------------------------------------
# Core enforcement function
# ---------------------------------------------------------------------------


def enforce_non_generative(
    banned: FrozenSet[str] | None = None,
) -> None:
    """
    Scans ``sys.modules`` for any banned generative library.

    Parameters
    ----------
    banned:
        Set of banned module names.  Defaults to the module-level
        ``BANNED_GENERATIVE_MODULES`` frozenset, read at *call time* so that
        ``unittest.mock.patch`` can override it in tests.

    Raises
    ------
    NonGenerativeViolationError
        If one or more banned modules are found in ``sys.modules``.

    Notes
    -----
    This is a *necessary but not sufficient* check.  It catches cases where a
    generative library has been imported anywhere in the running process.
    It does *not* catch dynamic imports that happen exclusively inside the
    wrapped function after the check runs; however, combined with code review
    and CI import-scanning, it provides robust defence-in-depth.
    """
    # Read the live module-level set if no override provided.
    # This allows unittest.mock.patch to swap BANNED_GENERATIVE_MODULES in tests.
    effective_banned: FrozenSet[str] = BANNED_GENERATIVE_MODULES if banned is None else banned

    loaded = frozenset(sys.modules.keys())
    # Match exact module name OR any sub-module (e.g. "diffusers.pipelines.*")
    violations: FrozenSet[str] = frozenset(
        banned_name
        for banned_name in effective_banned
        if any(
            loaded_mod == banned_name or loaded_mod.startswith(banned_name + ".")
            for loaded_mod in loaded
        )
    )
    if violations:
        raise NonGenerativeViolationError(violations)

    logger.debug(
        "[anti_generative] enforce_non_generative: PASS — no banned modules detected."
    )


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------


def non_generative(func: Callable) -> Callable:
    """
    Decorator that enforces the non-generative pipeline rule on every call.

    Apply this to every method in ``ComputerVisionService`` and
    ``MultilingualNLPService`` that processes artisan media assets.

    Example::

        @non_generative
        def enhance_image_with_detail(self, image_bytes: bytes) -> StudioPipelineResult:
            ...

    The check runs *synchronously before* the function body.  For async
    functions the check still runs synchronously at call time (before the
    coroutine is awaited), which is sufficient to catch banned imports.
    """

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        enforce_non_generative()
        return func(*args, **kwargs)

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        enforce_non_generative()
        return await func(*args, **kwargs)

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
