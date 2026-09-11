import pytest
import io
import numpy as np
import cv2
from httpx import AsyncClient
from app.services.cv_service import cv_service

# Slow: full rembg/CV inference per test (~60-90s on CPU). Excluded from the CI
# fast suite with `-m "not slow"`; still runs in local full-suite runs.
pytestmark = pytest.mark.slow


def create_dummy_image_bytes() -> bytes:
    # Create a 200x200 RGB test image
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    # Add colored patterns
    cv2.circle(img, (100, 100), 50, (0, 0, 255), -1)
    cv2.rectangle(img, (30, 30), (70, 70), (0, 255, 0), -1)
    success, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()


def test_cv_service_direct():
    raw_bytes = create_dummy_image_bytes()
    enhanced_bytes, complexity = cv_service.enhance_image(raw_bytes)
    assert len(enhanced_bytes) > 0
    assert 0.0 <= complexity <= 1.0


@pytest.mark.asyncio
async def test_studio_enhance_endpoint(client: AsyncClient):
    # Register artisan first
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Kashi Weaver",
            "phone": "9811122233",
            "pin": "4321",
        },
    )
    artisan_id = reg.json()["artisan_id"]

    image_bytes = create_dummy_image_bytes()
    files = {"image": ("test_saree.jpg", io.BytesIO(image_bytes), "image/jpeg")}
    data = {
        "artisan_id": artisan_id,
        "product_title": "Raw Saree Photo",
        "craft_category": "handloom",
    }

    res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "enhanced"
    assert res_data["auto_cropped_ratio"] == "1:1"
    assert "enhanced_image_url" in res_data
    assert res_data["visual_complexity_score"] > 0
