from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.services.pricing_service import pricing_service
from app.models.product import Product
from app.models.pricing import ProductPricing
from app.schemas.pricing import (
    PricingCalculateRequest,
    PricingCalculateResponse,
    CostBreakdown,
    FairWagePricingRequest,
    FairWagePricingResponse,
)

router = APIRouter(tags=["Dynamic Pricing Engine & Fair-Wage Calculator"])


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
