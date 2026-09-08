import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ask_dadi_camera_advice(client: AsyncClient):
    payload = {
        "query_text": "हमार साड़ी के फोटो कैसन खींची जेकरा से GeM पर बढ़िया दिखे?",
        "dialect": "bhojpuri",
        "product_category": "handloom"
    }
    res = await client.post("/api/v1/assistant/dadi", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "1:1" in data["answer_text"] or "फोटो" in data["answer_text"] or "camera" in data["answer_english"].lower()
    assert data["dialect"] == "bhojpuri"
    assert len(data["suggested_actions"]) > 0
    assert data["dadi_tip"] is not None

@pytest.mark.asyncio
async def test_ask_dadi_pricing_advice(client: AsyncClient):
    payload = {
        "query_text": "दाम कैसन तय करीं जेकरा से सही मुनाफा होखे?",
        "dialect": "hindi",
        "product_category": "handloom"
    }
    res = await client.post("/api/v1/assistant/dadi", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "450" in data["answer_text"] or "वेज" in data["answer_text"] or "wage" in data["answer_english"].lower()
    assert data["dialect"] == "hindi"
