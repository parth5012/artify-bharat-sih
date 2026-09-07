import pytest
import io
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_nlp_voice_cataloging_endpoint(client: AsyncClient):
    # 1. Register artisan
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "Ananya Sharma", "phone": "9988776655", "pin": "1122"},
    )
    artisan_id = reg.json()["artisan_id"]

    # 2. Upload dummy image to create product
    from tests.test_cv_enhancement import create_dummy_image_bytes
    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Draft Item"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    product_id = enhance_res.json()["product_id"]

    # 3. Upload voice description audio
    dummy_audio_bytes = b"RIFF....WAVEfmt ...."
    audio_files = {"audio": ("artisan_voice.wav", io.BytesIO(dummy_audio_bytes), "audio/wav")}
    voice_data = {"product_id": product_id, "dialect": "bhojpuri"}

    res = await client.post("/api/v1/catalog/voice", data=voice_data, files=audio_files)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "cataloged"
    assert "Banarasi" in res_data["metadata"]["title"]
    assert "GI Tagged" in res_data["metadata"]["gi_tag_status"]
    assert len(res_data["metadata"]["seo_tags"]) > 0
    assert res_data["metadata"]["estimated_days"] > 0
