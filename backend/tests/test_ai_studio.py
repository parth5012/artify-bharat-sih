"""
AI Studio Enhancement Test Suite (TDD)

Tests for:
1. cv_service.enhance_image_with_detail() — StudioPipelineResult dataclass
2. POST /api/v1/studio/enhance-studio — stateless AI Studio endpoint
3. Backward compatibility of enhance_image() shim
"""
import io
import pytest
import numpy as np
import cv2
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.cv_service import cv_service, StudioPipelineResult, PipelineStepResult


# ---------------------------------------------------------------------------
# Shared test helpers
# ---------------------------------------------------------------------------

def make_dummy_jpeg(size: int = 200, with_pattern: bool = True) -> bytes:
    """
    Creates a synthetic JPEG test image with a colored circle and rectangle pattern
    to ensure non-trivial edge density for complexity scoring.
    """
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:] = (220, 215, 200)  # Light warm background
    if with_pattern:
        cv2.circle(img, (size // 2, size // 2), size // 4, (0, 0, 200), -1)
        cv2.rectangle(img, (10, 10), (60, 60), (0, 180, 0), -1)
        cv2.line(img, (0, 0), (size, size), (150, 50, 50), 3)
    _, enc = cv2.imencode(".jpg", img)
    return enc.tobytes()


def make_dummy_png_transparent(size: int = 150) -> bytes:
    """Creates a simple RGBA PNG for transparency pipeline testing."""
    img = np.zeros((size, size, 4), dtype=np.uint8)
    img[:, :, :3] = (200, 100, 50)  # Orange craft color
    img[:, :, 3] = 255
    _, enc = cv2.imencode(".png", img)
    return enc.tobytes()


# ---------------------------------------------------------------------------
# Unit tests: cv_service.enhance_image_with_detail()
# ---------------------------------------------------------------------------

def test_cv_pipeline_result_type():
    """enhance_image_with_detail() returns a StudioPipelineResult dataclass."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert isinstance(result, StudioPipelineResult)


def test_cv_pipeline_enhanced_bytes_nonempty():
    """Pipeline returns non-empty enhanced PNG bytes."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert len(result.enhanced_bytes) > 0


def test_cv_pipeline_complexity_range():
    """Complexity score is always in valid range [0.0, 1.0]."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert 0.0 <= result.complexity_score <= 1.0, (
        f"Complexity score {result.complexity_score} out of expected [0.0, 1.0] range"
    )


def test_cv_pipeline_clahe_applied_flag():
    """CLAHE step should always apply successfully on a valid JPEG."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert result.clahe_applied is True, "CLAHE should always be applied on a valid image"


def test_cv_pipeline_crop_applied_flag():
    """1:1 auto-crop should always apply successfully on a valid image."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert result.crop_applied is True, "1:1 crop should always apply on a valid image"


def test_cv_pipeline_steps_populated():
    """Pipeline steps list should contain at least 3 records."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert len(result.pipeline_steps) >= 3, (
        f"Expected at least 3 pipeline steps, got {len(result.pipeline_steps)}"
    )


def test_cv_pipeline_step_types():
    """Each pipeline step should be a PipelineStepResult with required fields."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    for step in result.pipeline_steps:
        assert isinstance(step, PipelineStepResult)
        assert step.step_name
        assert step.step_code
        assert isinstance(step.applied, bool)
        assert step.description
        assert step.authenticity_note


def test_cv_pipeline_authenticity_guarantee():
    """Authenticity guarantee string must be present and non-empty."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert result.authenticity_guarantee
    assert "Zero Generative Hallucination" in result.authenticity_guarantee


def test_cv_pipeline_step_codes_present():
    """All expected step codes must appear in the pipeline."""
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    codes = {step.step_code for step in result.pipeline_steps}
    assert "complexity_scoring" in codes
    assert "clahe_equalization" in codes
    assert "square_crop" in codes


def test_cv_pipeline_corrupt_bytes_fallback():
    """
    Corrupt / non-image bytes should return a graceful fallback result
    with complexity_score=0.50 and clahe_applied=False.
    """
    result = cv_service.enhance_image_with_detail(b"not-an-image-at-all")
    assert isinstance(result, StudioPipelineResult)
    assert result.complexity_score == 0.50
    assert result.clahe_applied is False
    assert result.background_removed is False


def test_cv_enhance_image_shim_compatibility():
    """
    Backward-compat: enhance_image() shim must return (bytes, float) tuple
    so existing /studio/enhance endpoint is not broken.
    """
    raw_bytes = make_dummy_jpeg()
    enhanced_bytes, complexity = cv_service.enhance_image(raw_bytes)
    assert isinstance(enhanced_bytes, bytes)
    assert len(enhanced_bytes) > 0
    assert isinstance(complexity, float)
    assert 0.0 <= complexity <= 1.0


# ---------------------------------------------------------------------------
# Integration tests: POST /api/v1/studio/enhance-studio
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_studio_endpoint_success():
    """
    POST /api/v1/studio/enhance-studio with a valid JPEG returns 200
    and a fully populated AIStudioEnhanceResponse.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("test_saree.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-001", "remove_bg": "true"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()

        assert body["status"] == "enhanced"
        assert "enhanced_image_url" in body
        assert body["auto_cropped_ratio"] == "1:1"


@pytest.mark.asyncio
async def test_ai_studio_endpoint_pipeline_flags():
    """
    The response must include correct boolean flags for clahe_applied,
    background_removed, and crop_applied.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("saree.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-002"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()

        assert body["clahe_applied"] is True
        assert body["crop_applied"] is True
        assert isinstance(body["background_removed"], bool)


@pytest.mark.asyncio
async def test_ai_studio_endpoint_complexity_range():
    """The visual_complexity_score in the API response must be in [0.0, 1.0]."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg(size=300)
        files = {"image": ("complex_craft.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-003"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()
        score = body["visual_complexity_score"]
        assert 0.0 <= score <= 1.0, f"Complexity score {score} out of valid range"


@pytest.mark.asyncio
async def test_ai_studio_endpoint_pipeline_steps_schema():
    """
    pipeline_steps in the response must be a list of objects
    with all required fields per PipelineStepResult schema.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-004"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()

        steps = body["pipeline_steps"]
        assert isinstance(steps, list)
        assert len(steps) >= 3

        required_fields = {"step_name", "step_code", "applied", "description", "authenticity_note"}
        for step in steps:
            for field in required_fields:
                assert field in step, f"Missing field '{field}' in pipeline step: {step}"


@pytest.mark.asyncio
async def test_ai_studio_endpoint_authenticity_guarantee():
    """
    The response must include the non-generative authenticity guarantee text.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("weave.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-005"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()
        assert "Zero Generative Hallucination" in body["authenticity_guarantee"]


@pytest.mark.asyncio
async def test_ai_studio_endpoint_complexity_pricing_factor():
    """complexity_pricing_factor must be a non-empty descriptive string."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("craft.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-ai-006"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()
        assert body["complexity_pricing_factor"]
        assert isinstance(body["complexity_pricing_factor"], str)
        assert len(body["complexity_pricing_factor"]) > 20


@pytest.mark.asyncio
async def test_ai_studio_endpoint_empty_image_returns_400():
    """POST with an empty image body must return HTTP 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
        data = {"product_id": "test-product-ai-007"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 400
        assert "Empty image" in res.json()["detail"]


@pytest.mark.asyncio
async def test_ai_studio_endpoint_autogenerated_product_id():
    """
    If product_id is not provided, the endpoint auto-generates one
    and still returns a valid 200 response.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("no_id.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        # No product_id in data

        res = await ac.post("/api/v1/studio/enhance-studio", files=files)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "enhanced"
        assert body["enhanced_image_url"]


# ---------------------------------------------------------------------------
# New tests: rembg U²-Net integration
# ---------------------------------------------------------------------------

def test_cv_pipeline_rembg_used_flag():
    """
    StudioPipelineResult must expose rembg_used as a bool.
    Value is True when rembg is installed and model loads, False on GrabCut fallback.
    """
    raw_bytes = make_dummy_jpeg()
    result = cv_service.enhance_image_with_detail(raw_bytes)
    assert hasattr(result, "rembg_used"), "StudioPipelineResult is missing rembg_used field"
    assert isinstance(result.rembg_used, bool), (
        f"rembg_used should be bool, got {type(result.rembg_used)}"
    )


@pytest.mark.asyncio
async def test_ai_studio_endpoint_rembg_flag():
    """
    POST /api/v1/studio/enhance-studio response must include rembg_used boolean.
    Accepted values: True (U²-Net ran) or False (GrabCut CPU fallback used).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        img_bytes = make_dummy_jpeg()
        files = {"image": ("craft_rembg.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {"product_id": "test-product-rembg-001"}

        res = await ac.post("/api/v1/studio/enhance-studio", data=data, files=files)
        assert res.status_code == 200
        body = res.json()

        assert "rembg_used" in body, "API response missing rembg_used field"
        assert isinstance(body["rembg_used"], bool), (
            f"rembg_used must be bool in API response, got {type(body['rembg_used'])}"
        )
