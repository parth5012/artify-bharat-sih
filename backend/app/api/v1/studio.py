import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.storage import storage_manager
from app.services.cv_service import cv_service
from app.models.product import Product
from app.models.artisan import Artisan
from app.schemas.studio import StudioEnhanceResponse

router = APIRouter(prefix="/studio", tags=["Camera Module & Studio Enhancement"])


@router.post("/enhance", response_model=StudioEnhanceResponse)
async def enhance_product_photo(
    artisan_id: str = Form(...),
    product_title: str = Form("Handcrafted Product"),
    craft_category: str = Form("handloom"),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Page 3: Camera Module & Studio Enhancement.
    Receives raw smartphone photograph, applies:
    - Background extraction (Salient object segmentation)
    - Lighting & gamma equalization (CLAHE)
    - Auto-cropping to 1:1 ratio
    - Visual complexity score computation
    """
    artisan_res = await db.execute(select(Artisan).where(Artisan.id == artisan_id))
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
    enhanced_bytes, complexity_score = cv_service.enhance_image(raw_bytes)
    enhanced_path = await storage_manager.save_enhanced_image(enhanced_bytes, enhanced_filename)

    # Persist Product Record
    product = Product(
        id=product_id,
        artisan_id=artisan.id,
        title=product_title,
        craft_category=craft_category,
        raw_image_path=raw_path,
        enhanced_image_path=enhanced_path,
        visual_complexity_score=complexity_score,
        status="enhanced",
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return StudioEnhanceResponse(
        product_id=product.id,
        raw_image_url=raw_path,
        enhanced_image_url=enhanced_path,
        visual_complexity_score=complexity_score,
        auto_cropped_ratio="1:1",
        status="enhanced",
        message="Image successfully enhanced to studio quality with background removed.",
    )
