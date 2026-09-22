import asyncio
from app.workers.celery_app import celery_app
from app.services.cv_service import cv_service
from app.core.storage import storage_manager


@celery_app.task(bind=True, name="app.workers.tasks_cv.process_studio_enhancement")
def process_studio_enhancement(self, product_id: str, raw_image_path: str):
    """
    Celery background worker executing:
    - U2-Net Background extraction
    - OpenCV lighting & gamma equalization
    - Auto-cropping 1:1 square canvas
    - Saving enhanced studio asset
    """
    with open(raw_image_path, "rb") as f:
        raw_bytes = f.read()

    enhanced_bytes, complexity = cv_service.enhance_image(raw_bytes)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    enhanced_path = loop.run_until_complete(
        storage_manager.save_enhanced_image(enhanced_bytes, f"enhanced_{product_id}.png")
    )
    loop.close()

    return {
        "product_id": product_id,
        "enhanced_image_path": enhanced_path,
        "visual_complexity_score": complexity,
        "status": "completed",
    }
