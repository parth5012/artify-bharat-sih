import pytest
from httpx import AsyncClient

from app.services.assistant_service import assistant_service

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


# ---------------------------------------------------------------------------
# /api/v1/assistant/dadi — endpoint contract & offline mentor behavior
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ask_dadi_rejects_blank_query(client: AsyncClient):
    res = await client.post("/api/v1/assistant/dadi", json={"query_text": "   "})
    assert res.status_code == 400
    assert res.json()["detail"] == "Query text cannot be empty."


@pytest.mark.asyncio
async def test_ask_dadi_response_contract(client: AsyncClient):
    """Every response must carry the full DadiQueryResponse contract fields."""
    res = await client.post(
        "/api/v1/assistant/dadi",
        json={"query_text": "बेचने के लिए कैसा दाम रखूँ?", "dialect": "hindi"},
    )
    assert res.status_code == 200
    data = res.json()
    for key in (
        "answer_text",
        "answer_english",
        "dialect",
        "audio_response_url",
        "suggested_actions",
        "dadi_tip",
    ):
        assert key in data, f"missing contract key: {key}"
    assert data["dialect"] == "hindi"
    assert isinstance(data["suggested_actions"], list)
    assert data["audio_response_url"].endswith(".mp3")


@pytest.mark.asyncio
async def test_ask_dadi_defaults_and_unknown_dialect_fallback(client: AsyncClient):
    # No dialect supplied -> defaults to bhojpuri; unknown query -> fallback answer
    res = await client.post(
        "/api/v1/assistant/dadi", json={"query_text": "ajab-gajab sawal 123"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["dialect"] == "bhojpuri"
    assert data["answer_text"]  # non-empty fallback answer

    res = await client.post(
        "/api/v1/assistant/dadi",
        json={"query_text": "ajab-gajab sawal 123", "dialect": "tulu"},
    )
    assert res.status_code == 200
    assert res.json()["dialect"] == "tulu"


@pytest.mark.asyncio
async def test_ask_dadi_quotes_real_pricing_engine_numbers(client: AsyncClient, monkeypatch):
    """Offline mentor quotes the REAL engine: 100 + (20h @ ₹85) + 150 = 1950 floor."""
    # Force the deterministic offline mentor (a GROQ key would otherwise call the live LLM)
    monkeypatch.setattr(assistant_service, "agent", None, raising=False)
    res = await client.post(
        "/api/v1/assistant/dadi",
        json={"query_text": "100 rupaye ka maal, 20 ghante me bana, daam kya rakhu?", "dialect": "hindi"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "₹100" in data["answer_text"]   # raw materials
    assert "₹1700" in data["answer_text"]  # 20 hrs @ ₹85/hr
    assert "₹1950" in data["answer_text"]  # statutory floor
    assert "20.0 hrs @ ₹85.0/hr" in data["answer_text"]
    assert "AI Pricing Engine" in data["answer_text"]


@pytest.mark.asyncio
async def test_ask_dadi_multi_turn_memory_reuses_prior_numbers(client: AsyncClient, monkeypatch):
    """Follow-up with no numbers must reuse the earlier quoted material+hours.

    800/10 hits the days->hours heuristic (800 >= 10*8), so the engine sees
    80 hours: floor = 800 + 80*85 + 150 = 7750.
    """
    monkeypatch.setattr(assistant_service, "agent", None, raising=False)
    history = [
        {"role": "user", "content": "800 rupaye ka maal, 10 ghante laga"},
        {"role": "assistant", "content": "ठीक है बेटा, हिसाब बता दिया।"},
    ]
    res = await client.post(
        "/api/v1/assistant/dadi",
        json={"query_text": "toh daam kya rakhu?", "dialect": "hindi", "chat_history": history},
    )
    assert res.status_code == 200
    data = res.json()
    assert "₹800" in data["answer_text"]   # remembered material cost
    assert "₹6800" in data["answer_text"]  # 80 hrs @ ₹85/hr (days heuristic)
    assert "₹7750" in data["answer_text"]  # floor = 800 + 6800 + 150
    assert "80.0 hrs" in data["answer_text"]
    assert "आपके पिछले हिसाब" in data["answer_text"]


@pytest.mark.asyncio
async def test_ask_dadi_history_only_used_when_pricing_intent(client: AsyncClient, monkeypatch):
    """Photo queries must not leak remembered pricing numbers."""
    monkeypatch.setattr(assistant_service, "agent", None, raising=False)
    history = [
        {"role": "user", "content": "800 rupaye ka maal, 10 ghante laga"},
    ]
    res = await client.post(
        "/api/v1/assistant/dadi",
        json={"query_text": "फोटो कैसे खींचूँ?", "dialect": "hindi", "chat_history": history},
    )
    assert res.status_code == 200
    data = res.json()
    assert "AI Pricing Engine" not in data["answer_text"]


@pytest.mark.asyncio
async def test_learn_and_earn_reels(client: AsyncClient):
    res = await client.get("/api/v1/assistant/learn-and-earn?dialect=bhojpuri")
    assert res.status_code == 200
    reels = res.json()
    assert len(reels) >= 3
    assert reels[0]["duration_seconds"] == 30
    
    # Complete reel
    res_comp = await client.post("/api/v1/assistant/learn-and-earn/complete?artisan_id=art_991&reel_id=daksh_reel_01")
    assert res_comp.status_code == 200
    data_comp = res_comp.json()
    assert data_comp["certified_seller_badge_awarded"] is True
    assert data_comp["ondc_search_boost_multiplier"] == 1.25

