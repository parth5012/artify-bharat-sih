"""
test_anti_generative.py
=======================
Task 2.3 — Test suite for the strict anti-generative AI enforcement layer.

Covers:
- enforce_non_generative() passes when no banned modules are loaded
- enforce_non_generative() raises NonGenerativeViolationError when a banned module
  is injected into sys.modules
- @non_generative decorator blocks sync functions when a violation is present
- @non_generative decorator blocks async functions when a violation is present
- @non_generative decorator transparently passes through when no violation
- cv_service pipeline methods carry the @non_generative guard
- nlp_service pipeline methods carry the @non_generative guard
- BANNED_GENERATIVE_MODULES contains all expected key offenders
- AUTHENTICITY_GUARANTEE text matches the canonical policy string
"""

import sys
import pytest
import asyncio
from unittest.mock import patch

from app.core.anti_generative import (
    BANNED_GENERATIVE_MODULES,
    AUTHENTICITY_GUARANTEE,
    NonGenerativeViolationError,
    enforce_non_generative,
    non_generative,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_MODULE_NAME = "_fake_banned_generative_test_module"


def _inject_banned_module(name: str = FAKE_MODULE_NAME):
    """Context manager: temporarily adds a fake module to sys.modules."""
    import types
    from contextlib import contextmanager

    @contextmanager
    def _ctx():
        fake = types.ModuleType(name)
        sys.modules[name] = fake
        try:
            yield
        finally:
            sys.modules.pop(name, None)

    return _ctx()


# ---------------------------------------------------------------------------
# Unit tests: enforce_non_generative()
# ---------------------------------------------------------------------------


def test_enforce_passes_with_no_banned_modules():
    """Should not raise when no banned modules are in sys.modules."""
    custom_banned = frozenset({FAKE_MODULE_NAME})
    # FAKE_MODULE_NAME is not loaded — should pass silently
    enforce_non_generative(banned=custom_banned)


def test_enforce_raises_on_banned_module():
    """Should raise NonGenerativeViolationError when banned module is injected."""
    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with pytest.raises(NonGenerativeViolationError) as exc_info:
            enforce_non_generative(banned=custom_banned)
    assert FAKE_MODULE_NAME in str(exc_info.value)
    assert "Task 2.3" in str(exc_info.value)


def test_enforce_violation_error_carries_violations_set():
    """NonGenerativeViolationError.violations must be a frozenset with the guilty name."""
    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with pytest.raises(NonGenerativeViolationError) as exc_info:
            enforce_non_generative(banned=custom_banned)
    assert isinstance(exc_info.value.violations, frozenset)
    assert FAKE_MODULE_NAME in exc_info.value.violations


def test_enforce_detects_sub_module_of_banned():
    """
    A sub-module of a banned package (e.g. 'diffusers.pipelines.stable_diffusion')
    must also trigger a violation even if only the parent name is in the banned set.
    """
    sub = "diffusers.pipelines.stable_diffusion"
    # Ensure diffusers itself is not loaded (it shouldn't be in test env)
    with _inject_banned_module(sub):
        with pytest.raises(NonGenerativeViolationError) as exc_info:
            # use the real banned set which includes "diffusers"
            enforce_non_generative()
    assert "diffusers" in exc_info.value.violations


# ---------------------------------------------------------------------------
# Unit tests: @non_generative decorator — sync
# ---------------------------------------------------------------------------


def test_non_generative_decorator_sync_passes():
    """Decorated sync function should execute normally with no banned modules."""
    import app.core.anti_generative as ag_module
    custom_banned = frozenset({FAKE_MODULE_NAME})

    @non_generative
    def safe_function(x: int) -> int:
        return x * 2

    # Patch with patch.object so the live module attribute is replaced
    with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
        result = safe_function(21)
    assert result == 42


def test_non_generative_decorator_sync_blocks_on_violation():
    """Decorated sync function must raise before executing its body."""
    import app.core.anti_generative as ag_module
    custom_banned = frozenset({FAKE_MODULE_NAME})
    call_log = []

    @non_generative
    def unsafe_function():
        call_log.append("body_executed")

    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                unsafe_function()

    # Body must NOT have been reached
    assert call_log == [], "Function body executed despite generative violation — enforcement failed!"


def test_non_generative_decorator_preserves_function_name():
    """@non_generative must use functools.wraps so __name__ is preserved."""
    @non_generative
    def my_special_function():
        pass

    assert my_special_function.__name__ == "my_special_function"


# ---------------------------------------------------------------------------
# Unit tests: @non_generative decorator — async
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_generative_decorator_async_passes():
    """Decorated async function should execute normally with no banned modules."""
    import app.core.anti_generative as ag_module
    custom_banned = frozenset({FAKE_MODULE_NAME})

    @non_generative
    async def safe_async(x: int) -> int:
        return x + 10

    with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
        result = await safe_async(5)
    assert result == 15


@pytest.mark.asyncio
async def test_non_generative_decorator_async_blocks_on_violation():
    """Decorated async function must raise before executing its body."""
    import app.core.anti_generative as ag_module
    custom_banned = frozenset({FAKE_MODULE_NAME})
    call_log = []

    @non_generative
    async def unsafe_async():
        call_log.append("body_executed")

    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                await unsafe_async()

    assert call_log == [], "Async body executed despite generative violation!"


# ---------------------------------------------------------------------------
# Integration: verify decorators are applied in cv_service and nlp_service
# ---------------------------------------------------------------------------


def test_cv_service_enhance_image_with_detail_is_guarded():
    """
    enhance_image_with_detail must be wrapped with @non_generative.
    We verify by injecting a fake banned module and confirming it raises
    *before* doing any OpenCV work.
    """
    import app.core.anti_generative as ag_module
    from app.services.cv_service import cv_service

    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                cv_service.enhance_image_with_detail(b"irrelevant-bytes")


def test_cv_service_enhance_image_shim_is_guarded():
    """enhance_image() shim must also be protected by @non_generative."""
    import app.core.anti_generative as ag_module
    from app.services.cv_service import cv_service

    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                cv_service.enhance_image(b"irrelevant-bytes")


@pytest.mark.asyncio
async def test_nlp_service_transcribe_audio_is_guarded():
    """transcribe_audio must be protected by @non_generative."""
    import app.core.anti_generative as ag_module
    from app.services.nlp_service import nlp_service

    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                await nlp_service.transcribe_audio(b"audio", "hi")


@pytest.mark.asyncio
async def test_nlp_service_translate_is_guarded():
    """translate_to_english must be protected by @non_generative."""
    import app.core.anti_generative as ag_module
    from app.services.nlp_service import nlp_service

    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                await nlp_service.translate_to_english("some text", "hindi")


@pytest.mark.asyncio
async def test_nlp_service_generate_catalog_metadata_is_guarded():
    """generate_catalog_metadata must be protected by @non_generative."""
    import app.core.anti_generative as ag_module
    from app.services.nlp_service import nlp_service

    custom_banned = frozenset({FAKE_MODULE_NAME})
    with _inject_banned_module(FAKE_MODULE_NAME):
        with patch.object(ag_module, "BANNED_GENERATIVE_MODULES", custom_banned):
            with pytest.raises(NonGenerativeViolationError):
                await nlp_service.generate_catalog_metadata("some transcript")


# ---------------------------------------------------------------------------
# Policy constants
# ---------------------------------------------------------------------------


def test_banned_modules_registry_contains_key_offenders():
    """BANNED_GENERATIVE_MODULES must include all critical generative libraries."""
    required = {
        "openai",
        "stability_sdk",
        "diffusers",
        "replicate",
        "anthropic",
    }
    missing = required - BANNED_GENERATIVE_MODULES
    assert not missing, (
        f"Missing expected banned modules: {missing}. "
        "Add them to BANNED_GENERATIVE_MODULES in anti_generative.py."
    )


def test_authenticity_guarantee_text():
    """AUTHENTICITY_GUARANTEE must contain the canonical policy statement."""
    assert "Zero Generative Hallucination" in AUTHENTICITY_GUARANTEE
    assert "Non-Synthetic" in AUTHENTICITY_GUARANTEE
    assert "Non-Generative" in AUTHENTICITY_GUARANTEE
