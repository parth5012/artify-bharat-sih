from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.pricing import ProductPricing
from app.models.product import Product
from app.schemas.pricing import (
    CostBreakdown,
    FairWagePricingRequest,
    FairWagePricingResponse,
    PricingCalculateRequest,
    PricingCalculateResponse,
)
from app.services.market_pricing import VALID_UNITS, market_pricing_service
from app.services.pricing_service import pricing_service

router = APIRouter(tags=["Dynamic Pricing Engine & Fair-Wage Calculator"])


class MaterialPricingInput(BaseModel):
    name: str = Field(default="")
    quantity: float = Field(default=0.0)
    unit: str = Field(default="kg")


class MarketPricingRequest(BaseModel):
    product_name: str = Field(default="")
    description: str = Field(default="")
    materials: List[MaterialPricingInput] = Field(default_factory=list)
    making_days: float = Field(default=0.0)
    location: str = Field(default="")
    image_data_url: str | None = Field(default=None)
    raw_material_image_data_url: str | None = Field(default=None)
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)
    weight_kg: float | None = Field(default=None)


class MarketPricingResponse(BaseModel):
    product_name: str
    estimated_cost: float
    material_cost: float
    labour_cost: float
    overhead_cost: float
    suggested_price_range: Dict[str, float]
    market_reference: Dict[str, float]
    sources: List[Dict[str, Any]] = []
    market_sources: List[Dict[str, Any]] = []
    product_understanding: Dict[str, Any] = {}
    estimated_material_cost: float
    estimated_labour_cost: float
    estimated_total_making_cost: float
    material_cost_estimate: Dict[str, Any] = {}
    making_time_estimate: Dict[str, Any] = {}
    similar_product_market_range: Dict[str, float]
    recommended_price: float
    research_status: str
    search_queries: List[str] = []
    warning: str | None = None


@router.post("/calculate-price", response_model=FairWagePricingResponse, status_code=status.HTTP_200_OK)
@router.post("/pricing/calculate-price", response_model=FairWagePricingResponse, status_code=status.HTTP_200_OK)
async def calculate_fair_wage_price(payload: FairWagePricingRequest):
    """
    Fair-Wage Dynamic Pricing Engine Route (SIH PS 26090):
    Calculates fair retail and bulk wholesale prices based on:
    - Raw material costs
    - Labor hours invested
    - State-specific minimum wage floors (e.g., ₹85/hr for Haryana/HR)
    - Craft heritage multiplier (1.15x for GI-tagged items)
    Returns detailed 4-part transparent cost breakdown:
    (1) Materials, (2) Guaranteed Fair Labor Wage, (3) Logistics/Packaging Overhead, (4) Artisan Net Profit.
    """
    result = pricing_service.calculate_fair_wage_pricing(
        raw_material_cost=payload.raw_material_cost,
        labor_hours=payload.labor_hours,
        state_code=payload.state_code,
        hourly_wage_override=payload.hourly_wage_override,
        is_gi_tagged=payload.is_gi_tagged,
        craft_category=payload.craft_category or "handloom",
        visual_complexity=payload.visual_complexity if payload.visual_complexity is not None else 0.75,
    )

    cost_info = result["cost_breakdown"]
    return FairWagePricingResponse(
        state_code=result["state_code"],
        state_name=result["state_name"],
        hourly_wage_rate=result["hourly_wage_rate"],
        statutory_floor_enforced=result["statutory_floor_enforced"],
        is_gi_tagged=result["is_gi_tagged"],
        gi_heritage_multiplier=result["gi_heritage_multiplier"],
        statutory_floor_price=result["statutory_floor_price"],
        fair_retail_price=result["fair_retail_price"],
        bulk_wholesale_price=result["bulk_wholesale_price"],
        artisan_net_profit=result["artisan_net_profit"],
        direct_realization_percent=result["direct_realization_percent"],
        cost_breakdown=CostBreakdown(**cost_info),
        pricing_formula_summary=result["pricing_formula_summary"],
    )


@router.post("/pricing/calculate-market", response_model=MarketPricingResponse)
async def calculate_market_pricing(payload: MarketPricingRequest):
    """Manual artisan pricing route: product attributes + current market context -> deterministic suggested price range."""
    product_name = (payload.product_name or "").strip()
    if not product_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product name cannot be empty")
    if not (payload.description or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product description cannot be empty")
    if not (payload.image_data_url or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product image is required")

    materials = payload.materials or []
    if not materials:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Materials cannot be empty")

    normalized_materials: List[Dict[str, Any]] = []
    for item in materials:
        material_name = (item.name or "").strip()
        if not material_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material name cannot be empty")
        quantity = float(item.quantity)
        if quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than 0")
        unit = (item.unit or "kg").strip() or "kg"
        normalized_unit = unit.lower().replace(".", "").replace("-", " ")
        if normalized_unit not in VALID_UNITS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unit '{unit}' is invalid")
        normalized_materials.append({"name": material_name, "quantity": quantity, "unit": unit})

    if float(payload.making_days) <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Making days must be greater than 0")

    location = (payload.location or "").strip()
    if not location:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location should be present")

    try:
        return await market_pricing_service.calculate_market_pricing(
            product_name=product_name,
            materials=normalized_materials,
            making_days=float(payload.making_days),
            location=location,
            description=payload.description or "",
            image_data_url=payload.image_data_url,
            raw_material_image_data_url=payload.raw_material_image_data_url,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc) if str(exc) else "Current market research is unavailable. No final price was calculated.",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive safety net
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) if str(exc) else "Unable to calculate a fair market-aligned price.",
        ) from exc


@router.post("/pricing/calculate", response_model=PricingCalculateResponse)
async def calculate_dynamic_pricing(payload: PricingCalculateRequest, db: AsyncSession = Depends(get_db)):
    """
    Product-linked Dynamic Pricing Engine:
    Correlates product record, raw material cost, labor days invested, visual complexity, and market benchmarks.
    Persists pricing record and returns recommended price window.
    """
    stmt = select(Product).where(Product.id == payload.product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Run Pricing Service
    pricing_result = pricing_service.calculate_pricing(
        raw_material_cost=payload.raw_material_cost,
        labor_days=payload.labor_days,
        visual_complexity=product.visual_complexity_score,
        craft_category=product.craft_category,
        daily_wage_rate=payload.daily_wage_rate or 450.0,
    )

    cost_info = pricing_result["cost_breakdown"]

    # Upsert ProductPricing model
    pricing_stmt = select(ProductPricing).where(ProductPricing.product_id == product.id)
    p_res = await db.execute(pricing_stmt)
    existing_pricing = p_res.scalar_one_or_none()

    if existing_pricing:
        existing_pricing.raw_material_cost = payload.raw_material_cost
        existing_pricing.labor_days = payload.labor_days
        existing_pricing.daily_fair_wage_rate = cost_info["daily_wage_rate"]
        existing_pricing.calculated_fair_wage = cost_info["calculated_fair_wage"]
        existing_pricing.benchmark_min_price = pricing_result["benchmark_min_price"]
        existing_pricing.benchmark_max_price = pricing_result["benchmark_max_price"]
        existing_pricing.recommended_price = pricing_result["recommended_price"]
        existing_pricing.final_price = pricing_result["recommended_price"]
        existing_pricing.artisan_net_profit = cost_info["artisan_net_profit"]
    else:
        pricing_record = ProductPricing(
            product_id=product.id,
            raw_material_cost=payload.raw_material_cost,
            labor_days=payload.labor_days,
            daily_fair_wage_rate=cost_info["daily_wage_rate"],
            calculated_fair_wage=cost_info["calculated_fair_wage"],
            benchmark_min_price=pricing_result["benchmark_min_price"],
            benchmark_max_price=pricing_result["benchmark_max_price"],
            recommended_price=pricing_result["recommended_price"],
            final_price=pricing_result["recommended_price"],
            artisan_net_profit=cost_info["artisan_net_profit"],
            model_metadata={"source": pricing_result["market_benchmark_source"]},
        )
        db.add(pricing_record)

    product.status = "priced"
    await db.commit()

    return PricingCalculateResponse(
        product_id=product.id,
        benchmark_min_price=pricing_result["benchmark_min_price"],
        benchmark_max_price=pricing_result["benchmark_max_price"],
        recommended_price=pricing_result["recommended_price"],
        cost_breakdown=CostBreakdown(**cost_info),
        visual_complexity_factor=product.visual_complexity_score,
        market_benchmark_source=pricing_result["market_benchmark_source"],
    )
