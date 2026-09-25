"""
Automated unit tests for the Fair-Wage Dynamic Pricing Engine (SIH PS 26090).

Covers:
- DynamicPricingService.calculate_fair_wage_pricing (hourly wage engine)
- DynamicPricingService.calculate_pricing (legacy daily-wage engine)
- Module-level calculate_artisan_pricing (tiered quick-quote)
- Statutory wage floor lookups & enforcement
- Input sanitization (NaN/inf/negative/oversized values)
- Ask Dadi tool backends (get_state_wage_floor_info / explain_fair_price)
"""

import io
import math

import pytest
from httpx import AsyncClient

from app.services.pricing_service import (
    STATE_WAGE_FLOOR,
    DynamicPricingService,
    calculate_artisan_pricing,
    get_skilled_wage_floor,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def service() -> DynamicPricingService:
    """Fresh instance so tests never share mutable state."""
    return DynamicPricingService()


@pytest.fixture
def fair_quote(service):
    """Baseline hourly-engine quote: HR artisan, 20h labor, GI-tagged handloom."""

    def _quote(**overrides):
        params = dict(
            raw_material_cost=500.0,
            labor_hours=20.0,
            state_code="HR",
            craft_category="handloom",
            is_gi_tagged=True,
        )
        params.update(overrides)
        return service.calculate_fair_wage_pricing(**params)

    return _quote


# ---------------------------------------------------------------------------
# State wage floor lookups
# ---------------------------------------------------------------------------

class TestStateWageFloors:
    def test_known_state_returns_statutory_rate(self, service):
        info = service.get_state_wage_floor("HR")
        assert info["name"] == "Haryana"
        assert info["rate_per_hour"] == 85.0

    def test_state_code_is_normalized(self, service):
        assert service.get_state_wage_floor("hr")["rate_per_hour"] == 85.0
        assert service.get_state_wage_floor(" dl ")["name"] == "Delhi"

    def test_unknown_state_falls_back_to_national_baseline(self, service):
        info = service.get_state_wage_floor("XX")
        assert info["name"] == "State (XX)"
        assert info["rate_per_hour"] == service.DEFAULT_HOURLY_WAGE_FLOOR

    def test_none_and_empty_fall_back_to_haryana_default(self, service):
        assert service.get_state_wage_floor(None)["rate_per_hour"] == 85.0
        assert service.get_state_wage_floor("")["rate_per_hour"] == 85.0

    def test_all_listed_states_have_positive_rates(self, service):
        for code, info in service.STATE_HOURLY_WAGE_FLOORS.items():
            assert info["rate_per_hour"] > 0, f"{code} has non-positive wage floor"

    def test_module_level_floor_table(self):
        assert STATE_WAGE_FLOOR["HR"] == 85.0
        assert get_skilled_wage_floor("ZZZ") == STATE_WAGE_FLOOR["DEFAULT"]


# ---------------------------------------------------------------------------
# calculate_fair_wage_pricing — the primary hourly-wage engine
# ---------------------------------------------------------------------------

class TestFairWagePricing:
    def test_baseline_quote_structure(self, fair_quote):
        res = fair_quote()
        for key in (
            "state_code",
            "state_name",
            "hourly_wage_rate",
            "statutory_floor_enforced",
            "gi_heritage_multiplier",
            "statutory_floor_price",
            "fair_retail_price",
            "bulk_wholesale_price",
            "artisan_net_profit",
            "direct_realization_percent",
            "cost_breakdown",
            "pricing_formula_summary",
        ):
            assert key in res, f"missing key: {key}"

    def test_labor_wage_is_hours_times_state_rate(self, fair_quote):
        res = fair_quote(labor_hours=12.0, state_code="DL")
        breakdown = res["cost_breakdown"]
        assert breakdown["hourly_wage_rate"] == 95.0  # Delhi floor
        assert breakdown["calculated_fair_wage"] == pytest.approx(12.0 * 95.0)

    def test_breakdown_sums_to_retail_price(self, fair_quote):
        res = fair_quote(raw_material_cost=800.0, labor_hours=10.0)
        b = res["cost_breakdown"]
        total = (
            b["raw_material_cost"]
            + b["calculated_fair_wage"]
            + b["packaging_overhead"]
            + b["artisan_net_profit"]
        )
        assert total == pytest.approx(res["fair_retail_price"], abs=0.01)

    def test_packaging_overhead_floors_at_150(self, fair_quote):
        cheap = fair_quote(raw_material_cost=100.0)
        assert cheap["cost_breakdown"]["packaging_overhead"] == 150.0
        # 8% above 150 kicks in past material cost of 1875
        rich = fair_quote(raw_material_cost=2500.0)
        assert rich["cost_breakdown"]["packaging_overhead"] == pytest.approx(200.0)

    def test_gi_tag_applies_heritage_multiplier(self, fair_quote):
        non_gi = fair_quote(is_gi_tagged=False)
        gi = fair_quote(is_gi_tagged=True)
        assert gi["gi_heritage_multiplier"] == pytest.approx(1.15)
        assert gi["fair_retail_price"] > non_gi["fair_retail_price"]

    def test_complexity_scales_price_monotonically(self, fair_quote):
        low = fair_quote(visual_complexity=0.2)
        mid = fair_quote(visual_complexity=0.75)
        high = fair_quote(visual_complexity=1.5)
        assert low["fair_retail_price"] < mid["fair_retail_price"] < high["fair_retail_price"]

    def test_complexity_premium_clamped_between_15_and_60_pct(self, fair_quote):
        # 0.0 and 0.2 both clamp up to the 15% minimum -> identical prices
        assert fair_quote(visual_complexity=0.0)["fair_retail_price"] == (
            fair_quote(visual_complexity=0.2)["fair_retail_price"]
        )
        # 99 and 1.2 both clamp down to the 60% ceiling -> identical prices
        assert fair_quote(visual_complexity=99.0)["fair_retail_price"] == (
            fair_quote(visual_complexity=1.2)["fair_retail_price"]
        )
        # In between, the premium is applied as-is
        assert fair_quote(visual_complexity=0.4)["fair_retail_price"] > fair_quote(
            visual_complexity=0.0
        )["fair_retail_price"]

    def test_craft_category_multipliers(self, fair_quote):
        painting = fair_quote(craft_category="painting")
        pottery = fair_quote(craft_category="pottery")
        unknown = fair_quote(craft_category="macrame")
        assert painting["fair_retail_price"] > pottery["fair_retail_price"]
        # Unknown categories fall back to the 1.20 default multiplier
        assert unknown["fair_retail_price"] == pytest.approx(
            fair_quote(craft_category="knitting")["fair_retail_price"]
        )
        assert unknown["fair_retail_price"] != painting["fair_retail_price"]

    def test_benchmark_band_brackets_retail(self, service):
        res = service.calculate_pricing(
            raw_material_cost=500.0, labor_days=5.0, craft_category="handloom"
        )
        assert res["benchmark_min_price"] <= res["recommended_price"] <= res["benchmark_max_price"]

    def test_retail_never_below_statutory_floor(self, fair_quote):
        # Tiny inputs would otherwise price below the floor cost
        res = fair_quote(raw_material_cost=10.0, labor_hours=0.5, visual_complexity=0.0)
        assert res["fair_retail_price"] >= res["statutory_floor_price"]
        assert res["bulk_wholesale_price"] >= res["statutory_floor_price"]

    def test_bulk_wholesale_is_15_percent_below_retail(self, fair_quote):
        res = fair_quote(raw_material_cost=1000.0, labor_hours=25.0)
        assert res["bulk_wholesale_price"] == pytest.approx(
            res["fair_retail_price"] * 0.85, abs=0.05
        )

    def test_hourly_wage_override_cannot_drop_below_statutory_floor(self, fair_quote):
        res = fair_quote(hourly_wage_override=20.0)  # predatory rate
        assert res["statutory_floor_enforced"] is True
        assert res["hourly_wage_rate"] == 85.0  # clamped up to HR floor

    def test_wage_override_above_floor_is_honored(self, fair_quote):
        res = fair_quote(hourly_wage_override=120.0)
        assert res["statutory_floor_enforced"] is False
        assert res["hourly_wage_rate"] == 120.0

    def test_wage_realization_is_positive_percentage(self, fair_quote):
        res = fair_quote()
        assert 0 < res["direct_realization_percent"] <= 100

    def test_formula_summary_mentions_state_and_amounts(self, fair_quote):
        res = fair_quote(state_code="DL")
        summary = res["pricing_formula_summary"]
        assert "Delhi" in summary
        assert "95" in summary
        assert str(res["fair_retail_price"]) in summary


# ---------------------------------------------------------------------------
# Input sanitization / zero-division protection
# ---------------------------------------------------------------------------

class TestInputSanitization:
    def test_negative_material_cost_clamped_to_zero(self, fair_quote):
        res = fair_quote(raw_material_cost=-500.0)
        assert res["cost_breakdown"]["raw_material_cost"] == 0.0

    def test_oversized_material_cost_clamped(self, fair_quote):
        res = fair_quote(raw_material_cost=10**9)
        assert res["cost_breakdown"]["raw_material_cost"] == 10_000_000.0

    def test_nan_material_cost_becomes_zero(self, fair_quote):
        res = fair_quote(raw_material_cost=float("nan"))
        assert res["cost_breakdown"]["raw_material_cost"] == 0.0

    def test_inf_labor_hours_falls_back_to_minimum(self, fair_quote):
        res = fair_quote(labor_hours=float("inf"))
        assert res["cost_breakdown"]["labor_hours"] == 0.5

    def test_labor_hours_clamped_to_minimum_half_hour(self, fair_quote):
        res = fair_quote(labor_hours=0.05)
        assert res["cost_breakdown"]["labor_hours"] == 0.5

    def test_labor_hours_clamped_to_maximum(self, fair_quote):
        res = fair_quote(labor_hours=99999.0)
        assert res["cost_breakdown"]["labor_hours"] == 5000.0

    def test_non_numeric_inputs_do_not_crash(self, fair_quote):
        res_mat = fair_quote(raw_material_cost="abc")
        res_hrs = fair_quote(labor_hours="abc")
        assert res_mat["cost_breakdown"]["raw_material_cost"] == 0.0
        assert res_hrs["cost_breakdown"]["labor_hours"] == 0.5

    def test_no_nan_ever_leaks_into_output(self, fair_quote):
        for bad_material in (-1.0, float("nan"), float("inf"), "abc", None):
            res = fair_quote(raw_material_cost=bad_material)
            assert not math.isnan(res["fair_retail_price"])
            assert not math.isinf(res["fair_retail_price"])

    def test_zero_price_still_produces_valid_percentages(self, fair_quote):
        res = fair_quote(raw_material_cost=0.0, labor_hours=0.5, visual_complexity=0.0)
        assert isinstance(res["direct_realization_percent"], float)


# ---------------------------------------------------------------------------
# calculate_pricing — legacy daily-wage engine (backwards compatibility)
# ---------------------------------------------------------------------------

class TestLegacyDailyWagePricing:
    def test_basic_quote(self, service):
        res = service.calculate_pricing(
            raw_material_cost=500.0,
            labor_days=15.0,
            visual_complexity=0.8,
            craft_category="handloom",
            daily_wage_rate=450.0,
        )
        b = res["cost_breakdown"]
        assert b["raw_material_cost"] == 500.0
        assert b["calculated_fair_wage"] == 15.0 * 450.0
        assert res["recommended_price"] > 7250.0
        assert b["artisan_net_profit"] > 0
        assert res["benchmark_max_price"] > res["benchmark_min_price"]

    def test_predatory_daily_wage_clamped_to_statutory_minimum(self, service):
        res = service.calculate_pricing(
            raw_material_cost=300.0, labor_days=4.0, daily_wage_rate=150.0
        )
        assert res["wage_floor_enforced"] is True
        assert res["cost_breakdown"]["daily_wage_rate"] == 450.0
        assert res["cost_breakdown"]["calculated_fair_wage"] == 1800.0
        assert res["statutory_floor_price"] > 2100.0
        assert res["bulk_wholesale_price"] >= res["statutory_floor_price"]

    def test_wage_at_or_above_minimum_is_not_flagged(self, service):
        res = service.calculate_pricing(
            raw_material_cost=300.0, labor_days=4.0, daily_wage_rate=600.0
        )
        assert res["wage_floor_enforced"] is False
        assert res["cost_breakdown"]["daily_wage_rate"] == 600.0

    def test_none_inputs_take_safe_defaults(self, service):
        res = service.calculate_pricing(raw_material_cost=None, labor_days=None, daily_wage_rate=None)
        b = res["cost_breakdown"]
        assert b["raw_material_cost"] == 0.0
        assert b["labor_days"] == 0.25
        assert b["daily_wage_rate"] == 450.0

    def test_complexity_clamped(self, service):
        # Extremes clamp into the [0.15, 0.60] premium band; monotonic in between
        low = service.calculate_pricing(raw_material_cost=500.0, labor_days=5.0, visual_complexity=-5.0)
        base = service.calculate_pricing(raw_material_cost=500.0, labor_days=5.0, visual_complexity=0.75)
        high = service.calculate_pricing(raw_material_cost=500.0, labor_days=5.0, visual_complexity=50.0)
        assert low["recommended_price"] <= base["recommended_price"] <= high["recommended_price"]


# ---------------------------------------------------------------------------
# Module-level calculate_artisan_pricing — quick-quote tiers
# ---------------------------------------------------------------------------

class TestModuleLevelArtisanPricing:
    def test_three_tiers_present(self):
        res = calculate_artisan_pricing(
            material_cost=400.0, labor_hours=10.0, state_code="HR", craft_category="handloom"
        )
        tiers = res["pricing_tiers"]
        assert tiers["floor_price"] < tiers["suggested_retail_price"]
        assert tiers["bulk_purchase_price"] < tiers["suggested_retail_price"]
        assert tiers["bulk_purchase_price"] == pytest.approx(
            tiers["suggested_retail_price"] * 0.85, rel=0.02
        )

    def test_bulk_below_retail_above_floor(self):
        res = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom")
        tiers = res["pricing_tiers"]
        assert tiers["floor_price"] <= tiers["bulk_purchase_price"] < tiers["suggested_retail_price"]

    def test_gi_tag_lifts_retail_price(self):
        gi = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom", has_gi_tag=True)
        non_gi = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom", has_gi_tag=False)
        assert gi["pricing_tiers"]["suggested_retail_price"] > non_gi["pricing_tiers"]["suggested_retail_price"]
        assert gi["parameters_applied"]["craft_heritage_multiplier"] == 1.15

    def test_festive_season_applies_multiplier(self):
        normal = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom", is_festive_season=False)
        festive = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom", is_festive_season=True)
        assert festive["pricing_tiers"]["suggested_retail_price"] > normal["pricing_tiers"]["suggested_retail_price"]
        assert festive["parameters_applied"]["festive_multiplier"] == 1.10

    def test_state_code_drives_wage_floor(self):
        hr = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom")
        bih = calculate_artisan_pricing(400.0, 10.0, "BIH", "handloom")
        assert (
            hr["parameters_applied"]["hourly_wage_floor"]
            > bih["parameters_applied"]["hourly_wage_floor"]
        )

    def test_unknown_state_uses_default_floor(self):
        res = calculate_artisan_pricing(400.0, 10.0, "ZZ", "handloom")
        assert res["parameters_applied"]["hourly_wage_floor"] == STATE_WAGE_FLOOR["DEFAULT"]
        assert res["parameters_applied"]["state_code"] == "ZZ"

    def test_four_part_breakdown_percentages_track_retail(self):
        res = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom")
        retail = res["pricing_tiers"]["suggested_retail_price"]
        amount_sum = sum(part["amount"] for part in res["fair_price_breakdown"].values())
        pct_sum = sum(part["percentage"] for part in res["fair_price_breakdown"].values())
        assert pct_sum == pytest.approx(amount_sum / retail * 100.0, abs=0.3)

    def test_breakdown_sums_to_100_without_multipliers(self):
        # With no GI/festive multiplier, parts must fully account for the retail price
        res = calculate_artisan_pricing(
            400.0, 10.0, "HR", "handloom", has_gi_tag=False, is_festive_season=False
        )
        pct_sum = sum(part["percentage"] for part in res["fair_price_breakdown"].values())
        assert pct_sum == pytest.approx(100.0, abs=0.3)  # rounding tolerance

    def test_currency_and_status(self):
        res = calculate_artisan_pricing(400.0, 10.0, "HR", "handloom")
        assert res["status"] == "success"
        assert res["currency"] == "INR"

    def test_service_method_delegates_to_module_function(self, service):
        via_service = service.calculate_artisan_pricing(
            material_cost=400.0, labor_hours=10.0, state_code="HR", craft_category="handloom"
        )
        via_module = calculate_artisan_pricing(
            material_cost=400.0, labor_hours=10.0, state_code="HR", craft_category="handloom"
        )
        assert via_service == via_module


# ---------------------------------------------------------------------------
# Ask Dadi tool backends (Task 2.7)
# ---------------------------------------------------------------------------

class TestAskDadiToolBackends:
    def test_state_wage_floor_info_quotes_statutory_numbers(self):
        from app.services.pricing_service import get_state_wage_floor_info

        info = get_state_wage_floor_info("MH")
        assert info["state_code"] == "MH"
        assert info["state_name"] == "Maharashtra"
        assert info["hourly_wage_floor_inr"] == 82.0
        assert info["daily_wage_floor_inr_8hr"] == pytest.approx(656.0)
        assert "82.0" in info["note"]

    def test_explain_fair_price_returns_four_part_breakdown(self):
        from app.services.pricing_service import explain_fair_price

        res = explain_fair_price(material_cost=500.0, labor_hours=10.0, state_code="HR")
        assert res["status"] == "success"
        assert res["currency"] == "INR"
        parts = res["breakdown"]
        assert set(parts.keys()) == {
            "raw_materials",
            "direct_paid_labor",
            "packaging_logistics",
            "artisan_net_profit",
        }
        pct_sum = sum(p["percentage"] for p in parts.values())
        assert pct_sum == pytest.approx(100.0, abs=0.3)

    def test_explain_fair_price_normalizes_loose_craft_words(self):
        from app.services.pricing_service import explain_fair_price

        saree = explain_fair_price(500.0, 10.0, craft_category="Banarasi saree")
        assert saree["craft_category"] == "handloom"
        dhokra = explain_fair_price(500.0, 10.0, craft_category="dhokra metal art")
        assert dhokra["craft_category"] == "metalwork"

    def test_explain_fair_price_labour_detail_line(self):
        from app.services.pricing_service import explain_fair_price

        res = explain_fair_price(500.0, 8.0, state_code="HR")
        detail = res["breakdown"]["direct_paid_labor"]["detail"]
        assert "8.0 hrs" in detail
        assert "85.0/hr" in detail


# ---------------------------------------------------------------------------
# HTTP API integration (fast, no CV/ML dependency)
# ---------------------------------------------------------------------------

async def _create_priced_product(client: AsyncClient) -> str:
    """Register an artisan, run studio enhance, and return the product_id."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "Pricing Tester", "phone": "9123456780", "pin": "5555"},
    )
    artisan_id = reg.json()["artisan_id"]
    access_token = reg.json()["access_token"]

    from tests.test_cv_enhancement import create_dummy_image_bytes

    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Pashmina Shawl"}
    enhance_res = await client.post(
        "/api/v1/studio/enhance",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert enhance_res.status_code == 200, enhance_res.text
    return enhance_res.json()["product_id"]


@pytest.mark.asyncio
async def test_pricing_api_endpoint(client: AsyncClient):
    product_id = await _create_priced_product(client)

    # Calculate pricing
    pricing_payload = {
        "product_id": product_id,
        "raw_material_cost": 800.0,
        "labor_days": 10.0,
        "daily_wage_rate": 450.0,
    }
    res = await client.post("/api/v1/pricing/calculate", json=pricing_payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["product_id"] == product_id
    assert res_data["recommended_price"] > 0
    assert res_data["cost_breakdown"]["calculated_fair_wage"] == 4500.0
    assert res_data["cost_breakdown"]["raw_material_cost"] == 800.0
    assert res_data["benchmark_max_price"] >= res_data["benchmark_min_price"]
    assert res_data["benchmark_min_price"] <= res_data["recommended_price"] <= res_data["benchmark_max_price"]


@pytest.mark.asyncio
async def test_pricing_api_unknown_product_returns_404(client: AsyncClient):
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": "prod_does_not_exist", "raw_material_cost": 500.0, "labor_days": 5.0},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Product not found"


@pytest.mark.asyncio
async def test_pricing_api_persists_and_upserts_pricing_record(client: AsyncClient, db_session):
    product_id = await _create_priced_product(client)
    payload = {
        "product_id": product_id,
        "raw_material_cost": 700.0,
        "labor_days": 6.0,
        "daily_wage_rate": 450.0,
    }
    res1 = await client.post("/api/v1/pricing/calculate", json=payload)
    assert res1.status_code == 200
    first = res1.json()
    assert first["cost_breakdown"]["calculated_fair_wage"] == 6.0 * 450.0

    res2 = await client.post("/api/v1/pricing/calculate", json=payload)
    assert res2.status_code == 200
    second = res2.json()
    assert second["recommended_price"] == first["recommended_price"]

    from sqlalchemy import select

    from app.models.pricing import ProductPricing

    rows = (await db_session.execute(select(ProductPricing))).scalars().all()
    assert len(rows) == 1, "upsert must update the existing row, not insert duplicates"
    row = rows[0]
    assert str(row.product_id) == product_id
    assert row.raw_material_cost == 700.0
    assert row.calculated_fair_wage == 2700.0
    assert row.final_price == first["recommended_price"]


@pytest.mark.asyncio
async def test_pricing_api_wage_floor_enforced_through_endpoint(client: AsyncClient):
    product_id = await _create_priced_product(client)

    # Sub-200 daily wage is rejected at the schema boundary (ge=200)
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 300.0, "labor_days": 4.0, "daily_wage_rate": 150.0},
    )
    assert res.status_code == 422

    # Above the schema floor but below the statutory minimum -> service clamps to 450
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 300.0, "labor_days": 4.0, "daily_wage_rate": 250.0},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["cost_breakdown"]["daily_wage_rate"] == 450.0
    assert data["cost_breakdown"]["calculated_fair_wage"] == 1800.0


@pytest.mark.asyncio
async def test_pricing_api_rejects_invalid_payloads(client: AsyncClient):
    product_id = await _create_priced_product(client)
    # Negative material cost rejected by schema (ge=0)
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": -100.0, "labor_days": 5.0},
    )
    assert res.status_code == 422
    # Labor days below the 0.25 minimum rejected (ge=0.25)
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 500.0, "labor_days": 0.1},
    )
    assert res.status_code == 422
    # Daily wage below the 200 floor rejected (ge=200)
    res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 500.0, "labor_days": 5.0, "daily_wage_rate": 100.0},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_manual_market_pricing_endpoint_contract(client: AsyncClient):
    res = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "Handmade Clay Pot",
            "description": "A hand-finished clay storage pot.",
            "materials": [{"name": "clay", "quantity": 5, "unit": "kg"}],
            "making_days": 2,
            "location": "Haryana, India",
            "image_data_url": "data:image/jpeg;base64,product-image",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["research_status"] == "fallback"
    assert data["recommended_price"] > 0
    assert "local deterministic pricing model" in data["warning"]


@pytest.mark.asyncio
async def test_market_pricing_uses_researched_inputs_before_calculation(client: AsyncClient, monkeypatch):
    from app.services.market_pricing import market_pricing_service

    captured = {}

    async def _research(**kwargs):
        captured.update(kwargs)
        return {
            "material_prices": [{"name": "clay", "price_per_unit": 200.0}],
            "labour_wage": 700.0,
            "similar_product_prices": [
                {"name": "Comparable clay pot", "price": 2400.0, "source": "Co-op"},
                {"name": "Comparable clay pot 2", "price": 3000.0, "source": "Market"},
            ],
            "sources": [{"name": "Co-op", "url": "https://example.test/co-op"}],
            "warning": None,
            "research_status": "researched",
            "product_understanding": {
                "product": "Handmade Clay Pot",
                "category": "Pottery",
                "material": "Clay",
                "capacity": "2 litres",
                "use_case": "Storage",
                "craftsmanship": "Wheel-thrown and hand-finished",
                "visual_notes": "Glazed floral design",
                "search_keywords": ["handmade clay pot"],
            },
            "estimated_material_cost": {"min": 900.0, "max": 1100.0, "confidence": "Estimated"},
            "estimated_making_time": {"min_hours": 14.0, "max_hours": 18.0, "confidence": "Estimated"},
            "search_queries": ["handmade clay pot India price"],
        }

    monkeypatch.setattr(market_pricing_service, "research_market_data", _research)
    res = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "Handmade Clay Pot",
            "description": "A glazed storage pot with floral design.",
            "materials": [{"name": "clay", "quantity": 5, "unit": "kg"}],
            "making_days": 2,
            "location": "Khurja, Uttar Pradesh",
            "latitude": 28.25,
            "longitude": 77.85,
            "image_data_url": "data:image/jpeg;base64,product-image",
            "raw_material_image_data_url": "data:image/jpeg;base64,clay-image",
        },
    )

    assert res.status_code == 200, res.text
    data = res.json()
    assert captured["description"] == "A glazed storage pot with floral design."
    assert captured["image_data_url"].startswith("data:image/jpeg")
    assert captured["raw_material_image_data_url"].startswith("data:image/jpeg")
    assert captured["location"] == "Khurja, Uttar Pradesh"
    assert captured["latitude"] == 28.25
    assert captured["longitude"] == 77.85
    assert data["material_cost"] == 1000.0
    assert data["labour_cost"] == 1400.0
    assert data["estimated_material_cost"] == 1000.0
    assert data["estimated_labour_cost"] == 1400.0
    assert data["estimated_total_making_cost"] == 2760.0
    assert data["similar_product_market_range"] == {"low": 2400.0, "high": 3000.0}
    assert data["recommended_price"] == 2898.0
    assert data["market_sources"] == data["sources"]


@pytest.mark.asyncio
async def test_manual_market_pricing_validation_errors(client: AsyncClient):
    bad_quantity = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "Bad Product",
            "materials": [{"name": "clay", "quantity": -5, "unit": "kg"}],
            "making_days": 2,
            "location": "Haryana, India",
        },
    )
    assert bad_quantity.status_code == 400

    empty_materials = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "Bad Product",
            "materials": [],
            "making_days": 2,
            "location": "Haryana, India",
        },
    )
    assert empty_materials.status_code == 400

    missing_name = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "",
            "materials": [{"name": "clay", "quantity": 1, "unit": "kg"}],
            "making_days": 2,
            "location": "Haryana, India",
        },
    )
    assert missing_name.status_code == 400


@pytest.mark.asyncio
async def test_manual_market_pricing_handles_search_failures_gracefully(client: AsyncClient, monkeypatch):
    async def _boom(*args, **kwargs):
        raise RuntimeError("gemini unavailable")

    from app.services.market_pricing import market_pricing_service
    monkeypatch.setattr(market_pricing_service, "research_market_data", _boom)

    res = await client.post(
        "/api/v1/pricing/calculate-market",
        json={
            "product_name": "Handmade Bamboo Basket",
            "materials": [
                {"name": "bamboo", "quantity": 2, "unit": "kg"},
                {"name": "natural rope", "quantity": 0.5, "unit": "kg"},
            ],
            "making_days": 3,
            "location": "Haryana, India",
            "description": "A handwoven bamboo basket.",
            "image_data_url": "data:image/jpeg;base64,product-image",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["research_status"] == "fallback"
    assert data["recommended_price"] > 0
    assert "local deterministic pricing model" in data["warning"]


@pytest.mark.asyncio
async def test_fair_wage_calculate_price_endpoint_contract(client: AsyncClient):
    """POST /api/v1/pricing/calculate-price — stateless hourly-wage engine route."""
    res = await client.post(
        "/api/v1/pricing/calculate-price",
        json={
            "raw_material_cost": 500.0,
            "labor_hours": 10.0,
            "state_code": "DL",
            "is_gi_tagged": True,
            "craft_category": "handloom",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["state_code"] == "DL"
    assert data["state_name"] == "Delhi"
    assert data["hourly_wage_rate"] == 95.0
    assert data["gi_heritage_multiplier"] == 1.15
    assert data["statutory_floor_enforced"] is True
    assert data["fair_retail_price"] >= data["statutory_floor_price"]
    assert data["bulk_wholesale_price"] <= data["fair_retail_price"]
    assert data["cost_breakdown"]["calculated_fair_wage"] == 950.0
    assert "Delhi" in data["pricing_formula_summary"]

    # Sub-50 wage override rejected at the schema boundary (ge=50)
    res = await client.post(
        "/api/v1/pricing/calculate-price",
        json={
            "raw_material_cost": 500.0,
            "labor_hours": 10.0,
            "state_code": "DL",
            "hourly_wage_override": 30.0,
        },
    )
    assert res.status_code == 422

    # Above the schema floor but below the DL statutory floor -> clamped to 95
    res = await client.post(
        "/api/v1/pricing/calculate-price",
        json={
            "raw_material_cost": 500.0,
            "labor_hours": 10.0,
            "state_code": "DL",
            "hourly_wage_override": 60.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["hourly_wage_rate"] == 95.0
    assert data["statutory_floor_enforced"] is True
