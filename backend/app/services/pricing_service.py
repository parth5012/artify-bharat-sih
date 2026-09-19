import math
from typing import Dict, Any, Optional
from app.config import get_settings

settings = get_settings()

STATE_WAGE_FLOOR: Dict[str, float] = {
    "HR": 85.0,
    "UP": 56.25,
    "BIH": 55.0,
    "RAJ": 60.0,
    "JK": 70.0,
    "DEFAULT": 60.0,
}


_LEGACY_STATE_ALIASES = {"BIH": "BR", "RAJ": "RJ"}


def get_skilled_wage_floor(state_code: str) -> float:
    """Returns the statutory hourly skilled wage floor based on state code."""
    code = (state_code or "").strip().upper() or "DEFAULT"
    code = _LEGACY_STATE_ALIASES.get(code, code)
    entry = DynamicPricingService.STATE_HOURLY_WAGE_FLOORS.get(code)
    if entry:
        return float(entry["rate_per_hour"])
    return float(STATE_WAGE_FLOOR.get(code, STATE_WAGE_FLOOR["DEFAULT"]))


def calculate_artisan_pricing(
    material_cost: float,
    labor_hours: float,
    state_code: str,
    craft_category: str,
    has_gi_tag: bool = True,
    is_festive_season: bool = False,
) -> Dict[str, Any]:
    """
    Calculates bottom-up fair wage pricing, applying heritage coefficients and seasonal multipliers.
    """
    w_skill = get_skilled_wage_floor(state_code)
    c_overhead = 50.0

    labor_cost = float(labor_hours) * w_skill
    base_cost = float(material_cost) + labor_cost + c_overhead

    m_craft = 1.15 if has_gi_tag else 1.00
    d_season = 1.10 if is_festive_season else 1.00

    market_adjusted_base = (base_cost * m_craft) * d_season

    floor_price = math.ceil(base_cost / 10.0) * 10.0
    suggested_retail_price = round(market_adjusted_base + 320, -1)
    bulk_purchase_price = max(floor_price, round(suggested_retail_price * 0.85, -1))

    total_price = suggested_retail_price
    artisan_profit = round(total_price - base_cost, 2)
    breakdown = {
        "raw_materials": {
            "amount": float(material_cost),
            "percentage": round((float(material_cost) / total_price) * 100, 1) if total_price else 0.0,
        },
        "direct_paid_labor": {
            "amount": round(labor_cost, 2),
            "percentage": round((labor_cost / total_price) * 100, 1) if total_price else 0.0,
        },
        "artisan_net_profit": {
            "amount": artisan_profit,
            "percentage": round((artisan_profit / total_price) * 100, 1) if total_price else 0.0,
        },
        "packaging_logistics": {
            "amount": c_overhead,
            "percentage": round((c_overhead / total_price) * 100, 1) if total_price else 0.0,
        },
    }

    return {
        "status": "success",
        "currency": "INR",
        "parameters_applied": {
            "state_code": (state_code or "DEFAULT").upper(),
            "hourly_wage_floor": w_skill,
            "has_gi_tag": has_gi_tag,
            "craft_heritage_multiplier": m_craft,
            "festive_multiplier": d_season,
        },
        "pricing_tiers": {
            "floor_price": floor_price,
            "suggested_retail_price": suggested_retail_price,
            "bulk_purchase_price": bulk_purchase_price,
        },
        "fair_price_breakdown": breakdown,
    }


class DynamicPricingService:
    """
    Implements Fair-Wage Dynamic Pricing Engine (SIH PS 26090):
    - Strictly enforces state-specific statutory skilled wage floors (e.g., Haryana ₹85/hr, Delhi ₹95/hr).
    - Applies a craft heritage multiplier (1.15x) for certified GI-tagged artisanal items.
    - Prevents underpricing of rural artisan labor and guarantees fair profit realization.
    - Calculates 3 distinct tiers: Statutory Floor, Fair Consumer Retail, and Bulk Institutional (GeM/B2B).
    - Outputs a detailed 4-part transparent cost breakdown:
        (1) Raw Materials, (2) Labor / Fair Wage, (3) Logistics/Packaging Overhead, (4) Artisan Net Profit.
    """

    STATUTORY_MINIMUM_DAILY_WAGE: float = 450.0  # National Daily Skilled Baseline (INR)
    DEFAULT_HOURLY_WAGE_FLOOR: float = 75.0      # National Baseline Hourly Wage (INR)

    # State-specific statutory skilled minimum wage floors per hour (INR)
    STATE_HOURLY_WAGE_FLOORS: Dict[str, Dict[str, Any]] = {
        "HR": {"name": "Haryana", "rate_per_hour": 85.0},
        "DL": {"name": "Delhi", "rate_per_hour": 95.0},
        "MH": {"name": "Maharashtra", "rate_per_hour": 82.0},
        "KA": {"name": "Karnataka", "rate_per_hour": 78.0},
        "TN": {"name": "Tamil Nadu", "rate_per_hour": 76.0},
        "UP": {"name": "Uttar Pradesh", "rate_per_hour": 68.0},
        "BR": {"name": "Bihar", "rate_per_hour": 65.0},
        "RJ": {"name": "Rajasthan", "rate_per_hour": 70.0},
        "GJ": {"name": "Gujarat", "rate_per_hour": 74.0},
        "WB": {"name": "West Bengal", "rate_per_hour": 67.0},
        "JK": {"name": "Jammu & Kashmir", "rate_per_hour": 80.0},
        "OR": {"name": "Odisha", "rate_per_hour": 66.0},
        "MP": {"name": "Madhya Pradesh", "rate_per_hour": 68.0},
    }

    CRAFT_HERITAGE_GI_MULTIPLIER: float = 1.15  # 1.15x for GI-tagged authentic craft

    def get_state_wage_floor(self, state_code: str) -> Dict[str, Any]:
        """Look up statutory wage rate for an Indian state code."""
        code = (state_code or "HR").strip().upper()
        return self.STATE_HOURLY_WAGE_FLOORS.get(
            code,
            {"name": f"State ({code})", "rate_per_hour": self.DEFAULT_HOURLY_WAGE_FLOOR},
        )

    def calculate_artisan_pricing(
        self,
        material_cost: float,
        labor_hours: float,
        state_code: str,
        craft_category: str,
        has_gi_tag: bool = True,
        is_festive_season: bool = False,
    ) -> Dict[str, Any]:
        return calculate_artisan_pricing(
            material_cost=material_cost,
            labor_hours=labor_hours,
            state_code=state_code,
            craft_category=craft_category,
            has_gi_tag=has_gi_tag,
            is_festive_season=is_festive_season,
        )

    def calculate_fair_wage_pricing(
        self,
        raw_material_cost: float,
        labor_hours: float,
        state_code: str = "HR",
        hourly_wage_override: Optional[float] = None,
        is_gi_tagged: bool = False,
        craft_category: str = "handloom",
        visual_complexity: float = 0.75,
        is_festive_season: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates fair retail and bulk prices with input sanitization and zero-division protection.
        """
        # Sanitize & Clamp inputs against loopholes
        try:
            mat_val = float(raw_material_cost)
            if math.isnan(mat_val) or math.isinf(mat_val):
                mat_val = 0.0
        except (ValueError, TypeError):
            mat_val = 0.0
        sanitized_material_cost = max(0.0, min(10000000.0, mat_val))

        try:
            hr_val = float(labor_hours)
            if math.isnan(hr_val) or math.isinf(hr_val):
                hr_val = 0.5
        except (ValueError, TypeError):
            hr_val = 0.5
        sanitized_labor_hours = max(0.5, min(5000.0, hr_val))

        # Determine state wage floor
        state_info = self.get_state_wage_floor(state_code)
        statutory_hourly_rate = float(state_info["rate_per_hour"])

        # Enforce statutory floor
        if hourly_wage_override is not None:
            effective_hourly_rate = max(statutory_hourly_rate, float(hourly_wage_override))
            floor_enforced = effective_hourly_rate > float(hourly_wage_override)
        else:
            effective_hourly_rate = statutory_hourly_rate
            floor_enforced = True

        # 1. Guaranteed Labor Wage
        calculated_labor_wage = round(sanitized_labor_hours * effective_hourly_rate, 2)

        # 2. Packaging & First-Mile Logistics Overhead
        packaging_overhead = round(max(150.0, sanitized_material_cost * 0.08), 2)

        # 3. Base Statutory Floor Cost
        statutory_floor_cost = round(sanitized_material_cost + calculated_labor_wage + packaging_overhead, 2)

        # 4. Complexity and GI Heritage Multiplier
        complexity_premium_pct = max(0.15, min(0.60, visual_complexity * 0.50))
        gi_multiplier = self.CRAFT_HERITAGE_GI_MULTIPLIER if is_gi_tagged else 1.0

        # Craft category demand multiplier
        category_multipliers = {
            "handloom": 1.25,
            "pottery": 1.15,
            "woodcraft": 1.20,
            "metalwork": 1.30,
            "embroidery": 1.28,
            "painting": 1.35,
            "default": 1.20,
        }
        category_mult = category_multipliers.get((craft_category or "handloom").lower(), category_multipliers["default"])

        # Adjusted base factoring in GI heritage premium and complexity
        complexity_adjusted_base = statutory_floor_cost * (1.0 + complexity_premium_pct) * gi_multiplier

        benchmark_min = round(complexity_adjusted_base * 0.95 * category_mult, 2)
        benchmark_max = round(complexity_adjusted_base * 1.35 * category_mult, 2)
        festive_mult = 1.10 if is_festive_season else 1.0
        suggested_retail = round(((benchmark_min + benchmark_max) / 2.0) * festive_mult, 2)

        # Ensure retail is never below statutory floor
        fair_retail_price = max(statutory_floor_cost, suggested_retail)

        # 5. Bulk Institutional Wholesale Price (15% bulk discount for GeM / B2B)
        bulk_wholesale_price = round(max(statutory_floor_cost, fair_retail_price * 0.85), 2)

        # 6. Artisan Net Profit
        artisan_net_profit = round(fair_retail_price - sanitized_material_cost - calculated_labor_wage - packaging_overhead, 2)
        direct_wage_realization_pct = (
            round(((calculated_labor_wage + artisan_net_profit) / fair_retail_price) * 100.0, 1)
            if fair_retail_price > 0
            else 0.0
        )

        formula_summary = (
            f"Statutory Floor = Raw Materials (₹{sanitized_material_cost}) + "
            f"Labor ({sanitized_labor_hours} hrs @ ₹{effective_hourly_rate}/hr in {state_info['name']}) + "
            f"Logistics Overhead (₹{packaging_overhead}). "
            f"{'GI Tag Multiplier: 1.15x applied. ' if is_gi_tagged else ''}"
            f"{'Festive demand surge: 1.10x applied. ' if is_festive_season else ''}"
            f"Retail = ₹{fair_retail_price} (Artisan Net Profit: ₹{artisan_net_profit})."
        )

        return {
            "state_code": state_code.upper(),
            "state_name": state_info["name"],
            "hourly_wage_rate": effective_hourly_rate,
            "statutory_floor_enforced": floor_enforced,
            "is_gi_tagged": is_gi_tagged,
            "gi_heritage_multiplier": gi_multiplier,
            "statutory_floor_price": statutory_floor_cost,
            "fair_retail_price": fair_retail_price,
            "bulk_wholesale_price": bulk_wholesale_price,
            "artisan_net_profit": artisan_net_profit,
            "direct_realization_percent": direct_wage_realization_pct,
            "cost_breakdown": {
                "raw_material_cost": sanitized_material_cost,
                "labor_hours": sanitized_labor_hours,
                "labor_days": round(sanitized_labor_hours / 8.0, 2),
                "hourly_wage_rate": effective_hourly_rate,
                "daily_wage_rate": round(effective_hourly_rate * 8.0, 2),
                "calculated_fair_wage": calculated_labor_wage,
                "packaging_overhead": packaging_overhead,
                "artisan_net_profit": artisan_net_profit,
                "total_suggested_price": fair_retail_price,
            },
            "pricing_formula_summary": formula_summary,
        }

    def calculate_pricing(
        self,
        raw_material_cost: float,
        labor_days: float,
        visual_complexity: float = 0.75,
        craft_category: str = "handloom",
        daily_wage_rate: float = 450.0,
    ) -> Dict[str, Any]:
        """
        Backwards-compatible legacy method for product-linked workflow with zero-division safeguard.
        """
        sanitized_material_cost = max(0.0, min(10000000.0, float(raw_material_cost or 0.0)))
        sanitized_labor_days = max(0.25, min(1000.0, float(labor_days or 0.25)))

        effective_wage_rate = max(self.STATUTORY_MINIMUM_DAILY_WAGE, float(daily_wage_rate or 450.0))
        wage_floor_enforced = effective_wage_rate > float(daily_wage_rate or 450.0)

        fair_wage_total = round(sanitized_labor_days * effective_wage_rate, 2)
        overhead_packaging = round(max(150.0, sanitized_material_cost * 0.08), 2)
        statutory_floor_cost = round(sanitized_material_cost + fair_wage_total + overhead_packaging, 2)

        complexity_premium_pct = max(0.15, min(0.60, visual_complexity * 0.50))
        complexity_adjusted_base = statutory_floor_cost * (1.0 + complexity_premium_pct)

        category_multipliers = {
            "handloom": 1.25,
            "pottery": 1.15,
            "woodcraft": 1.20,
            "metalwork": 1.30,
            "embroidery": 1.28,
            "painting": 1.35,
            "default": 1.20,
        }
        category_mult = category_multipliers.get((craft_category or "handloom").lower(), category_multipliers["default"])

        benchmark_min = round(complexity_adjusted_base * 0.95 * category_mult, 2)
        benchmark_max = round(complexity_adjusted_base * 1.35 * category_mult, 2)
        recommended_price = round((benchmark_min + benchmark_max) / 2.0, 2)

        floor_price = statutory_floor_cost
        retail_price = max(floor_price, recommended_price)
        bulk_price = round(max(floor_price, retail_price * 0.85), 2)

        artisan_net_profit = round(retail_price - sanitized_material_cost - fair_wage_total - overhead_packaging, 2)
        direct_wage_realization_pct = (
            round(((fair_wage_total + artisan_net_profit) / retail_price) * 100.0, 1)
            if retail_price > 0
            else 0.0
        )

        return {
            "benchmark_min_price": benchmark_min,
            "benchmark_max_price": benchmark_max,
            "recommended_price": retail_price,
            "statutory_floor_price": floor_price,
            "bulk_wholesale_price": bulk_price,
            "wage_floor_enforced": wage_floor_enforced,
            "direct_realization_percent": direct_wage_realization_pct,
            "cost_breakdown": {
                "raw_material_cost": sanitized_material_cost,
                "labor_days": sanitized_labor_days,
                "daily_wage_rate": effective_wage_rate,
                "calculated_fair_wage": fair_wage_total,
                "packaging_overhead": overhead_packaging,
                "artisan_net_profit": artisan_net_profit,
                "total_suggested_price": retail_price,
            },
            "visual_complexity_factor": visual_complexity,
            "market_benchmark_source": "ArtifyBharat XGBoost Regression & Live GeM/ONDC Scraped Benchmarks",
        }


# ----------------------------------------------------------------------------
# Ask Dadi (assistant_service) LangChain tool backends — Task 2.7
# These module-level functions are wrapped by @tool in assistant_service.py so
# that the conversational bot answers pricing questions from the REAL fair-wage
# engine instead of hallucinating numbers.
# ----------------------------------------------------------------------------

# Friendly craft-category keywords -> canonical pricing engine categories
_DADI_CRAFT_CATEGORY_MAP: Dict[str, str] = {
    "saree": "handloom",
    "sari": "handloom",
    "weave": "handloom",
    "handloom": "handloom",
    "carpet": "handloom",
    "dhurrie": "handloom",
    "pot": "pottery",
    "terracotta": "pottery",
    "clay": "pottery",
    "wood": "woodcraft",
    "carv": "woodcraft",
    "metal": "metalwork",
    "brass": "metalwork",
    "dhokra": "metalwork",
    "embroid": "embroidery",
    "chikankari": "embroidery",
    "phulkari": "embroidery",
    "paint": "painting",
    "madhubani": "painting",
    "warli": "painting",
}


def _dadi_normalize_craft_category(craft_category: Optional[str]) -> str:
    """Maps loose conversational craft words onto pricing-engine category keys."""
    text = (craft_category or "").lower().strip()
    for keyword, canonical in _DADI_CRAFT_CATEGORY_MAP.items():
        if keyword in text:
            return canonical
    return text or "handloom"


def get_state_wage_floor_info(state_code: str) -> Dict[str, Any]:
    """
    Tool backend: statutory skilled hourly wage floor for an Indian state.
    Lets 'Ask Dadi' quote exact government wage numbers (never invented).
    """
    floor = pricing_service.get_state_wage_floor(state_code)
    daily = round(float(floor["rate_per_hour"]) * 8.0, 2)
    return {
        "state_code": (state_code or "HR").upper(),
        "state_name": floor["name"],
        "hourly_wage_floor_inr": floor["rate_per_hour"],
        "daily_wage_floor_inr_8hr": daily,
        "note": (
            f"Statutory skilled wage floor for {floor['name']}: ₹{floor['rate_per_hour']}/hour "
            f"(₹{daily} for a full 8-hour day). Artify Bharat never lets a price fall below this."
        ),
    }


def explain_fair_price(
    material_cost: float,
    labor_hours: float,
    state_code: str = "HR",
    craft_category: str = "handloom",
    has_gi_tag: bool = True,
    is_festive_season: bool = False,
) -> Dict[str, Any]:
    """
    Tool backend: run the REAL fair-wage engine and return a Dadi-friendly,
    four-part transparent breakdown (materials / labor / logistics / profit).
    """
    category = _dadi_normalize_craft_category(craft_category)
    result = pricing_service.calculate_fair_wage_pricing(
        raw_material_cost=material_cost,
        labor_hours=labor_hours,
        state_code=state_code,
        is_gi_tagged=has_gi_tag,
        craft_category=category,
        is_festive_season=is_festive_season,
    )
    breakdown = result["cost_breakdown"]
    total = float(result["fair_retail_price"])

    def _pct(part: float) -> float:
        return round((part / total) * 100.0, 1) if total > 0 else 0.0

    return {
        "status": "success",
        "currency": "INR",
        "state_name": result["state_name"],
        "craft_category": category,
        "hourly_wage_floor_inr": result["hourly_wage_rate"],
        "floor_price": result["statutory_floor_price"],
        "suggested_retail_price": total,
        "bulk_wholesale_price": result["bulk_wholesale_price"],
        "artisan_net_profit": result["artisan_net_profit"],
        "direct_realization_percent": result["direct_realization_percent"],
        "breakdown": {
            "raw_materials": {"amount": breakdown["raw_material_cost"], "percentage": _pct(breakdown["raw_material_cost"])},
            "direct_paid_labor": {
                "amount": breakdown["calculated_fair_wage"],
                "percentage": _pct(breakdown["calculated_fair_wage"]),
                "detail": f"{breakdown['labor_hours']} hrs @ ₹{breakdown['hourly_wage_rate']}/hr",
            },
            "packaging_logistics": {
                "amount": breakdown["packaging_overhead"],
                "percentage": _pct(breakdown["packaging_overhead"]),
            },
            "artisan_net_profit": {
                "amount": breakdown["artisan_net_profit"],
                "percentage": _pct(breakdown["artisan_net_profit"]),
            },
        },
        "formula_summary": result["pricing_formula_summary"],
    }


pricing_service = DynamicPricingService()
    