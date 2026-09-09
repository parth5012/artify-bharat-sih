from typing import Optional, List
from pydantic import BaseModel


class StudioEnhanceResponse(BaseModel):
    """Existing response model for /studio/enhance (DB-persisting endpoint)."""
    product_id: str
    raw_image_url: str
    enhanced_image_url: str
    visual_complexity_score: float
    auto_cropped_ratio: str = "1:1"
    status: str
    message: str


class PipelineStepResult(BaseModel):
    """
    Records the outcome of a single stage in the AI Studio enhancement pipeline.
    Exposed in the AIStudioEnhanceResponse to give full non-generative transparency.
    """
    step_name: str
    step_code: str
    applied: bool
    description: str
    authenticity_note: str


class AIStudioEnhanceResponse(BaseModel):
    """
    Response model for the stateless POST /api/v1/studio/enhance-studio endpoint.
    Includes full pipeline step metadata and authenticity guarantee for the
    Before/After AI Studio Comparison Slider UI (Step 3 of the 7-Step Product Wizard).
    """
    # Media URLs
    raw_image_url: Optional[str] = None
    enhanced_image_url: str

    # Pricing engine input
    visual_complexity_score: float
    auto_cropped_ratio: str = "1:1"

    # Pipeline detail flags
    clahe_applied: bool
    background_removed: bool
    crop_applied: bool
    # True when rembg U²-Net ran; False means GrabCut CPU fallback was used
    rembg_used: bool = False

    # Per-step audit trail
    pipeline_steps: List[PipelineStepResult]

    # Non-generative authenticity guarantee badge
    authenticity_guarantee: str = (
        "Zero Generative Hallucination • Authentic Weave Texture Preserved • "
        "Non-Synthetic Non-Generative AI Pipeline Only"
    )

    # Pricing integration
    complexity_pricing_factor: str  # Human-readable description of complexity impact on price

    status: str
    message: str
