import json
import math
import re
from typing import Any, Dict, Iterable, List, Optional

import httpx

from app.config import get_settings

settings = get_settings()

VALID_UNITS = {
    "kg": 1.0,
    "kilogram": 1.0,
    "kilograms": 1.0,
    "g": 0.001,
    "gram": 0.001,
    "grams": 0.001,
    "piece": 1.0,
    "pieces": 1.0,
    "pcs": 1.0,
    "m": 1.0,
    "meter": 1.0,
    "metre": 1.0,
    "meters": 1.0,
    "metres": 1.0,
    "cm": 0.01,
    "centimeter": 0.01,
    "centimetre": 0.01,
    "litre": 1.0,
    "liter": 1.0,
    "litres": 1.0,
    "liters": 1.0,
    "ltr": 1.0,
    "bundle": 1.0,
    "bundles": 1.0,
    "set": 1.0,
    "sets": 1.0,
    "box": 1.0,
    "boxes": 1.0,
    "pack": 1.0,
    "packs": 1.0,
    "l": 1.0,
    "lit": 1.0,
}

FALLBACK_MATERIAL_PRICES: Dict[str, float] = {
    "clay": 45.0,
    "bamboo": 80.0,
    "rope": 120.0,
    "natural rope": 110.0,
    "wood": 95.0,
    "cotton": 180.0,
    "silk": 420.0,
    "cotton yarn": 220.0,
    "jute": 95.0,
    "metal": 210.0,
    "brass": 240.0,
    "terracotta": 50.0,
    "leather": 300.0,
    "paper": 70.0,
    "paint": 160.0,
    "dye": 140.0,
    "thread": 160.0,
    "fabric": 230.0,
    "stone": 110.0,
    "cane": 90.0,
}

STATE_LABOUR_RATES: Dict[str, float] = {
    "haryana": 450.0,
    "delhi": 500.0,
    "uttar pradesh": 420.0,
    "bihar": 390.0,
    "rajasthan": 410.0,
    "punjab": 430.0,
    "gujarat": 440.0,
    "madhya pradesh": 400.0,
    "west bengal": 415.0,
    "odisha": 390.0,
    "karnataka": 410.0,
    "maharashtra": 470.0,
    "tamil nadu": 440.0,
}


def _normalize_material_name(value: str) -> str:
    text = (value or "").strip().lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _normalize_unit(value: str) -> str:
    text = (value or "").strip().lower()
    return text.replace(".", "").replace("-", " ")


class MarketPricingService:
    def _infer_labour_rate(self, location: str) -> float:
        loc = (location or "").lower()
        for state_name, rate in STATE_LABOUR_RATES.items():
            if state_name in loc:
                return float(rate)
        return 450.0

    def _fallback_material_price(self, material_name: str) -> float:
        normalized = _normalize_material_name(material_name)
        for key, value in FALLBACK_MATERIAL_PRICES.items():
            if normalized == key or normalized.startswith(key) or key in normalized:
                return float(value)
        if not normalized:
            return 0.0
        return 90.0

    def _coerce_float(self, value: Any, default: float = 0.0) -> float:
        try:
            coerced = float(value)
        except (TypeError, ValueError):
            return default
        if math.isnan(coerced) or math.isinf(coerced):
            return default
        return coerced

    def _local_fallback_market_data(
        self,
        product_name: str,
        materials: Iterable[Dict[str, Any]],
        location: str,
        warning: str = "Online market research is unavailable. The estimate uses the local deterministic pricing model.",
    ) -> Dict[str, Any]:
        materials_list = list(materials)
        material_prices = [
            {
                "name": str(item.get("name") or ""),
                "price_per_unit": self._fallback_material_price(str(item.get("name") or "")),
            }
            for item in materials_list
            if isinstance(item, dict)
        ]
        return {
            "material_prices": material_prices,
            "labour_wage": self._infer_labour_rate(location),
            "similar_product_prices": [],
            "sources": [],
            "warning": warning,
            "research_status": "fallback",
            "product_understanding": {
                "product": product_name,
                "category": "Estimated craft product",
                "material": ", ".join(item["name"] for item in material_prices if item["name"]),
                "capacity": "Estimated",
                "use_case": "Estimated use",
                "search_keywords": [product_name],
            },
            "estimated_material_cost": {"min": 0.0, "max": 0.0, "confidence": "Low"},
            "estimated_making_time": {"min_hours": 0.0, "max_hours": 0.0, "confidence": "Low"},
            "search_queries": [],
        }

    async def research_market_data(
        self,
        product_name: str,
        materials: Iterable[Dict[str, Any]],
        location: str,
        description: str = "",
        image_data_url: str | None = None,
        raw_material_image_data_url: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> Dict[str, Any]:
        materials_list = list(materials)
        fallback = self._local_fallback_market_data(product_name, materials_list, location)

        if not settings.GEMINI_API_KEY:
            return fallback

        material_summary = json.dumps(materials_list, ensure_ascii=False)
        prompt = (
            "You are a constrained pricing researcher for Indian handmade crafts. "
            "Use BOTH the product image and the artisan description to understand the product before pricing. "
            "Return ONLY valid JSON with keys: "
            "product_understanding, estimated_material_cost, estimated_making_time, search_queries, material_prices, "
            "labour_wage, similar_product_prices, sources. "
            "Do not invent exact numbers. If uncertain, use 'Estimated' or values with a wide range. "
            f"Location: {location} (latitude={latitude}, longitude={longitude}). Product name: {product_name}. Description: {description or 'No description provided'}. "
            f"Materials: {material_summary}. "
            "The product understanding must include: product, category, material, capacity, use_case, craftsmanship, visual_notes, and search_keywords. "
            "The estimated_material_cost must include min, max, and confidence. The estimated_making_time must include min_hours, max_hours, and confidence. "
            "Search queries should be 3 to 6 relevant search strings for similar Indian handmade products. "
            "similar_product_prices should be comparable product examples with price, name, source, url, material, capacity, and handmade_flag. "
            "Do not claim exact artisan cost or exact hours. Keep prices grounded in market references and use empty arrays when the evidence is weak."
        )

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            f"?key={settings.GEMINI_API_KEY}"
        )

        try:
            parts = [{"text": prompt}]
            parsed_image = None
            if image_data_url:
                header, _, encoded = str(image_data_url).partition(",")
                mime_type = "image/jpeg"
                if header.startswith("data:") and ";" in header:
                    mime_type = header.split(":", 1)[1].split(";", 1)[0]
                if encoded:
                    parsed_image = {"mime_type": mime_type, "data": encoded}
            if parsed_image:
                parts.append({"inline_data": parsed_image})
            if raw_material_image_data_url:
                header, _, encoded = str(raw_material_image_data_url).partition(",")
                mime_type = "image/jpeg"
                if header.startswith("data:") and ";" in header:
                    mime_type = header.split(":", 1)[1].split(";", 1)[0]
                if encoded:
                    parts.append({"inline_data": {"mime_type": mime_type, "data": encoded}})

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json={
                        "contents": [{"parts": parts}],
                        "tools": [{"googleSearch": {}}],
                        "generationConfig": {
                            "temperature": 0,
                            "responseMimeType": "application/json",
                        },
                    },
                )
                response.raise_for_status()
                payload = response.json()

            text = ""
            for candidate in payload.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    content = part.get("text")
                    if content:
                        text = content
                        break
                if text:
                    break

            if not text:
                return fallback | {"warning": "Gemini returned no market data. Using local pricing fallback."}

            data = json.loads(text)
            if not isinstance(data, dict):
                raise ValueError("Gemini response was not a JSON object")

            material_prices = data.get("material_prices") or []
            similar_prices = data.get("similar_product_prices") or []
            sources = data.get("sources") or []
            labour_wage = self._coerce_float(data.get("labour_wage"), fallback["labour_wage"])

            product_understanding = data.get("product_understanding") or fallback["product_understanding"]
            estimated_material_cost = data.get("estimated_material_cost") or fallback["estimated_material_cost"]
            estimated_making_time = data.get("estimated_making_time") or fallback["estimated_making_time"]

            return {
                "material_prices": material_prices if isinstance(material_prices, list) else [],
                "labour_wage": labour_wage,
                "similar_product_prices": similar_prices if isinstance(similar_prices, list) else [],
                "sources": sources if isinstance(sources, list) else [],
                "warning": None,
                "research_status": "researched",
                "product_understanding": product_understanding if isinstance(product_understanding, dict) else fallback["product_understanding"],
                "estimated_material_cost": estimated_material_cost if isinstance(estimated_material_cost, dict) else fallback["estimated_material_cost"],
                "estimated_making_time": estimated_making_time if isinstance(estimated_making_time, dict) else fallback["estimated_making_time"],
                "search_queries": data.get("search_queries") if isinstance(data.get("search_queries"), list) else [],
            }
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                # Quota exhausted - silently fall back to local pricing without warning
                return fallback | {"warning": None}
            elif exc.response.status_code in {401, 403}:
                warning = (
                    "Gemini market research rejected the API credential. The estimate uses the "
                    "local deterministic pricing model."
                )
            else:
                warning = (
                    "Gemini market research is temporarily unavailable. The estimate uses the "
                    "local deterministic pricing model."
                )
            return fallback | {"warning": warning}
        except (ValueError, TypeError, KeyError, json.JSONDecodeError, httpx.HTTPError, RuntimeError):
            return fallback | {
                "warning": (
                    "Current market data could not be confirmed online. The estimate uses the local deterministic "
                    "pricing model and includes a conservative warning instead of guessing a market price."
                )
            }

    async def calculate_market_pricing(
        self,
        product_name: str,
        materials: List[Dict[str, Any]],
        making_days: float,
        location: str,
        description: str = "",
        image_data_url: str | None = None,
        raw_material_image_data_url: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> Dict[str, Any]:
        try:
            market_data = await self.research_market_data(
                product_name=product_name,
                materials=materials,
                location=location,
                description=description,
                image_data_url=image_data_url,
                raw_material_image_data_url=raw_material_image_data_url,
                latitude=latitude,
                longitude=longitude,
            )
        except Exception:
            market_data = self._local_fallback_market_data(
                product_name,
                materials,
                location,
            )

        if market_data.get("research_status") not in {"researched", "fallback"}:
            raise ValueError(market_data.get("warning") or "Current market research is unavailable")

        material_cost = 0.0
        for item in materials:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "")
            quantity = self._coerce_float(item.get("quantity"), 0.0)
            unit = _normalize_unit(str(item.get("unit") or "kg"))
            if not name or quantity <= 0:
                continue

            unit_factor = VALID_UNITS.get(unit, 1.0)
            material_price = None
            for source_item in market_data.get("material_prices", []):
                if isinstance(source_item, dict):
                    candidate_name = _normalize_material_name(str(source_item.get("name") or ""))
                    if candidate_name and (candidate_name in _normalize_material_name(name) or _normalize_material_name(name) in candidate_name):
                        price_per_unit = self._coerce_float(source_item.get("price_per_unit"), 0.0)
                        if price_per_unit > 0:
                            material_price = price_per_unit
                        break

            if material_price is None:
                raise ValueError(f"No researched material price was returned for '{name}'")
            material_cost += quantity * unit_factor * material_price

        labour_rate = self._coerce_float(market_data.get("labour_wage"), 0.0)
        if labour_rate <= 0:
            raise ValueError("No researched labour reference was returned")
        labour_cost = max(0.0, float(making_days) * labour_rate)
        overhead_cost = max(0.0, round((material_cost + labour_cost) * 0.15, 2))
        estimated_cost = round(material_cost + labour_cost + overhead_cost, 2)

        similar_prices = market_data.get("similar_product_prices") or []
        comparable_values: List[float] = []
        for item in similar_prices:
            if isinstance(item, dict):
                comparable_values.append(self._coerce_float(item.get("price"), 0.0))
            else:
                comparable_values.append(self._coerce_float(item, 0.0))
        if comparable_values:
            comparable_values = [value for value in comparable_values if value > 0]
        if comparable_values:
            market_low = min(comparable_values)
            market_average = sum(comparable_values) / len(comparable_values)
            market_high = max(comparable_values)
        else:
            market_low = estimated_cost
            market_average = estimated_cost * 1.1
            market_high = estimated_cost * 1.4

        minimum = max(float(estimated_cost), float(market_low))
        recommended = max(float(estimated_cost) * 1.05, float(market_average))
        maximum = max(float(recommended) * 1.15, float(market_high))

        warning = market_data.get("warning")
        if market_average < estimated_cost:
            warning = (
                "Market prices appear lower than your estimated making cost. Review your material cost, labour time, or target market before selling."
            )

        return {
            "product_name": product_name,
            "estimated_cost": round(estimated_cost, 2),
            "material_cost": round(material_cost, 2),
            "labour_cost": round(labour_cost, 2),
            "overhead_cost": round(overhead_cost, 2),
            "suggested_price_range": {
                "minimum": round(minimum, 2),
                "recommended": round(recommended, 2),
                "maximum": round(maximum, 2),
            },
            "market_reference": {
                "average": round(float(market_average), 2),
                "low": round(float(market_low), 2),
                "high": round(float(market_high), 2),
            },
            "sources": market_data.get("sources") or [],
            "market_sources": market_data.get("sources") or [],
            "warning": warning,
            "research_status": market_data.get("research_status"),
            "product_understanding": market_data.get("product_understanding") or {
                "product": product_name,
                "category": "Estimated craft product",
                "material": "Estimated material",
                "capacity": "Estimated",
                "use_case": "Estimated use",
                "search_keywords": [product_name],
            },
            "estimated_material_cost": round(material_cost, 2),
            "estimated_labour_cost": round(labour_cost, 2),
            "estimated_total_making_cost": round(estimated_cost, 2),
            "material_cost_estimate": market_data.get("estimated_material_cost") or {},
            "making_time_estimate": market_data.get("estimated_making_time") or {},
            "search_queries": market_data.get("search_queries") or [product_name],
            "similar_product_market_range": {"low": round(float(market_low), 2), "high": round(float(market_high), 2)},
            "recommended_price": round(recommended, 2),
        }


market_pricing_service = MarketPricingService()
