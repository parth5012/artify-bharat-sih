import asyncio
import functools
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.storage import storage_manager
from app.services.cv_service import cv_service, PipelineStepResult as CvPipelineStepResult
from app.models.product import Product
from app.models.artisan import Artisan
from app.core.security import get_current_artisan, AuthenticatedPrincipal
from app.schemas.studio import (
    StudioEnhanceResponse,
    AIStudioEnhanceResponse,
    PipelineStepResult as SchemaPipelineStep,
)

router = APIRouter(prefix="/studio", tags=["Camera Module & Studio Enhancement"])


def _media_url(folder: str, filename: str) -> str:
    return f"/media/{folder}/{filename}"


def _complexity_to_pricing_factor(score: float) -> str:
    """
    Translates the visual complexity score into a human-readable description
    of its pricing multiplier effect in the Fair-Wage Engine.
    """
    if score >= 0.85:
        return (
            f"HIGH COMPLEXITY ({score:.2f}) — GI-certified intricate weave pattern detected. "
            "Justifies a +15–25% premium pricing multiplier over the statutory wage floor."
        )
    elif score >= 0.65:
        return (
            f"MEDIUM COMPLEXITY ({score:.2f}) — Moderate craft intricacy. "
            "Supports the standard statutory wage-floor price with up to +10% artisan margin."
        )
    else:
        return (
            f"STANDARD COMPLEXITY ({score:.2f}) — Simpler craft composition. "
            "Fair retail price calculated at 1.0× statutory minimum wage floor."
        )


def _map_pipeline_step(step: CvPipelineStepResult) -> SchemaPipelineStep:
    return SchemaPipelineStep(
        step_name=step.step_name,
        step_code=step.step_code,
        applied=step.applied,
        description=step.description,
        authenticity_note=step.authenticity_note,
    )


@router.post(
    "/enhance-studio",
    response_model=AIStudioEnhanceResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Studio Enhancement (Stateless)",
    description=(
        "Step 3 of the 7-Step Product Wizard: Non-Generative AI Studio Image Enhancement. "
        "Applies rembg U²-Net / GrabCut background removal, CLAHE color equalization, and 1:1 square crop. "
        "Returns enriched pipeline metadata and URLs pointing to the saved raw and enhanced assets. "
        "Does NOT write to the database — "
        "call /studio/enhance after this step to persist the product record."
    ),
)
async def ai_studio_enhance(
    image: UploadFile = File(..., description="Raw JPEG/PNG from the Camera Studio (Step 1)"),
    product_id: str = Form(
        default="",
        description="Optional product_id to tag the media storage path. If empty, a UUID is auto-generated.",
    ),
    remove_bg: bool = Form(
        default=True,
        description="Set false to skip GrabCut background removal (CLAHE + crop still applied).",
    ),
):
    """
    **AI Studio Enhancement Pipeline** (Step 3 / 7 — Non-Generative):

    | Stage | Algorithm | Purpose |
    |---|---|---|
    | 1 | Canny Edge Density | Visual complexity scoring for pricing engine |
    | 2 | OpenCV CLAHE (LAB) | Correct incandescent village lighting → true daylight colors |
    | 3 | GrabCut / U²-Net | Background isolation & alpha-mask segmentation |
    | 4 | 1:1 Canvas Composite | Center on #FDFBF7 studio neutral for GeM / ONDC / WhatsApp |

    No generative models (Stable Diffusion, inpainting, hallucination) are used at any stage.
    """
    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image uploaded. Please capture a photo via the Camera Studio before proceeding.",
        )

    # Run the CPU-bound pipeline in a worker thread to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    try:
        pipeline_result = await loop.run_in_executor(
            None,
            functools.partial(cv_service.enhance_image_with_detail, raw_bytes, remove_bg=remove_bg),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc

    # Persist both raw and enhanced assets; use a single server-generated UUID
    # for the filenames so every request gets unique storage paths regardless of
    # the caller-supplied product_id or the original image filename.
    file_id = str(uuid.uuid4())
    raw_filename = f"raw_{file_id}.jpg"
    enhanced_filename = f"enhanced_studio_{file_id}.png"

    raw_url = await storage_manager.save_raw_image(raw_bytes, raw_filename)
    enhanced_url = await storage_manager.save_enhanced_image(
        pipeline_result.enhanced_bytes, enhanced_filename
    )

    return AIStudioEnhanceResponse(
        raw_image_url=raw_url,
        enhanced_image_url=enhanced_url,
        visual_complexity_score=pipeline_result.complexity_score,
        auto_cropped_ratio="1:1",
        clahe_applied=pipeline_result.clahe_applied,
        background_removed=pipeline_result.background_removed,
        crop_applied=pipeline_result.crop_applied,
        rembg_used=pipeline_result.rembg_used,
        pipeline_steps=[_map_pipeline_step(step) for step in pipeline_result.pipeline_steps],
        authenticity_guarantee=pipeline_result.authenticity_guarantee,
        complexity_pricing_factor=_complexity_to_pricing_factor(pipeline_result.complexity_score),
        status="enhanced",
        message=(
            f"Image successfully enhanced to studio quality. "
            f"Pipeline: CLAHE={'✓' if pipeline_result.clahe_applied else '✗'} | "
            f"BG Removal={'✓' if pipeline_result.background_removed else '✗'} "
            f"({'U²-Net' if pipeline_result.rembg_used else 'GrabCut'}) | "
            f"1:1 Crop={'✓' if pipeline_result.crop_applied else '✗'}. "
            f"Complexity score: {pipeline_result.complexity_score}."
        ),
    )


@router.post("/enhance", response_model=StudioEnhanceResponse)
async def enhance_product_photo(
    artisan_id: str = Form(...),
    product_title: str = Form("Handcrafted Product"),
    craft_category: str = Form("handloom"),
    gps_latitude: float | None = Form(None),
    gps_longitude: float | None = Form(None),
    provenance_timestamp: str | None = Form(None),
    image: UploadFile = File(...),
    current_artisan: AuthenticatedPrincipal = Depends(get_current_artisan),
    db: AsyncSession = Depends(get_db),
):
    """
    Page 3: Camera Module & Studio Enhancement (DB-persisting version).
    Receives raw smartphone photograph, applies:
    - Background extraction (Salient object segmentation)
    - Lighting & gamma equalization (CLAHE)
    - Auto-cropping to 1:1 ratio
    - Visual complexity score computation
    Creates a Product record linked to the artisan.
    """
    if artisan_id != current_artisan.id and current_artisan.role not in {"admin", "supervisor", "procurement_officer"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this artisan")

    artisan_res = await db.execute(select(Artisan).where(Artisan.id == current_artisan.id))
    artisan = artisan_res.scalar_one_or_none()
    if not artisan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artisan not found")

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image uploaded")

    product_id = str(uuid.uuid4())
    raw_filename = f"raw_{product_id}_{image.filename}"
    enhanced_filename = f"enhanced_{product_id}.png"

    # Save raw asset
    raw_path = await storage_manager.save_raw_image(raw_bytes, raw_filename)

    # Process via Computer Vision service
    try:
        pipeline_result = cv_service.enhance_image_with_detail(raw_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    enhanced_path = await storage_manager.save_enhanced_image(
        pipeline_result.enhanced_bytes, enhanced_filename
    )

    # Persist Product Record
    parsed_timestamp = None
    if provenance_timestamp:
        try:
            parsed_timestamp = datetime.fromisoformat(provenance_timestamp.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="provenance_timestamp must be an ISO-8601 timestamp",
            ) from exc

    product = Product(
        id=product_id,
        artisan_id=artisan.id,
        title=product_title,
        craft_category=craft_category,
        raw_image_path=raw_path,
        enhanced_image_path=enhanced_path,
        visual_complexity_score=pipeline_result.complexity_score,
        provenance_latitude=gps_latitude,
        provenance_longitude=gps_longitude,
        provenance_timestamp=parsed_timestamp,
        status="enhanced",
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return StudioEnhanceResponse(
        product_id=product.id,
        raw_image_url=_media_url("raw", raw_filename),
        enhanced_image_url=_media_url("enhanced", enhanced_filename),
        visual_complexity_score=pipeline_result.complexity_score,
        clahe_applied=pipeline_result.clahe_applied,
        background_removed=pipeline_result.background_removed,
        crop_applied=pipeline_result.crop_applied,
        rembg_used=pipeline_result.rembg_used,
        auto_cropped_ratio="1:1",
        status="enhanced",
        message="Image successfully enhanced to studio quality with background removed.",
    )
